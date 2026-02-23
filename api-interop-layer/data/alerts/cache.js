import {
  SIMPLIFICATION_METERS,
  SPATIAL_PROJECTION,
} from "../../util/constants.js";
import { logger } from "../../util/monitoring/logger.js";

const log = logger.child({ subsystem: "alert cache" });

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
  async add({
    hash,
    alert,
    geometry = null,
    counties = [],
    states = [],
    alertKind = null,
  }) {
    const alertAsString = JSON.stringify(alert);
    const countiesAsString = JSON.stringify(counties);
    const statesAsString = JSON.stringify(states);

    // If there is no geometry object, or there is and it has a shape property,
    // then there's either no shape or it's being provided to us as a GeoJSON
    // object.
    if (geometry == null || geometry.shape) {
      const sql = `
      INSERT INTO ${this.tableName}
        (hash, alertJson, counties, states, alertKind, shape, shape_simplified)
        VALUES
          ($1, $2, $3, $4, $5,
          
          ST_SetSRID(ST_GeomFromGeoJson($6), ${SPATIAL_PROJECTION.WGS84}),
          ST_SetSRID(ST_GeomFromGeoJson($6), ${SPATIAL_PROJECTION.WGS84})
        );`;

      await this.db
        .query(sql, [
          hash,
          alertAsString,
          countiesAsString,
          statesAsString,
          alertKind,
          geometry?.shape,
        ])
        .catch((e) => {
          log.error({ error: e, alert }, "error adding alert to cache");
        });
    }

    // If the geometry has a SQL property, then this alert's shape is determined
    // by a sub-query, so we'll just insert it right in here. We'll also add a
    // simplified geometry now.
    else if (geometry.sql) {
      const sql = `
      INSERT INTO ${this.tableName}
        (hash, alertJson, counties, states, alertKind, shape, shape_simplified)
        VALUES
          ($1, $2, $3, $4, $5,

          ${
            /*
          Preserve the original subquery. It needs to be wrapped in
          parentheses or the database will complain. */ ""
          }
          (${geometry.sql}),
          
          ${
            /*
            We also want to store a simplified version of the original
            shape. Our shapes are in a geographic coordinate system
            (WGS84; lat/lon decimal degrees) so we first need to
            transform it into a meter-based coordinate system. If we
            try to simplify it from a degree-based system, we will
            get inconsistent simplification based on latitude, because
            degrees of longitude cover smaller distances as you
            approach the poles.

            Once we've transformed to a meter-based projection, we
            can simplify the polygon by a standard number of meters.
            Then we transform it back to decimal degrees.

            This query is nested so it works from the inside out.
            Thus, the lines presented here are in, essentially,
            reverse order of how they run.

            STEP 3: Transform back to WGS84.
            */ ""
          }
          ST_TRANSFORM(
            ${
              /*
              STEP 2: Simplify the shape.
              */ ""
            }
            ST_SIMPLIFY(
              ${
                /*
                STEP 1: Transform to the web mercator projection.
                This is a global meter grid.

                [TODO]: Investigate dynamically selecting a more
                precise projection. UTM would be a better choice
                than web mercator, but we'd have to figure out
                which UTM grid to start with because each grid
                has its own SRID and coordinate system within the
                grid. That is, UTM is not a single global projection.
                We would need to do calculations on the input
                shape to determine the most appropriate UTM
                grid to use.

                We may also choose to stick with web mercator for
                any shapes that are entirely below a certain
                latitude as it's accurate enough. Web mercator
                loses accuracy as it approaches the poles.
                */ ""
              }
              ST_TRANSFORM(
                (${geometry.sql}),
                ${SPATIAL_PROJECTION.WEB_MERCATOR}
              ),
              ${SIMPLIFICATION_METERS}
            ),
            ${SPATIAL_PROJECTION.WGS84}
          )
        );`;

      await this.db.query(sql, [
        hash,
        alertAsString,
        countiesAsString,
        statesAsString,
        alertKind,
      ]);
    }

    // If there is a geometry, let's also go ahead and update the alertJson
    // to include the GeoJSON version of the simplified geometry. No reason we
    // should keep smooshing those together elsewhere.
    if (geometry) {
      const sql = `
        UPDATE ${this.tableName}
        SET alertjson = jsonb_set(
          alertjson,
          '{geometry}',
          ST_AsGeoJSON(shape_simplified)::jsonb
        )
        WHERE hash=$1
      `;

      await this.db.query(sql, [hash]);
    }
  }

  /**
   * @function getIntersectingAlertsForPoint
   *
   * Given a latitude and longitude, retrieve all alerts that include it.
   * Optionally include a buffer around the point.
   */
  async getIntersectingAlertsForPoint(lat, lon) {
    const sql = `SELECT alertjson
    FROM weathergov_geo_alerts_cache
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
