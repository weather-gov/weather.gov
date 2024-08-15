import { openDatabase } from "../db.js";
import alertKinds from "./kinds.js";

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
    .then(({ features }) => features);

  const db = await openDatabase();

  const alerts = [];

  for await (const rawAlert of rawAlerts) {
    const alert = {
      metadata: alertKinds.get(rawAlert.properties.event.toLowerCase()),
      _raw: rawAlert,
    };
    alerts.push(alert);

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
      } else if (Array.isArray(counties) && counties.length > 0) {
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
      } else {
        // We shouldn't get here. This means we found an alert that does not have
        // a geometry, either provided by the API or built from zones or counties.
        // For now, this happens with most marine alerts, but in the future, we
        // probably want to log these alerts because they are slipping through the
        // cracks.
        alert.geometry = false;
      }

      if (alert.geometry) {
        alert.geometry = unwindGeometryCollection(alert.geometry);
      }
    }
  }

  cachedAlerts.length = 0;
  cachedAlerts.push(...alerts);

  await db.end();
};

updateAlerts();

// Update the alerts every 30 seconds. They are cached upstream for about a
// minute, so there's no need to try much more often than this.
setInterval(updateAlerts, 30_000);

export default async ({ grid }) => {
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
  return { items: alerts, highestLevel: highest.text };
};
