import { parseTTLFromHeaders } from "../../util/caching.js";
import { convertProperties } from "../../util/convert.js";
import { requestJSONWithHeaders } from "../../util/request.js";
import { getFromRedis, saveToRedis } from "../../redis.js";
import connectionPool from "../connectionPool.js";
import { parseAPIIcon } from "../../util/icon.js";
import { logger } from "../../util/monitoring/index.js";
import isObservationValid from "./valid.js";
import { updateStoreUrl, API_TIMINGS_METADATA } from "../../util/performance.js";

const observationsLogger = logger.child({ subsystem: "observations" });

// 1 day / 24 hours
export const DEFAULT_STATIONS_CACHE_TTL = 86400;
// 2 min
export const DEFAULT_OBSERVATIONS_CACHE_TTL = 120;

const fetchStations = async (wfo, x, y) => {
  const stationsUrl = `/gridpoints/${wfo}/${x},${y}/stations?limit=3`;

  // Attempt to fetch any existing data from the cache
  const foundInCache = await getFromRedis(stationsUrl);
  if (foundInCache) {
    return foundInCache;
  }

  // Otherwise, we fetch from the API
  try {
    const [data, headers] = await requestJSONWithHeaders(
      connectionPool,
      stationsUrl,
    );

    if (!Array.isArray(data.features) || data.features.length === 0) {
      return { error: true };
    }

    const result = data.features.slice(0, 3);

    // Attempt to cache the resulting data
    await saveToRedis(stationsUrl, result, DEFAULT_STATIONS_CACHE_TTL);
    return result;
  } catch (e) {
    observationsLogger.error(
      { err: e, wfo, x, y },
      "Error fetching stations from API",
    );

    // Throw errors with statusCode 403 or 504, so they can be handled
    // immediately in route handlers
    if (e.cause?.statusCode === 403 || e.cause?.statusCode === 504) {
      throw e;
    }

    return { error: true };
  }
};

const urlFromStation = (station) => {
  return `/stations/${station.properties.stationIdentifier}/observations?limit=1`;
};

const fetchObservation = async (station) => {
  const url = urlFromStation(station);

  const foundInCache = await getFromRedis(url);
  if (foundInCache) {
    return foundInCache;
  }

  try {
    const [data, headers] = await requestJSONWithHeaders(connectionPool, url);

    if (!Array.isArray(data.features) || data.features.length === 0) {
      observationsLogger.warn(
        { station: station.properties.stationIdentifier },
        "station has no data",
      );
      return { error: true, message: "No valid observations found." };
    }

    // Attempt to cache the result according to the
    // TTL given by the header
    let ttl = parseTTLFromHeaders(headers);
    if (!ttl) {
      ttl = DEFAULT_OBSERVATIONS_CACHE_TTL;
    }
    await saveToRedis(url, data.features[0].properties, ttl);

    return data.features[0].properties;
  } catch (e) {
    observationsLogger.error(
      { err: e, station: station.properties.stationIdentifier },
      "Error fetching observation for station",
    );

    // Throw errors with statusCode 403 or 504, so they can be handled
    // immediately in route handlers
    if (e.cause?.statusCode === 403 || e.cause?.statusCode === 504) {
      throw e;
    }

    return { error: true };
  }
};

export default async (
  { grid: { wfo, x, y }, point: { latitude, longitude } },
  db,
) => {
  const stations = await fetchStations(wfo, x, y);

  if (stations.error) {
    observationsLogger.warn(
      {
        error: true,
        wfo,
        x,
        y,
      },
      "Failed to get a list of stations",
    );
    return {
      error: true,
      message: "Failed to find an approved observation station",
    };
  }

  let station = stations.shift();

  const others = stations.map((station) => fetchObservation(station));

  let observation = await fetchObservation(station);

  if (!isObservationValid(observation)) {
    observationsLogger.warn(
      { station: station.properties.stationIdentifier, choice: "first" },
      "station observations are invalid",
    );

    if(API_TIMINGS_METADATA){
      updateStoreUrl(
        urlFromStation(station),
        (entry) => {
          entry.awaited = true;
          entry.obsIndex = 0;
          entry.validObs = false;
        }
      );
    }

    const fallbackObs = await Promise.all(others);
    let validIndex = -1;
    if (isObservationValid(fallbackObs[0])) {
      station = stations[0];
      observation = fallbackObs[0];
      observationsLogger.info(
        { station: station.properties.stationIdentifier, choice: "second" },
        "station observations are valid",
      );
      validIndex = 1;
    } else if (isObservationValid(fallbackObs[1])) {
      station = stations[1];
      observation = fallbackObs[1];
      observationsLogger.info(
        { station: station.properties.stationIdentifier, choice: "third" },
        "station observations are valid",
      );
      validIndex = 2;
    } else {
      observationsLogger.warn(
        { stations, choice: "all" },
        "station observations are invalid",
      );

      if(API_TIMINGS_METADATA){
        stations.map(urlFromStation)
          .forEach((url, idx) => {
            updateStoreUrl(
              url,
              (entry) => {
                entry.awaited = true;
                entry.obsIndex = idx + 1;
                entry.validObs = ((idx + 1) === validIndex);
              }
            );
          });
      }
      
      station = null;
      observation = null;
    }
  } else {
    if(API_TIMINGS_METADATA){
      updateStoreUrl(
        urlFromStation(station),
        (timingData) => {
          timingData.awaited = true;
          timingData.obsIndex = 0,
          timingData.validObs = true;
        }
      );

      // Add falsy data for the rest of the stations
      stations.map(urlFromStation)
        .forEach((url, idx) => {
          updateStoreUrl(
            url,
            (entry) => {
              entry.awaited = false;
              entry.obsIndex = idx + 1;
              entry.validObs = false;
            }
          );
        });
    }
  }

  if (station && observation) {
    observationsLogger.trace(
      { station: station.properties.stationIdentifier },
      "using station observation",
    );

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

    const distanceResult = await db.query(`
      SELECT ST_DISTANCESPHERE(
        ST_GEOMFROMGEOJSON('${JSON.stringify(station.geometry)}'),
        ST_GEOMFROMTEXT('POINT(${longitude} ${latitude})')
      ) as distance
    `);

    const [{ distance }] = distanceResult.rows;

    return {
      timestamp: new Date(observation.timestamp),
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
