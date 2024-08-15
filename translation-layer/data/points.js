import { openDatabase } from "./db.js";

export default async (latitude, longitude) => {
  const point = { latitude, longitude };

  const pointsPromise = fetch(
    `https://api.weather.gov/points/${latitude},${longitude}`,
  )
    .then((r) => r.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      return {
        wfo: data.properties.gridId,
        x: data.properties.gridX,
        y: data.properties.gridY,
      };
    });

  const db = await openDatabase();
  const placePromise = db
    .query(
      `SELECT
       name,state,stateName,county,timezone,stateFIPS,countyFIPS
       FROM weathergov_geo_places
       ORDER BY ST_DISTANCE(point,ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})'))
       LIMIT 1`,
    )
    .then((row) => {
      if (Array.isArray(row) && row.length > 0) {
        return row[0];
      }
      return null;
    });

  const [grid, place] = await Promise.all([pointsPromise, placePromise]);

  return { point, place, grid };
};
