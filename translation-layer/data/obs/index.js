import { openDatabase } from "../db.js";
import isObservationValid from "./valid.js";
import { convertProperties } from "../../util/convert.js";

// document the translation layer; high level conceptual and some lower-level for eng
// then we can figure out SDB resourcing and how we'd collaborate

export default async ({
  grid: { wfo, x, y },
  point: { latitude, longitude },
}) => {
  const dbPromise = openDatabase();

  const stations = await fetch(
    `https://api.weather.gov/gridpoints/${wfo}/${x},${y}/stations`,
  )
    .then((r) => r.json())
    .then((out) => out.features.slice(0, 3));

  let station = stations.shift();

  const others = stations.map(({ id }) =>
    fetch(`${id}/observations/?limit=1`)
      .then((r) => r.json())
      .then((out) => out.features[0].properties),
  );

  let observation = await fetch(`${station.id}/observations/?limit=1`)
    .then((r) => r.json())
    .then((out) => out.features[0].properties);

  if (!isObservationValid(observation)) {
    const fallbackObs = await others;
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
      .filter((key) => observation[key].unitCode)
      .reduce((o, key) => ({ ...o, [key]: observation[key] }), {});

    convertProperties(data);

    const [{ distance }] = await db.query(`
      SELECT ST_DISTANCE_SPHERE(
        ST_GEOMFROMGEOJSON('${JSON.stringify(station.geometry)}'),
        ST_SRID(ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})'), 4326)
      ) as distance
    `);
    await db.end();

    return {
      timestamp: observation.timestamp,
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
