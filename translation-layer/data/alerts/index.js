import dayjs from "../../util/day.js";
import paragraphSquash from "../../util/paragraphSquash.js";
import { openDatabase } from "../db.js";
import alertKinds from "./kinds.js";
import {
  parseDescription,
  parseDuration,
  parseLocations,
} from "./parse/index.js";
import sort from "./sort.js";

const cachedAlerts = [];

const unwindGeometryCollection = (geojson, parentIsCollection = false) => {
  if (geojson.type === "GeometryCollection") {
    const geometries = geojson.geometries.flatMap((geometry) =>
      unwindGeometryCollection(geometry, true),
    );
    if (parentIsCollection) {
      return geometries;
    }

    geojson.geometries = geometries;
    return geojson;
  }

  return geojson;
};

const updateAlerts = async () => {
  const rawAlerts = await fetch(
    "https://api.weather.gov/alerts/active?status=actual",
  )
    .then((r) => r.json())
    .then(({ features }) => features)
    .then((features) =>
      features.map((feature) => {
        Object.keys(feature.properties).forEach((key) => {
          const value = feature.properties[key];
          const date = dayjs(value);

          // The day.js parser looks for ANY ISO-8601 valid text in the string
          // and attempts to convert it. As a result, some harmless text ends
          // up getting picked up as valid dates. For example:
          //
          // PLEASE CALL 5-1-1
          //
          // day.js parses that to May 1, 2001. That is obviously not correct.
          // But we know all of our timestamps are *only* ISO8601 strings with
          // full date information, so we can check that the string starts with
          // a YYYY-MM-DD format as well as parsing to a valid day.js object.
          if (date.isValid() && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            feature.properties[key] = date;
          }
        });

        return feature;
      }),
    );

  const db = await openDatabase();

  const alerts = [];

  for await (const rawAlert of rawAlerts) {
    const alert = {
      metadata: alertKinds.get(rawAlert.properties.event.toLowerCase()),
    };
    alerts.push(alert);

    alert.id = alerts.length;
    if (rawAlert.properties.id.startsWith("urn:oid:2.49.0.1.840")) {
      alert.id = rawAlert.properties.id.split(".").slice(-3).join("_");
    }

    alert.event = rawAlert.properties.event;

    const { locations, description } = parseLocations(
      rawAlert.properties.description,
    );

    alert.sender = rawAlert.properties.senderName;
    alert.locations = locations;
    alert.description = parseDescription(description);
    alert.instruction = paragraphSquash(rawAlert.properties.instruction);

    alert.area = paragraphSquash(rawAlert.properties.areaDesc)
      ?.split(";")
      .map((line) => line.trim());

    alert.sent = rawAlert.properties.sent;
    alert.effective = rawAlert.properties.effective;
    alert.onset = rawAlert.properties.onset;
    alert.expires = rawAlert.properties.expires;
    alert.ends = rawAlert.properties.ends;

    alert.finish = alert.ends;

    if (!alert.finish) {
      alert.finish = alert.expires;
    }
    if (!alert.finish) {
      alert.finish = null;
    }

    alert.geometry = rawAlert.geometry;

    if (alert.geometry === null) {
      const zones = rawAlert.properties.affectedZones;
      const counties = rawAlert.properties.geocode?.SAME;

      if (Array.isArray(zones) && zones.length > 0) {
        const sql = `
          SELECT ST_ASGEOJSON(
            ST_SIMPLIFY(
              ST_SRID(
                ST_COLLECT(shape),
                0
              ),
              0.003
            )
          )
            AS shape
            FROM weathergov_geo_zones
            WHERE id IN (${zones.map((z) => `'${z}'`).join(",")})`;
        const [{ shape }] = await db.query(sql);

        if (shape) {
          alert.geometry = shape;
        }
      }

      if (
        alert.geometry === null &&
        Array.isArray(counties) &&
        counties.length > 0
      ) {
        const sql = `
          SELECT ST_ASGEOJSON(
            ST_SIMPLIFY(
              ST_SRID(
                ST_COLLECT(shape),
                0
              ),
              0.003
            )
          )
            AS shape
            FROM weathergov_geo_counties
            WHERE countyFips IN (${counties.map((c) => `'${c.slice(1)}'`).join(",")})`;
        const [{ shape }] = await db.query(sql);

        if (shape) {
          alert.geometry = shape;
        }
      }

      if (alert.geometry) {
        alert.geometry = unwindGeometryCollection(alert.geometry);
      }
    }
  }

  alerts.sort(sort);

  cachedAlerts.length = 0;
  cachedAlerts.push(...alerts);

  await db.end();
};

updateAlerts();

// Update the alerts every 30 seconds. They are cached upstream for about a
// minute, so there's no need to try much more often than this.
setInterval(updateAlerts, 30_000);

export default async ({ grid, place: { timezone } }) => {
  const geometry = grid.geometry;
  const location = `ST_GEOMFROMGEOJSON('${JSON.stringify(geometry)}')`;
  const db = await openDatabase();

  const alerts = [];
  for await (const alert of cachedAlerts) {
    if (alert.geometry) {
      const sql = `
      SELECT ST_INTERSECTS(
        ${location},
        ST_GEOMFROMGEOJSON('${JSON.stringify(alert.geometry)}')
      ) as yes`;
      const [{ yes }] = await db.query(sql);

      if (yes > 0) {
        alert.duration = parseDuration(alert, timezone);
        alert.timing = {
          start: alert.onset.tz(timezone).format("dddd MM/DD h:mm A __"),
          end: alert.finish?.tz(timezone).format("dddd MM/DD h:mm A __"),
        };
        alerts.push(alert);
      }
    }
  }
  const highest = alerts
    .map(({ metadata: { level } }) => level)
    .sort((a, b) => {
      const priorityA = a.priority;
      const priorityB = b.priority;

      return priorityB - priorityA;
    })
    .pop();

  await db.end();
  return { items: alerts, highestLevel: highest?.text };
};
