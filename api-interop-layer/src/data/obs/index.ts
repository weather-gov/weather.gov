import dayjs from "../../util/day.js";
import isObservationValid from "./valid.js";
import { convertProperties } from "../../util/convert.js";
import { fetchAPIJson } from "../../util/fetch.js";
import { parseAPIIcon } from "../../util/icon.js";
import { logger } from "../../util/monitoring/index.js";

const observationsLogger = logger.child("observations");

export default async (
  { grid: { wfo, x, y }, point: { latitude, longitude }, place: { timezone } },
  dbConnection,
) => {
  const stations = await fetchAPIJson(
    `/gridpoints/${wfo}/${x},${y}/stations?limit=3`,
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
    observationsLogger.warn("Failed to get a list of stations");
    return {
      error: true,
      message: "Failed to find an approved observation station",
    };
  }

  let station = stations.shift();

  const others = stations.map(({ properties: { stationIdentifier } }) =>
    fetchAPIJson(`/stations/${stationIdentifier}/observations?limit=1`).then((out) => {
        if (out.error) {
          observationsLogger.warn(
            { station: stationIdentifier },
            "station error",
          );
          return out;
        }
        if (!Array.isArray(out.features) || out.features.length === 0) {
          observationsLogger.warn(
            { station: stationIdentifier },
            "station has no data",
          );
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
      observationsLogger.warn(
        { station: station.properties.stationIdentifier },
        "station error",
      );
      return out;
    }
    if (!Array.isArray(out.features) || out.features.length === 0) {
      observationsLogger.warn(
        { station: station.properties.stationIdentifier },
        "station has no data",
      );
      return { error: true, message: "No valid observations found." };
    }

    return out.features[0].properties;
  });

  if (!isObservationValid(observation)) {
    observationsLogger.warn(
      { station: station.properties.stationIdentifier, choice: "first" },
      "station observations are invalid",
    );

    const fallbackObs = await Promise.all(others);
    if (isObservationValid(fallbackObs[0])) {
      station = stations[0];
      observation = fallbackObs[0];
      observationsLogger.info(
        { station: station.properties.stationIdentifier, choice: "second" },
        "station observations are valid",
      );
    } else if (isObservationValid(fallbackObs[1])) {
      station = stations[1];
      observation = fallbackObs[1];
      observationsLogger.info(
        { station: station.properties.stationIdentifier, choice: "third" },
        "station observations are valid",
      );
    } else {
      observationsLogger.warn(
        { stations, choice: "all" },
        "station observations are invalid",
      );

      station = null;
      observation = null;
    }
  }

  if (station && observation) {
    observationsLogger.trace(
      { station: station.properties.stationIdentifier },
      "using station observation",
    );

    const data = Object.keys(observation)
      .filter((key) => observation[key]?.unitCode)
      .reduce((o, key: any) => ({ ...o, [key]: observation[key] }), {});

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

    const distanceResult = await dbConnection.query(`
      SELECT ST_DISTANCESPHERE(
        ST_GEOMFROMGEOJSON('${JSON.stringify(station.geometry)}'),
        ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})')
      ) as distance
    `);

    const [{ distance }] = distanceResult.rows;

    return {
      timestamp: dayjs.utc(observation.timestamp).tz(timezone).format(),
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

  observationsLogger.warn({ wfo, x, y }, "no valid observations");
  return { error: true, message: "No valid observations found" };
};
