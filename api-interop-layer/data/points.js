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
  // Defense-in-depth: even though Fastify validates lat/lon as numbers,
  // we still bind them through positional placeholders. If a future route
  // change loosens the schema or a middleware bug lets through a raw
  // string, we don't want it landing inside an ST_GEOMFROMTEXT call.
  const placePromise = db
    .query(
      `SELECT
       name,state,stateName,county,timezone,stateFIPS,countyFIPS
       FROM weathergov_geo_places
       ORDER BY ST_DISTANCE(point,ST_GEOMFROMTEXT(CONCAT('POINT(', ?, ' ', ?, ')')))
       LIMIT 1`,
      [longitude, latitude],
    )
    .then((row) => {
      if (Array.isArray(row) && row.length > 0) {
        return row[0][0];
      }
      return null;
    });

  const [grid, place] = await Promise.all([pointsPromise, placePromise]);

  if (place && place.name && place.state) {
    place.fullName = `${place.name}, ${place.state}`;
  }

  return { point, place, grid };
};
