import { feature, featureCollection, simplify, union } from "@turf/turf";

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
      SELECT
        shape
      FROM weathergov_geo_zones
      WHERE id IN (${zones.map(() => "?").join(",")})`;

    const shapes = await db.query(sql, zones);

    if (Array.isArray(shapes) && shapes.length > 0) {
      const geometries = shapes.flatMap(({ shape }) => shape.geometries.flat());

      if (geometries.length === 1) {
        return simplify(geometries[0], { tolerance: SIMPLIFY_TOLERANCE });
      }
      const collection = featureCollection(geometries.map((g) => feature(g)));

      return simplify(union(collection), { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // if the alert has SAME codes, generate a geometry from SAME codes; same
  // process as above
  const counties = rawAlert.properties.geocode?.SAME;
  if (Array.isArray(counties) && counties.length > 0) {
    const fips = counties.map((c) => `${c.slice(1)}`);

    const sql = `
      SELECT 
        shape
      FROM weathergov_geo_counties
      WHERE countyFips IN (${fips.map(() => "?").join(",")})`;
    const shapes = await db.query(sql, fips);

    if (Array.isArray(shapes) && shapes.length > 0) {
      const geometries = shapes.flatMap(({ shape }) => shape);

      if (geometries.length === 1) {
        return simplify(geometries[0], { tolerance: SIMPLIFY_TOLERANCE });
      }
      const collection = featureCollection(geometries.map((g) => feature(g)));

      return simplify(union(collection), { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // we cannot generate a geometry.
  return null;
};

export default { generateAlertGeometry };
