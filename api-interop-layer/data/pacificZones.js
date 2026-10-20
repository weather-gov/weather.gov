import { logger } from "../util/monitoring/index.js";
import openDatabase from "./db.js";
import {
  PACIFIC_STATION_MAX_DISTANCE,
  PACIFIC_STATION_WFOS,
} from "./obs/pacificStations.js";

const pointLogger = logger.child({ subsystem: "point" });

// PW/FM/MH zone extent padded by the station cap, Guam and CNMI fall outside
const PACIFIC_ZONE_EXTENT = {
  minLatitude: 0.3,
  maxLatitude: 12.4,
  minLongitude: 130.4,
  maxLongitude: 172.9,
};

export const isInPacificZoneExtent = (latitude, longitude) =>
  latitude >= PACIFIC_ZONE_EXTENT.minLatitude &&
  latitude <= PACIFIC_ZONE_EXTENT.maxLatitude &&
  longitude >= PACIFIC_ZONE_EXTENT.minLongitude &&
  longitude <= PACIFIC_ZONE_EXTENT.maxLongitude;

// PQW/PQE have no gridpoints, so take the containing forecast zone, else the nearest inside the cap
export const getPacificZoneGridData = async (latitude, longitude) => {
  const pointGeom = `ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)`;

  try {
    const db = await openDatabase();
    const result = await db.query(
      `SELECT REGEXP_REPLACE(id, '^.*/', '') AS zone, wfo
        FROM weathergov_geo_zones
        WHERE type = 'forecast'
        AND wfo = ANY($1::text[])
        AND ST_DWithin(shape::geography, ${pointGeom}::geography, $2)
        ORDER BY shape <-> ${pointGeom}
        LIMIT 1`,
      [PACIFIC_STATION_WFOS, PACIFIC_STATION_MAX_DISTANCE],
    );

    if (!result.rows?.length) {
      return false;
    }

    const { zone, wfo } = result.rows[0];
    return { wfo, zone, type: "land", source: "zone" };
  } catch (err) {
    pointLogger.error({ err }, "Error looking up Pacific forecast zone");
    return false;
  }
};
