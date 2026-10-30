import {
  SIMPLIFICATION_METERS,
  SPATIAL_PROJECTION,
} from "../../util/constants.js";
import { logger } from "../../util/monitoring/logger.js";

const log = logger.child({ subsystem: "alert cache" });

// Reads come from here, and the Go alerts task owns the writes
export const LIVE_TABLE = "weathergov_geo_alerts_cache";

/**
 * AlertsCache
 * -----------------------------------
 * Serves as the interface into the alerts cache database table,
 * where active alerts and their geometries are stored.
 * To avoid potential memory conflicts in the threaded environment,
 * actual alert data is not stored on this object and methods are
 * mostly immutable.
 * Consumers can use multiple instances of this object to read vs write
 * to the cache table.
 */
export class AlertsCache {
  constructor(tableName = LIVE_TABLE) {
    this.tableName = tableName;
  }

  /**
   * @function getIntersectingAlertsForPoint
   *
   * Given a latitude and longitude, retrieve all alerts that include it.
   * Optionally include a buffer around the point.
   */
  async getIntersectingAlertsForPoint(lat, lon) {
    const sql = `SELECT alertjson
    FROM ${this.tableName}
    WHERE ST_DWithin(
        ST_SetSRID(ST_Point($2, $1), 4326)::geography,
        shape_simplified::geography,
        400,
        false
    )`;

    const response = await this.db.query(sql, [lat, lon]);
    return response.rows.map(({ alertjson }) => alertjson);
  }

  async getAlertsForCountyFIPS(fips) {
    const sql = `SELECT alertjson FROM ${this.tableName} WHERE counties::jsonb ? $1`;

    const response = await this.db.query(sql, [fips]);
    return response.rows.map(({ alertjson }) => alertjson);
  }
}
