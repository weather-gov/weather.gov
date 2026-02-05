import { parentPort } from "node:worker_threads";

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

export const generateAlertGeometry = async (
  db,
  rawAlert,
  { parent = parentPort } = {},
) => {
  // if the alert already has geometry, nothing to do
  if (rawAlert.geometry) {
    return { shape: unwindGeometryCollection(rawAlert.geometry) };
  }

  // If we have affected zones, try to use those first. Zones are potentially
  // more precise than counties. Remove any zones whose type is "county" because
  // we don't store counties as zones.
  const zones = (rawAlert.properties.affectedZones ?? []).filter(
    (zoneId) => !/\/county\//.test(zoneId),
  );

  if (Array.isArray(zones) && zones.length > 0) {
    const zoneQueryString = zones.map((z) => `'${z}'`).join(",");

    // Check how many of these zones we actually know about. The number of zones
    // we know about should always exactly match the number of zones. If they do
    // not, then there is a major error: either we don't have a complete list of
    // zones in our local databaes, our local database is outdated, or an
    // upstream data provider is sending invalid data. All three cases are a big
    // honkin' deal.
    const zoneCount = await db
      .query(
        `SELECT COUNT(id) as count FROM weathergov_geo_zones WHERE id IN(${zoneQueryString})`,
      )
      // Pluck out just the count, add numberize it.
      .then((result) => +result?.rows?.[0]?.count);

    // If we are missing *ANY* zones, fallback to counties. We cannot make a
    // proper representation from zones if any are missing. Also log this
    // because it is a significant error and should never happen.
    if (zoneCount !== zones.length) {
      parent?.postMessage({
        action: "log",
        level: "error",
        message: `No matching zones found for zones with IDs: ${zones.join(", ")}`,
      });
    } else {
      // Finally, if we got here, then all of the zones are either forecast,
      // marine, or fire zones; and they are all in our database. Huzzah! Build
      // a query to fetch the union of their shapes.
      return {
        sql: `(
        SELECT
          ST_Union(shape) AS shape
        FROM (
          SELECT shape
          FROM weathergov_geo_zones
          WHERE id IN (${zoneQueryString})
        ) AS zones
      )`,
      };
    }
  }

  // If we couldn't use zones for any reason – such as there weren't any zones,
  // they are county zones, or one or more zones is missing from our databgase,
  // then we fallback to using SAME codes. A county SAME code is a FIPS
  // state+county code with a leading zero.
  const counties = rawAlert.properties.geocode?.SAME;
  if (Array.isArray(counties) && counties.length > 0) {
    return {
      sql: `(
        SELECT
          ST_Union(shape) AS shape
        FROM (
          SELECT shape
          FROM weathergov_geo_counties
          WHERE countyfips IN (${counties.map((c) => `'${c.slice(1)}'`).join(",")})
        ) AS counties
      )`,
    };
  }

  // we cannot generate a geometry
  return null;
};

export default { generateAlertGeometry };
