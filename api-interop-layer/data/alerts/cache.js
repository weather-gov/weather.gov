import { geojsonToWKT } from "@terraformer/wkt";

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
  constructor(tableName = "weathergov_geo_alerts_cache") {
    this.tableName = tableName;
  }

  async getHashes() {
    const sql = `SELECT hash FROM ${this.tableName};`;
    const { rows } = await this.db.query(sql);
    return rows.map((r) => r.hash);
  }

  /**
   * Given an array of current hashes and an array of incoming
   * hashes, return a list of hashes from the current set that are
   * not in the incoming set.
   * This is how we determine old/invalid hashes during an
   * all active alerts request.
   * NOTE: node does not yet have standardized Set methods
   * for determining difference, so we can't do the "normal"
   * thing here and use Sets
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference
   */
  determineOldHashesFrom(currentHashes, incomingHashes) {
    return currentHashes.filter(
      (currentHash) => !incomingHashes.includes(currentHash),
    );
  }

  /**
   * Given an array of current hashes and an array of incoming
   * hashes, return a list of hashes from the incoming set that
   * are not in the current set.
   * This is how we determine new hashes during an all active
   * alerts request, and how we know which alerts are new.
   * NOTE: node does not yet have standardized Set methods
   * for determining difference, so we can't do the "normal"
   * thing here and use Sets
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference
   */
  determineNewHashesFrom(currentHashes, incomingHashes) {
    return incomingHashes.filter(
      (incomingHash) => !currentHashes.includes(incomingHash),
    );
  }

  /**
   * Remove rows from the cache table by hash.
   * If the argument is a list, we assume a list of hashes.
   */
  async removeByHashes(hashes) {
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return [];
    }

    const list = hashes.map((_, i) => `$${i + 1}`).join(",");

    const sql = `DELETE FROM ${this.tableName} WHERE hash IN (${list})`;
    return this.db.query(sql, hashes);
  }

  /**
   * Add the provided hash, geometry, and alert data to the
   * cache table.
   */
  async add(hash, alert, geometry, alertKind = null) {
    const alertAsString = JSON.stringify(alert);
    const sql = `INSERT INTO ${this.tableName} (hash, alertJson, shape, alertKind) VALUES($1, $2, ST_TRANSFORM(ST_GeomFromGeoJson($3), 4326), $4);`;
    return await this.db.query(sql, [hash, alertAsString, geometry, alertKind]);
  }

    /**
   * @function getIntersectingAlertsForPoint
   *
   * Given a latitude and longitude, retrieve all alerts that include it.
   * Optionally include a buffer around the point.
   *
   * @arg {Object} options
   * @arg {Number} options.buffer How much buffer to add to the point, in
   *                              meters. If unset, no buffer will be added.
   */
  async getIntersectingAlertsForPoint(lat, lon, options) {
    return this.getIntersectingAlertsWKT(`POINT(${lon} ${lat})`, options);
  }

    /**
   * @function getIntersectingAlertsForGeoJSON
   *
   * Given a GeoJSON geometry, retrieve all alerts that include it.
   * Optionally include a buffer around the geometry.
   *
   * @arg {Object} options
   * @arg {Number} options.buffer How much buffer to add to the point, in
   *                              meters. If unset, no buffer will be added.
   */
  async getIntersectionAlertsForGeoJSON(geoJSON, options) {
    return this.getIntersectingAlertsWKT(geojsonToWKT(geoJSON), options);
  }

  /**
   * @function getIntersectingAlertsWKT
   *
   * Given a geometry in WKT format, retrieve all alerts that include it.
   * Optionally include a buffer around the geometry.
   *
   * @arg {Object} options
   * @arg {Number} options.buffer How much buffer to add to the point, in
   *                              meters. If unset, no buffer will be added.
   */
  async getIntersectingAlertsWKT(wkt, options) {
    const inputGeometry = [
      // The ::geography instructs postgis to treat the object as a geographic
      // shape instead of geometric. That way any buffering will be in meters
      // rather than degrees.
      `ST_GeomFromText('${wkt}',4326)::geography`,
    ];
    if (options?.buffer) {
      inputGeometry.unshift("ST_Buffer(");
      inputGeometry.push(`,${options.buffer})`);
    }

    const geometry = inputGeometry.join("");

    const sql = `SELECT alertJson, ST_AsGeoJson(shape) as geometry FROM ${this.tableName} WHERE ST_INTERSECTS(${geometry}, shape);`;

    const response = await this.db.query(sql);
    const results = response.rows;
    return results.map((result) =>
      Object.assign({}, result.alertjson, {
        geometry: JSON.parse(result.geometry),
      }),
    );
  }

  /**
   * Drop the cache table from the database entirely.
   */
  async dropCacheTable() {
    const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
    return this.db.query(sql);
  }
}
