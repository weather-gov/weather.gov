import openDatabase from "../db.js";
import { createLogger } from "../../util/monitoring/index.js";
import { getRiskOverview } from "../risk-overview/index.js";
import { getAlertsForCountyFIPS } from "../alerts/index.js";
import dayjs from "../../util/day.js";

const logger = createLogger("county data");

export const getCountyData = async (fips) => {
  try {
    const db = await openDatabase();

    // Simplify county shapes as we get them. We'll use the same 0.003º
    // threshold that we use for alerts because that has worked pretty well for
    // us so far. It's not magic, it was just fiddling with it to get a small
    // enough number that significantly reduced the vertices.
    const county = await db
      .query(
        `
        SELECT st as state,
          countyname as county,
          primarywfo_id as primarywfo,
          timezone,
          ST_AsGeoJSON(ST_Simplify(shape,0.003)) AS shape,
          (SELECT name FROM weathergov_geo_states a WHERE a.state=b.st) as statename
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

    county.primarywfo = await db
      .query(
        `
      SELECT wfo
      FROM weathergov_geo_cwas
      WHERE id=$1
      `,
        [county.primarywfo],
      )
      .then(({ rows }) => (rows.length > 0 ? rows[0].wfo : null));

    const riskOverview = await getRiskOverview(fips);

    const alerts = await getAlertsForCountyFIPS(fips, {
      timezone: county.timezone,
    });
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

    return { county, riskOverview, alerts, alertDays };
  } catch (e) {
    logger.error(`Error fetching county data for FIPS ${fips}`);
    logger.error(e);
    return { error: `Error fetching county data for FIPS ${fips}` };
  }
};
