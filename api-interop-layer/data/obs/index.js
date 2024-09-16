import dayjs from "../../util/day.js";
import { openDatabase } from "../db.js";
import isObservationValid from "./valid.js";
import { convertProperties } from "../../util/convert.js";
import { fetchAPIJson } from "../../util/fetch.js";
import { parseAPIIcon } from "../../util/icon.js";
import { sendNewRelicMetric, createLogger } from "../../util/monitoring/index.js";

const logger = createLogger("observations");

export default async ({
  grid: { wfo, x, y },
  point: { latitude, longitude },
}) => {
  const dbPromise = openDatabase();

  const stations = await fetchAPIJson(
    `/gridpoints/${wfo}/${x},${y}/stations`,
  ).then((out) => {
    if (out.error) {
      return out;
    }
    if (!Array.isArray(out.features) || out.features.length === 0) {
      return { error: true };
    }

    return out.features.slice(0, 3);
  });
  if (stations.error) {
    logger.warn("Failed to get a list of stations");
    return {
      error: true,
      message: "Failed to find an approved observation station",
    };
  }

  let station = stations.shift();

  const others = stations.map(({ properties: { stationIdentifier } }) =>
    fetchAPIJson(`/stations/${stationIdentifier}/observations?limit=1`).then(
      (out) => {
        if (out.error) {
          logger.warn(`station ${stationIdentifier} returned an error`);
          return out;
        }
        if (!Array.isArray(out.features) || out.features.length === 0) {
          logger.warn(`station ${stationIdentifier} returned, but has no data`);
          return { error: true, message: "No valid observations found." };
        }

        return out.features[0].properties;
      },
    ),
  );

  let observation = await fetchAPIJson(
    `/stations/${station.properties.stationIdentifier}/observations?limit=1`,
  ).then((out) => {
    if (out.error) {
      logger.warn(
        `station ${station.properties.stationIdentifier} returned an error`,
      );
      return out;
    }
    if (!Array.isArray(out.features) || out.features.length === 0) {
      logger.warn(
        `station ${station.properties.stationIdentifier} returned, but has no data`,
      );
      return { error: true, message: "No valid observations found." };
    }

    return out.features[0].properties;
  });

  if (!isObservationValid(observation)) {
    logger.warn(
      `observations from ${station.properties.stationIdentifier} (first choice) are invalid`,
    );

    const fallbackObs = await Promise.all(others);
    if (isObservationValid(fallbackObs[0])) {
      station = stations[0];
      observation = fallbackObs[0];
      logger.info(
        `observations from ${station.properties.stationIdentifier} (second choice) are valid`,
      );
    } else if (isObservationValid(fallbackObs[1])) {
      station = stations[1];
      observation = fallbackObs[1];
      logger.info(
        `observations from ${station.properties.stationIdentifier} (third choice) are valid`,
      );
    } else {
      logger.warn(
        `observations from ${stations.map(({ properties: { stationIdentifier } }) => stationIdentifier).join(", ")} (second and third choice) are invalid`,
      );

      station = null;
      observation = null;
    }
  }

  if (station && observation) {
    logger.verbose(
      `using observations from ${station.properties.stationIdentifier}`,
    );

    const db = await dbPromise;

    const data = Object.keys(observation)
      .filter((key) => observation[key]?.unitCode)
      .reduce((o, key) => ({ ...o, [key]: observation[key] }), {});

    // Add a "feels like" property, which is coerced from the heat index and
    // wind chill, if provided.
    data.feelsLike = data.heatIndex;

    // Can't just check truthiness because 0 is valid.
    if (Number.isNaN(Number.parseInt(data.feelsLike?.value, 10))) {
      data.feelsLike = data.windChill;
    }
    if (Number.isNaN(Number.parseInt(data.feelsLike?.value, 10))) {
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

    sendNewRelicMetric({
      name: "wx.observation",
      type: "gauge",
      value: distance,
      attributes: {
        stationIndex: stations.indexOf(station),
        obsStation: station.properties.stationIdentifier,
      },
    });

    return {
      timestamp: {
        formatted: observation.timestamp,
        utc: dayjs(observation.timestamp),
      },
      icon: parseAPIIcon(observation.icon),
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

  logger.warn(`No valid observations found for ${wfo}/${x}/${y}`);
  return { error: true, message: "No valid observations found" };
};
