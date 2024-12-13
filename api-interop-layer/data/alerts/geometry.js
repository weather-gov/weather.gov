import { simplify, union } from "@turf/turf";

const SIMPLIFY_TOLERANCE = 0.003;
export const ZONE_CHUNK_SIZE = 5;

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
  const result = await db.query(sql, same);
  const [[{ shape }]] = result;
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
 * Retrieves a list of geometries from the given shape object.
 * This object can be a FeatureCollection, GeometryCollection,
 * or similar.
 * The important thing to know is that the object will have a single
 * geometry (at the `geometry` key) or many geometries
 * (at the `geometries` key).
 * This function returns an array regardless of the number of
 * found geometries.
 */
const getGeometriesFromShape = (shape) => {
  const result = [];
  if(shape.geometry){
    result.push(shape.geometry);
    return result;
    // eslint-disable-next-line no-else-return
  } else if(shape.geometries){
    return shape.geometries;
  }
  return result;
};

/**
 * Turf's union function can take a single GeometryCollection
 * object and compute the union of all of its constituent shapes.
 * If this function is only passed a single geometry object, it
 * will perform that so-called unary union.
 */
const getUnion = (firstShape, secondShape=null) => {
  if(secondShape){
    const firstGeos = getGeometriesFromShape(firstShape);
    const secondGeos = getGeometriesFromShape(secondShape);
    const combined = {
      type: "GeometryCollection",
      geometries: firstGeos.concat(secondGeos)
    };
    return union(combined);
  } if(firstShape.geometries?.length > 1){
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
  
  let geometry = null;
  
  let chunkCount = 0;
  let start = chunkCount * ZONE_CHUNK_SIZE;
  let end = start + ZONE_CHUNK_SIZE;
  let chunk = zones.slice(start, end);
  while(chunk && chunk.length){
    // Update the computed geometry
    // eslint-disable-next-line no-await-in-loop
    const data = await getZoneShapeFromDb(db, chunk, zoneType);

    if(data && geometry){
      geometry = getUnion(
        geometry,
        data
      );
    } else if (data) {
      geometry = getUnion(data);
    } 

    chunkCount += 1;
    start = chunkCount * ZONE_CHUNK_SIZE;
    end = start + ZONE_CHUNK_SIZE;
    chunk = zones.slice(start, end);
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
