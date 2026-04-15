import openDatabase from "../db.js";
import { logger } from "../../util/monitoring/index.js";
import { getRiskOverview } from "../risk-overview/index.js";
import { getAlertsForCountyFIPS } from "../alerts/index.js";
import dayjs from "../../util/day.js";
import {
  SIMPLIFICATION_METERS,
  SPATIAL_PROJECTION,
} from "../../util/constants.js";
import getWeatherStory from "../weatherstory.js";
import getBriefing from "../briefing.js";

const countyDataLogger = logger.child({ subsystem: "county data" });

/**
 * Given an array of WFO codes, fetch each corresponding
 * briefing from the API.
 * Return a single array of all the briefings.
 */
const getBriefings = async (wfos) => {
  if (!wfos.length) {
    return [];
  }

  return Promise.all(
    wfos.map((wfo) => {
      return getBriefing(wfo).then((briefingData) => {
        // Always add the officeId at the top level. This
        // is so we know on the Django side which briefings
        // are null or errored.
        briefingData.officeId = wfo;
        return briefingData;
      });
    }),
  );
};

/**
 * Given an array of WFO codes, fetch each corresponding
 * weather story endpoint in the API.
 * Return a single flattened array of all the stories.
 * Note that for county views, we only care about the
 * first weather story for each WFO.
 */
const getWeatherStories = async (wfos) => {
  if (!wfos.length) {
    return [];
  }

  return Promise.all(
    wfos.map((wfo) => {
      return getWeatherStory(wfo).then((storydata) => {
        if (storydata.error) {
          storydata.officeId = wfo;
          return [storydata];
        } else if (storydata.length > 0) {
          // For now, we only care about the first
          // weather story from each WFO
          return [storydata[0]];
        } else {
          return [];
        }
      });
    }),
  ).then((resultList) => resultList.flat());
};

export const getCountyData = async (fips) => {
  try {
    const db = await openDatabase();

    // Simplify county shapes as we get them.
    const county = await db
      .query(
        `
        SELECT st as state,
          countyname as county,
          primarywfo_id as primarywfo,
          timezone,
          ST_AsGeoJSON(
            ST_TRANSFORM(
              ST_SIMPLIFY(
                ST_TRANSFORM(
                  shape,
                  ${SPATIAL_PROJECTION.WEB_MERCATOR}
                ),
                ${SIMPLIFICATION_METERS}
              ),
              ${SPATIAL_PROJECTION.WGS84}
            )
          ) AS shape,
          (SELECT name FROM weathergov_geo_states a WHERE a.state=b.st) as statename,
          ARRAY(SELECT cwas.wfo as wfo  FROM weathergov_geo_cwas cwas
                       JOIN weathergov_geo_counties_cwas jt ON cwas.id=jt.weathercountywarningareas_id
                       JOIN weathergov_geo_counties as counties ON jt.weathercounties_id=counties.id
                       WHERE counties.countyfips=$1::text) as wfos
        FROM weathergov_geo_counties b
        WHERE countyfips=$1::text`,
        [fips],
      )
      .then(({ rows }) => {
        if (rows.length > 0) {
          return {
            ...rows[0],
            countyfips: fips,
            statefips: fips.slice(0, 2),
            shape: JSON.parse(rows[0].shape),
          };
        }
      });

    if (!county) {
      return {
        status: 404,
        error: `No county found for FIPS ${fips}`,
      };
    }

    const primarywfoPromise = db
      .query(
        `SELECT wfo
         FROM weathergov_geo_cwas
        WHERE id=$1
        `,
        [county.primarywfo],
      )
      .then(({ rows }) => (rows.length > 0 ? rows[0].wfo : null));

    const [primarywfo, riskOverview, alerts, weatherstories, briefings] =
      await Promise.all([
        primarywfoPromise,
        getRiskOverview(fips),
        getAlertsForCountyFIPS(fips, {
          timezone: county.timezone,
        }),
        getWeatherStories(county.wfos),
        getBriefings(county.wfos),
      ]);

    county.primarywfo = primarywfo;

    alerts.items.forEach((alert) => {
      alert.alertDays = [];
    });

    const today = dayjs().tz(county.timezone).startOf("day");

    const alertDays = [...Array(5)].map((_, day) => {
      const start = today.add(day, "day");
      const end = start.add(1, "day");

      return {
        start,
        end,
        day: start.format("dddd"),
        alerts: alerts.items
          .map((alert, index) => {
            // If the alert onset is before the end of today...
            if (alert.onset.isBefore(end)) {
              // and the alert ends after the start of today (or never, for
              // indefinite alerts)
              if (alert.finish === null || alert.finish.isSameOrAfter(start)) {
                // Then we keep this one
                alert.alertDays.push(day + 1);
                return index;
              }
            }
            return false;
          })
          // Now get rid of any indices that are false. This leaves us with just
          // the indices of the alerts that are active during the given day.
          .filter((v) => v !== false),
      };
    });

    return {
      county,
      riskOverview,
      alerts,
      alertDays,
      weatherstories,
      briefings,
    };
  } catch (e) {
    countyDataLogger.error({ err: e, fips }, "error fetching county data");
    return { error: `Error fetching county data for FIPS ${fips}` };
  }
};
