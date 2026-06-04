import { SPATIAL_PROJECTION } from "../util/constants.js";
import { logger } from "../util/monitoring/index.js";
import { requestJSONWithHeaders } from "../util/request.js";
import { parseTTLFromHeaders } from "../util/caching.js";
import connectionPool from "./connectionPool.js";
import openDatabase from "./db.js";
import { saveToRedis, getFromRedis } from "../redis.js";
import astronomicalData from "./astronomical.js";

const pointLogger = logger.child({ subsystem: "point" });

export const DEFAULT_POINTS_CACHE_TTL = 120;
const POSTGRES_UNDEFINED_TABLE = "42P01";

/**
 * Determine whether or not to use internal wfo gridpoint
 * lookups based on the presence of an environment variable.
 */
const USE_INTERNAL_LOOKUP = process.env.INTERNAL_GRIDPOINT_LOOKUP === "true";

export const getClosestPlace = async (latitude, longitude) => {
  const pointGeom = `ST_SetSRID(ST_Point(${longitude}, ${latitude}), ${SPATIAL_PROJECTION.WGS84})`;

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

    const ttl = parseTTLFromHeaders(gridHeaders, DEFAULT_POINTS_CACHE_TTL);
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

  let grid = false;
  if (USE_INTERNAL_LOOKUP) {
    grid = await getInternalGridData(latitude, longitude);
  }

  // We only fall back to the NWS API if the internal check failed due to code errors
  if (!grid || grid.error) {
    if (USE_INTERNAL_LOOKUP) {
      pointLogger.warn(
        { grid, lat, lon },
        `Internal gridpoints lookup failed. Querying API`,
      );
    }
    const pointsUrl = `/points/${latitude},${longitude}`;
    const gridData =
      (await getFromRedis(pointsUrl)) || (await createPointsPromise(pointsUrl));

    if (gridData.error) {
      grid = gridData;
    } else {
      point.astronomicalData = gridData.properties?.astronomicalData;
      grid = {
        wfo: gridData.properties?.gridId,
        x: gridData.properties?.gridX,
        y: gridData.properties?.gridY,
        geometry: gridData.geometry,
        source: "nws-api",
      };
    }
  } else if (grid?.outOfBounds) {
    grid = {
      error: true,
      outOfBounds: true,
      status: 404,
    };
  }

  const placePromise = getClosestPlace(latitude, longitude);

  // Check if the requested point is inside a marine zone.
  const pointGeom = `ST_SetSRID(ST_Point(${longitude}, ${latitude}), ${SPATIAL_PROJECTION.WGS84})`;
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

  const [place, isMarine] = await Promise.all([placePromise, isMarinePromise]);

  if (USE_INTERNAL_LOOKUP && place) {
    // because we are skipping the points API call, astronomical data is not
    // available. in that case, let's add it back in via suncalc.
    point.astronomicalData = astronomicalData(
      place.timezone,
      latitude,
      longitude,
    );
  }

  if (grid.wfo === null) {
    // If we did not get an error but the WFO is empty, then it's within our
    // responsibility but we don't have the data in the API.
    grid.error = true;
    grid.notSupported = true;
  }

  return { point, place, grid, isMarine: isMarine.rows.length > 0 };
};

const getInternalGridData = async (latitude, longitude) => {
  try {
    const db = await openDatabase();
    const pointGeom = `ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)`;

    // THRESHOLD: 3500 meters. This covers the ~2 mile max distance in Alaska + truncation error.
    const MAX_DISTANCE_METERS = 3500;

    const query = `
      SELECT UPPER(cwa) as wfo, x, y, ST_AsGeoJSON(point) as geometry
      FROM weathergov_geo_gridpoints
      WHERE ST_DWithin(point::geography, ${pointGeom}::geography, ${MAX_DISTANCE_METERS})
      ORDER BY point::geography <-> ${pointGeom}::geography
      LIMIT 1
    `;

    const result = await db.query(query);

    if (result.rows?.length > 0) {
      const row = result.rows[0];
      return {
        wfo: row.wfo,
        x: row.x,
        y: row.y,
        // We parse here because PostGIS returns a string; NWS API returns an object.
        geometry: JSON.parse(row.geometry),
        source: "internal",
      };
    }

    // Explicitly out of bounds for the internal dataset
    return { error: true, outOfBounds: true };
  } catch (err) {
    if (err.code === POSTGRES_UNDEFINED_TABLE) {
      pointLogger.warn(
        "WeatherGridPoints table not found, falling back to NWS API",
      );
    } else {
      pointLogger.error(
        { err },
        "Unexpected error querying internal grid points",
      );
    }
    return { error: true }; // Fall back to /points on any DB error
  }
};
