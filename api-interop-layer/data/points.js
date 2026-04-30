import { SPATIAL_PROJECTION } from "../util/constants.js";
import { logger } from "../util/monitoring/index.js";
import { requestJSONWithHeaders } from "../util/request.js";
import { parseTTLFromHeaders } from "../util/caching.js";
import connectionPool from "./connectionPool.js";
import openDatabase from "./db.js";
import { saveToRedis, getFromRedis } from "../redis.js";

const pointLogger = logger.child({ subsystem: "point" });

export const DEFAULT_POINTS_CACHE_TTL = 120;

export const getClosestPlace = async (latitude, longitude) => {
  const pointGeom = `ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})',${SPATIAL_PROJECTION.WGS84})`;

  const db = await openDatabase();
  const place = await db
    // In this distance query, we need to set the spatial reference system of
    // the point we're querying for. All of our spatial tables are SRS 4326,
    // which corresponds to WGS84.
    .query(
      `SELECT
       name,timezone
       FROM weathergov_geo_places
       ORDER BY point <-> ${pointGeom}
       LIMIT 1`,
    )
    .then((result) => {
      if (Array.isArray(result.rows) && result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    });

  if (place == null) {
    return null;
  }

  const countyState = await db
    .query(
      `
      SELECT
        c.countyname,c.countyfips,
        s.state,s.name,s.fips
      FROM weathergov_geo_counties c
      INNER JOIN weathergov_geo_states s
      ON (s.id=c.state_id)
      WHERE
        ST_Contains(c.shape, ${pointGeom})
      LIMIT 1`,
    )
    .then((result) => {
      if (Array.isArray(result.rows) && result.rows.length > 0) {
        const {
          state,
          name: statename,
          countyname: county,
          countyfips,
          fips: statefips,
        } = result.rows[0];
        return { state, statename, county, countyfips, statefips };
      }
      return null;
    });

  // Add county and state information, if available.
  if (countyState) {
    Object.assign(place, countyState);
  }

  if (place.name && place.state) {
    place.fullName = `${place.name}, ${place.state}`;
  }

  return place;
};

const createPointsPromise = async (pointsUrl) => {
  try {
    const [gridData, gridHeaders] = await requestJSONWithHeaders(
      connectionPool,
      pointsUrl,
    );

    let ttl = parseTTLFromHeaders(gridHeaders);
    if (!ttl) {
      ttl = DEFAULT_POINTS_CACHE_TTL;
    }
    await saveToRedis(pointsUrl, gridData, ttl);

    return gridData;
  } catch (err) {
    // Handle the 404 "Out of Bounds" case specifically
    if (err.cause?.statusCode === 404 || err.statusCode === 404) {
      return {
        error: true,
        outOfBounds: true,
        status: 404,
      };
    }

    // Throw errors with statusCode 403 or 504, so they can be handled
    // immediately in route handlers
    if (err.cause?.statusCode === 403 || err.cause?.statusCode === 504) {
      throw err;
    }

    // General error fallback
    return { error: true };
  }
};

export const getPointData = async (lat, lon) => {
  // Truncate to 3 decimal places
  const [latitude, longitude] = [
    Number.parseFloat(lat.toFixed(3)),
    Number.parseFloat(lon.toFixed(3)),
  ];

  const point = { latitude, longitude };
  pointLogger.trace(point, "place");

  const pointsUrl = `/points/${latitude},${longitude}`;
  const foundInCache = await getFromRedis(pointsUrl);

  // if we have a cache hit then wrap the hit into a promise, otherwise create a
  // promise to call the actual endpoint. in either case we extract the data
  // (taking special care to separate out the astronomical data)
  const initialPointsPromise = foundInCache
    ? new Promise((resolve) => resolve(foundInCache))
    : createPointsPromise(pointsUrl);
  const pointsPromise = initialPointsPromise.then((gridData) => {
    if (gridData.error) {
      return gridData;
    }
    point.astronomicalData = gridData.properties?.astronomicalData;
    return {
      wfo: gridData.properties?.gridId,
      x: gridData.properties?.gridX,
      y: gridData.properties?.gridY,
      geometry: gridData.geometry,
    };
  });

  const placePromise = getClosestPlace(latitude, longitude);

  // Check if the requested point is inside a marine zone.
  const pointGeom = `ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})',${SPATIAL_PROJECTION.WGS84})`;
  const isMarinePromise = openDatabase().then((db) =>
    db.query(
      `SELECT id
    FROM weathergov_geo_zones
    WHERE
      (type='marine:coastal' OR type='marine:offshore')
      AND
      ST_Intersects(shape,${pointGeom})
    LIMIT 1`,
    ),
  );

  const [grid, place, isMarine] = await Promise.all([
    pointsPromise,
    placePromise,
    isMarinePromise,
  ]);

  if (grid.wfo === null) {
    // If we did not get an error but the WFO is empty, then it's within our
    // responsibility but we don't have the data in the API.
    grid.error = true;
    grid.notSupported = true;
  }

  return { point, place, grid, isMarine: isMarine.rows.length > 0 };
};
