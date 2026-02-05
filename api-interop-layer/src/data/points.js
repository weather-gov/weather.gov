import openDatabase from "./db.js";
import { fetchAPIJson } from "../util/fetch.js";
import { logger } from "../util/monitoring/index.js";
import { SPATIAL_PROJECTION } from "../util/constants.js";

const pointLogger = logger.child({ subsystem: "point" });

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
       ORDER BY ST_DISTANCE(point,${pointGeom})
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

export const getPointData = async (latitude, longitude) => {
  pointLogger.trace({ latitude, longitude }, "place");
  const point = { latitude, longitude };

  const pointsPromise = fetchAPIJson(`/points/${latitude},${longitude}`).then(
    (data) => {
      if (data.error) {
        return data;
      }

      return {
        wfo: data.properties.gridId,
        x: data.properties.gridX,
        y: data.properties.gridY,
        geometry: data.geometry,
      };
    },
  );

  const db = await openDatabase();

  const pointGeom = `ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})',${SPATIAL_PROJECTION.WGS84})`;

  const placePromise = await getClosestPlace(latitude, longitude);

  // Check if the requested point is inside a marine zone.
  const isMarinePromise = db.query(
    `SELECT id
    FROM weathergov_geo_zones
    WHERE
      type LIKE 'marine:%'
      AND
      ST_Intersects(shape,${pointGeom})
    LIMIT 1`,
  );

  const [grid, place, isMarine] = await Promise.all([
    pointsPromise,
    placePromise,
    isMarinePromise,
  ]);

  if (grid.status === 404) {
    // If we get a 404 from the API, then the requested point is not within the
    // NWS's area of resopnsibility.
    grid.error = true;
    grid.outOfBounds = true;
  } else if (grid.wfo === null) {
    // If we did not get an error but the WFO is empty, then it's within our
    // responsibility but we don't have the data in the API.
    grid.error = true;
    grid.notSupported = true;
  }

  return { point, place, grid, isMarine: isMarine.rows.length > 0 };
};
