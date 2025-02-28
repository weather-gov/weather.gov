import { simplify, union } from "@turf/turf";

export const SIMPLIFY_TOLERANCE = 0.003;

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

/**
 * Fetch the combined GeometryCollection for the given
 * forecast zones from the database.
 * Respond with the nested shape object(s)
 */
const getForecastZonesShapeFromDb = async (db, zones) => {
  // The PG library templates query params as "$1 $2 ... $N"
  // so we need for format those ahead of time using indices
  // of the incoming zones
  const zoneIdPart = zones.map((_, idx) => `$${idx+1}`).join(",");
  const sql = `
    SELECT ST_ASGEOJSON(
      ST_SIMPLIFY(ST_MemUnion(f.shape), ${SIMPLIFY_TOLERANCE})) as shape
    FROM (SELECT
      (ST_DUMP(shape)).geom as shape
      FROM weathergov_geo_zones WHERE id IN (${zoneIdPart})) as f;`;
  const result = await db.query(sql, zones);
  const [{ shape }] = result.rows;
  
  return shape;
};

/**
 * Fetch the combined GeometryCollection for the given
 * list of counties from the database.
 * Respond with the nested shape object(s)
 */
const getCountiesShapeFromDb = async (db, counties) => {
  const same = counties.map((c) => `${c.slice(1)}`);
  // The PG library templates query params as "$1 $2 ... $N"
  // so we need for format those ahead of time using indices
  // of the incoming counties
  const countyIdPart = counties.map((_, idx) => `$${idx+1}`).join(",");
  const sql = `
    SELECT ST_ASGEOJSON(
      ST_SIMPLIFY(ST_MemUnion(f.shape), ${SIMPLIFY_TOLERANCE})) as shape
    FROM (SELECT
      (ST_DUMP(shape)).geom as shape
      FROM weathergov_geo_counties
      WHERE countyFips IN (${countyIdPart})) as f;`;
  const result = await db.query(sql, same);
  const [{ shape }] = result.rows;
  return shape;
};

/**
 * Helper function to determine which kind of
 * geographic data to fetch from the database
 */
const getZoneShapeFromDb = async (db, zones, kind="forecast") => {
  if(kind === "forecast"){
    return getForecastZonesShapeFromDb(db, zones);
  } if(kind === "county"){
    return getCountiesShapeFromDb(db, zones);
  }

  return null;
};

/**
 * Here a 'zone' can refer to either a forecast zone or
 * a county fips id. Either one will produce a geometry set
 * that is stored in the database.
 */
const fetchAndComputeZoneGeometries = async (db, zones, zoneType="forecast") => {
  if(!["forecast", "county"].includes(zoneType)){
    throw new Error(`Invalid geometry zone type: ${zoneType}`);
  }
  const geometry = await getZoneShapeFromDb(db, zones, zoneType);
  return geometry;
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
    const shape = await fetchAndComputeZoneGeometries(db, zones, "forecast");

    if(shape){
      return shape;
    }
  }

  // if the alert has SAME codes, generate a geometry from SAME codes; same
  // process as above
  const counties = rawAlert.properties.geocode?.SAME;
  if (Array.isArray(counties) && counties.length > 0) {
    const shape = await fetchAndComputeZoneGeometries(db, counties, "county");
    if(shape){
      return shape;
    }
  }

  // we cannot generate a geometry
  return null;
};

export default { generateAlertGeometry };
