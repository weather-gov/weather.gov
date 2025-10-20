import openDatabase from "./db.js";
import { fetchAPIJson } from "../util/fetch.js";
import { createLogger } from "../util/monitoring/index.js";

const logger = createLogger("point");

export default async (latitude, longitude) => {
  logger.verbose(`getting information for place at ${latitude}, ${longitude}`);
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
      };
    },
  );

  const db = await openDatabase();

  const pointGeom = `ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})',4326)`;

  const placePromise = db
    // In this distance query, we need to set the spatial reference system of
    // the point we're querying for. All of our spatial tables are SRS 4326,
    // which corresponds to WGS84.
    .query(
      `SELECT
       name,state,stateName,county,timezone,stateFIPS,countyFIPS
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

  if (place && place.name && place.state) {
    place.fullName = `${place.name}, ${place.state}`;
  }

  return { point, place, grid, isMarine: isMarine.rows.length > 0 };
};
