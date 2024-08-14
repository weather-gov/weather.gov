import convert from "convert";
import { openDatabase } from "../db.js";
import isObservationValid from "./valid.js";

// document the translation layer; high level conceptual and some lower-level for eng
// then we can figure out SDB resourcing and how we'd collaborate

const obsUnitMapping = new Map([
  [
    "wmoUnit:degC",
    {
      in: { name: "celsius", label: "degC" },
      out: [{ name: "fahrenheit", label: "degF" }],
    },
  ],
  [
    "wmoUnit:km_h-1",
    {
      in: { name: "km", label: "km/h" },
      out: [{ name: "miles", label: "mph" }],
    },
  ],
  [
    "wmoUnit:degree_(angle)",
    { in: { name: "degrees", label: "degrees" }, out: [] },
  ],
  ["wmoUnit:percent", { in: { name: "percent", label: "percent" }, out: [] }],
  [
    "wmoUnit:Pa",
    {
      in: { name: "pascal", label: "pa" },
      out: [{ name: "millibar", label: "mb" }],
    },
  ],
  [
    "wmoUnit:mm",
    {
      in: { name: "millimeters", label: "mm" },
      out: [{ name: "inches", label: "in" }],
    },
  ],
  [
    "wmoUnit:m",
    {
      in: { name: "meters", label: "m" },
      out: [
        { name: "feet", label: "ft" },
        { name: "miles", label: "mi" },
      ],
    },
  ],
]);

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

    const properties = Object.keys(observation)
      .filter((key) => observation[key].unitCode)
      .forEach((key) => {
        const prop = observation[key];

        const conversion = obsUnitMapping.get(prop.unitCode);
        if (conversion) {
          const value = prop.value;

          observation[key] = { [conversion.in.label]: value };

          for (const out of conversion.out) {
            if (value === null) {
              observation[key][out.label] = null;
            } else {
              observation[key][out.label] = convert(
                value,
                conversion.in.name,
              ).to(out.name);
            }
          }
        }
      });

    const [{ distance }] = await db.query(`
      SELECT ST_DISTANCE_SPHERE(
        ST_GEOMFROMGEOJSON('${JSON.stringify(station.geometry)}'),
        ST_SRID(ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})'), 4326)
      ) as distance
    `);
    await db.end();

    return {
      station: {
        id: station.properties.stationIdentifier,
        name: station.properties.name,
        elevation: station.properties.elevation,
        distance: {
          unitCode: "wmoUnit:m",
          value: distance,
        },
      },
      data: observation,
    };
  }

  return false;
};
