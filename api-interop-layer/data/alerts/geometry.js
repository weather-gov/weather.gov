import { simplify, union } from "@turf/turf";
import openDatabase from "../db.js";

const SIMPLIFY_TOLERANCE = 0.003;
const ZONE_CHUNK_SIZE = 5;

const wait = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

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
  const sql = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN (${zones.map(() => "?").join(",")})`;
  const result = await db.query(sql, zones);
  const [[{ shape }]] = result;
  return shape;
};

/**
 * Fetch the combined GeometryCollection for the given
 * list of counties from the database.
 * Respond with the nested shape object(s)
 */
const getCountiesShapeFromDb = async (db, counties) => {
  const same = counties.map((c) => `${c.slice(1)}`);

  const sql = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_counties
        WHERE countyFips IN (${same.map(() => "?").join(",")})`;
  const result = await db.query(sql, counties);
  const [[{ shape }]] = result;
  return shape;
};

/**
 * Helper function to determine which kind of
 * geographic data to fetch from the database
 */
const getZoneShapeFromDb = async (db, zones, kind="forecast") => {
  if(kind === "forecast"){
    return await getForecastZonesShapeFromDb(db, zones);
  } else if(kind === "county"){
    return await getCountiesShapeFromDb(db, zones);
  }
};

const getUnion = (firstShape, secondShape=null) => {
  if(secondShape){
    return union(firstShape, secondShape);
  } else if(firstShape.geometries.length > 1){
    return union(firstShape);
  }
  return firstShape;
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

  // Fetch the first shape and, if needed, perform a union
  const first = await getZoneShapeFromDb(db, zones.slice(0, 1), zoneType);
  if(!first){
    return null;
  }
  let geometry = getUnion(
    first
  );

  if(zones.length === 1){
    return geometry;
  }
  
  const remaining = zones.slice(1);
  for(let i = 0; i < remaining.length; i++){
    await wait(100);
    const start = i * ZONE_CHUNK_SIZE;
    const end = start + ZONE_CHUNK_SIZE;
    const chunk = remaining.slice(start, end);

    // Update the computed geometry
    const data = await getZoneShapeFromDb(db, zones, zoneType);
    if(!data){
      return null;
    }
    geometry = getUnion(
      data
    );
  }

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
      return simplify(shape, { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // if the alert has SAME codes, generate a geometry from SAME codes; same
  // process as above
  const counties = rawAlert.properties.geocode?.SAME;
  if (Array.isArray(counties) && counties.length > 0) {
    const shape = await fetchAndComputeZoneGeometries(db, counties, "county");
    if(shape){
      return simplify(shape, { tolerance: SIMPLIFY_TOLERANCE });
    }
  }

  // we cannot generate a geometry.
  return null;
};

export default { generateAlertGeometry };
