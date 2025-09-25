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
        return { error: true };
      }

      return {
        wfo: data.properties.gridId,
        x: data.properties.gridX,
        y: data.properties.gridY,
      };
    },
  );

  const db = await openDatabase();
  const placePromise = db
    // In this distance query, we need to set the spatial reference system of
    // the point we're querying for. All of our spatial tables are SRS 4326,
    // which corresponds to WGS84.
    .query(
      `SELECT
       name,state,stateName,county,timezone,stateFIPS,countyFIPS
       FROM weathergov_geo_places
       ORDER BY ST_DISTANCE(point,ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})',4326))
       LIMIT 1`,
    )
    .then((result) => {
      if (Array.isArray(result.rows) && result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    });

  const [grid, place] = await Promise.all([pointsPromise, placePromise]);

  if (place && place.name && place.state) {
    place.fullName = `${place.name}, ${place.state}`;
  }

  return { point, place, grid };
};
