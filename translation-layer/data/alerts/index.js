import { openDatabase } from "../db.js";

const cachedAlerts = [];

const updateAlerts = async () => {
  const alerts = await fetch(
    "https://api.weather.gov/alerts/active?status=actual",
  )
    .then((r) => r.json())
    .then(({ features }) => features);

  const db = await openDatabase();

  for await (const alert of alerts) {
    if (alert.geometry === null) {
      const zones = alert.properties.affectedZones;
      const counties = alert.properties.geocode?.SAME;

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

          // Like eslint, I also dislike `continue`. However, it's really a
          // better option here than a convoluted series of ifs and elses.
          continue; // eslint-disable-line no-continue
        }
      }

      if (Array.isArray(counties) && counties.length > 0) {
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
          // Samesies.
          continue; // eslint-disable-line no-continue
        }
      }

      // We shouldn't get here. This means we found an alert that does not have
      // a geometry, either provided by the API or built from zones or counties.
      // For now, this happens with most marine alerts, but in the future, we
      // probably want to log these alerts because they are slipping through the
      // cracks.
      alert.geometry = false;
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

  await db.end();
  return alerts;
};
