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

  // if we have affected zones, generate a geometry from zones
  const zones = rawAlert.properties.affectedZones;
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
        WHERE id IN (${zones.map(() => "?").join(",")})`;
    const [{ shape }] = await db.query(sql, zones);
    if (shape) {
      return unwindGeometryCollection(shape);
    }
  }

  // if the alert has SAME codes, generate a geometry from SAME codes
  const counties = rawAlert.properties.geocode?.SAME;
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
      return unwindGeometryCollection(shape);
    }
  }

  // we cannot generate a geometry.
  return null;
};

export default { generateAlertGeometry };
