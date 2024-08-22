import dayjs from "../../util/day.js";
import { openDatabase } from "../db.js";
import isObservationValid from "./valid.js";
import { convertProperties } from "../../util/convert.js";
import { fetchAPIJson } from "../../util/fetch.js";

// document the translation layer; high level conceptual and some lower-level for eng
// then we can figure out SDB resourcing and how we'd collaborate

export default async ({
  grid: { wfo, x, y },
  point: { latitude, longitude },
}) => {
  const dbPromise = openDatabase();

  const stations = await fetchAPIJson(
    `/gridpoints/${wfo}/${x},${y}/stations`,
  ).then((out) => out.features.slice(0, 3));

  let station = stations.shift();

  const others = stations.map(({ properties: { stationIdentifier } }) =>
    fetchAPIJson(`/stations/${stationIdentifier}/observations?limit=1`).then(
      (out) => out.features[0].properties,
    ),
  );

  let observation = await fetchAPIJson(
    `/stations/${station.properties.stationIdentifier}/observations?limit=1`,
  ).then((out) => out.features[0].properties);

  if (!isObservationValid(observation)) {
    const fallbackObs = await Promise.all(others);
    if (isObservationValid(fallbackObs[0])) {
      station = stations[0];
      observation = fallbackObs[0];
    } else if (isObservationValid(fallbackObs[1])) {
      station = stations[0];
      observation = fallbackObs[0];
    } else {
      station = null;
      observation = null;
    }
  }

  if (station && observation) {
    const db = await dbPromise;

    const data = Object.keys(observation)
      .filter((key) => observation[key]?.unitCode)
      .reduce((o, key) => ({ ...o, [key]: observation[key] }), {});

    // Add a "feels like" property, which is coerced from the heat index and
    // wind chill, if provided.
    data.feelsLike = data.heatIndex;
    if (data.feelsLike.value === null) {
      data.feelsLike = data.windChill;
    }
    if (data.feelsLike.value === null) {
      data.feelsLike = data.temperature;
    }

    convertProperties(data);

    const [{ distance }] = await db.query(`
      SELECT ST_DISTANCE_SPHERE(
        ST_GEOMFROMGEOJSON('${JSON.stringify(station.geometry)}'),
        ST_SRID(ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})'), 4326)
      ) as distance
    `);
    await db.end();

    return {
      timestamp: {
        formatted: observation.timestamp,
        utc: dayjs(observation.timestamp),
      },
      icon: observation.icon,
      description: observation.textDescription,
      station: convertProperties({
        id: station.properties.stationIdentifier,
        name: station.properties.name,
        elevation: station.properties.elevation,
        distance: {
          unitCode: "wmoUnit:m",
          value: distance,
        },
      }),
      data,
    };
  }

  return false;
};