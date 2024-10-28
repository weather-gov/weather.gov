import { simplify, union } from "@turf/turf";

const SIMPLIFY_TOLERANCE = 0.003;

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

export const generateAlertGeometry = async (db, rawAlert) => {
  // if the alert already has geometry, nothing to do
  if (rawAlert.geometry) {
    return unwindGeometryCollection(rawAlert.geometry);
  }

  // if we have affected zones, generate a geometry from zones. For this, we're
  // only interested in getting a single GeometryCollection. We'll manipulate it
  // further using a local library.
  const zones = rawAlert.properties.affectedZones;
  if (Array.isArray(zones) && zones.length > 0) {
    const sql = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN (${zones.map(() => "?").join(",")})`;
    const [{ shape }] = await db.query(sql, zones);

    if (shape) {
      if (shape.geometries.length > 1) {
        // If there are multiple geometries in the collection, union them
        // together and then simplify the result.
        return simplify(union(shape), { tolerance: SIMPLIFY_TOLERANCE });
      }
      // If there's only one geometry, just simplify it and be done.
      return simplify(shape, { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // if the alert has SAME codes, generate a geometry from SAME codes; same
  // process as above
  const counties = rawAlert.properties.geocode?.SAME;
  if (Array.isArray(counties) && counties.length > 0) {
    const same = counties.map((c) => `${c.slice(1)}`);

    const sql = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_counties
        WHERE countyFips IN (${same.map(() => "?").join(",")})`;
    const [{ shape }] = await db.query(sql, same);

    if (shape) {
      if (shape.geometries.length > 1) {
        return simplify(union(shape), { tolerance: SIMPLIFY_TOLERANCE });
      }
      return simplify(shape, { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // we cannot generate a geometry.
  return null;
};

export default { generateAlertGeometry };
