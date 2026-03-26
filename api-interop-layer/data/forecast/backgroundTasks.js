import { parentPort } from "node:worker_threads";
import { SPATIAL_PROJECTION } from "../../util/constants.js";
import openDatabase from "../db.js";
import { logger } from "../../util/monitoring/index.js";

const forecastLogger = logger.child({ subsystem: "heatspot-analysis" });
forecastLogger.info({
  message: "Worker Thread: backgroundTasks.js has LOADED",
});

const tableName = "weathergov_ndfd_gridpoints";
const logTableName = "weathergov_ndfd_grid_logs";
const heatIndexTable = "weathergov_ndfd_grid_index";

/**
 * processHeatInterval
 * 1. Aggregates logs from the last 30 minutes.
 * 2. Calculates relative heat and cache expansion radius.
 * 3. Saves to the historical index table.
 * 4. Truncates the raw log table to maintain high performance.
 */
export const processHeatInterval = async (db, port = parentPort) => {
  const cutoffTime = new Date().toISOString();

  const insertSql = `
        INSERT INTO ${heatIndexTable} (interval_start, wfo, x, y, hit_count, relative_heat, cache_radius)
        WITH batch_stats AS (
            SELECT 
                COUNT(*)::float / NULLIF(COUNT(DISTINCT grid_point_id), 0) as avg_hits
            FROM ${logTableName}
            WHERE timestamp <= $1
        ),
        point_scores AS (
            SELECT 
                p.wfo, p.x, p.y,
                COUNT(*) as hits
            FROM ${logTableName} l
            JOIN ${tableName} p ON l.grid_point_id = p.id
            WHERE l.timestamp <= $1
            GROUP BY p.wfo, p.x, p.y
        )
        SELECT 
            $1::timestamp,
            ps.wfo, ps.x, ps.y, ps.hits,
            ROUND((ps.hits / bs.avg_hits)::numeric, 2),
            CASE 
                WHEN ps.hits > bs.avg_hits * 15 THEN 3
                WHEN ps.hits > bs.avg_hits * 7  THEN 2
                WHEN ps.hits > bs.avg_hits * 2  THEN 1
            END
        FROM point_scores ps, batch_stats bs
        WHERE (ps.hits / bs.avg_hits) >= 2.0
        ON CONFLICT (interval_start, wfo, x, y) DO NOTHING;
    `;

  const deleteSql = `DELETE FROM ${logTableName} WHERE timestamp <= $1;`;

  try {
    const insertResult = await db.query(insertSql, [cutoffTime]);
    await db.query(deleteSql, [cutoffTime]);

    forecastLogger.info(
      {
        hotspots: insertResult.rowCount || 0,
        cutoffTime,
      },
      "Heat Interval Processed and logs purged",
    );
  } catch (err) {
    forecastLogger.error({ err }, "Heat Interval Processing Failed");
  }
};

export const flushForecastGridLogs = async (db, batch) => {
  if (!batch?.length) return;

  forecastLogger.info(
    { length: batch.length },
    "flushing grid hits to the database",
  );

  const batchJson = JSON.stringify(batch);

  // Three tasks in one trip:
  // 1. Deduplicates the incoming batch.
  // 2. Inserts NEW grid points with their PostGIS geometry.
  // 3. Inserts a log entry for EVERY hit linked to the correct grid_point_id.
  const sql = `
            WITH input_data AS (
                SELECT DISTINCT ON (wfo, x, y) wfo, x, y, geometry 
                FROM json_to_recordset($1::json) AS j(wfo text, x int, y int, geometry json)
            ),
            registered_grids AS (
                INSERT INTO ${tableName} (wfo, x, y, shape)
                SELECT wfo, x, y, ST_SetSRID(ST_GeomFromGeoJson(geometry), ${SPATIAL_PROJECTION.WGS84})
                FROM input_data
                WHERE geometry IS NOT NULL
                ON CONFLICT (wfo, x, y) DO NOTHING
                RETURNING id, wfo, x, y
            ),
            all_grid_ids AS (
                SELECT id, wfo, x, y FROM registered_grids
                UNION ALL
                SELECT g.id, g.wfo, g.x, g.y FROM ${tableName} g
                JOIN input_data i ON g.wfo = i.wfo AND g.x = i.x AND g.y = i.y
                WHERE NOT EXISTS (SELECT 1 FROM registered_grids rg WHERE rg.id = g.id)
            )
            INSERT INTO ${logTableName} (grid_point_id, timestamp)
            SELECT ag.id, NOW()
            FROM json_to_recordset($1::json) AS original_hits(wfo text, x int, y int)
            JOIN all_grid_ids ag ON ag.wfo = original_hits.wfo AND ag.x = original_hits.x AND ag.y = original_hits.y;
        `;

  try {
    await db.query(sql, [batchJson]);
  } catch (err) {
    forecastLogger.error({ err }, "grid batcher failed");
  }
};

let db;
if (parentPort) {
  parentPort.on("message", async (msg) => {
    if (!db) db = await openDatabase();

    switch (msg.action?.toLowerCase()) {
      case "flush_forecast_grid_logs":
        flushForecastGridLogs(db, msg.payload);
        break;
      case "process_heat_interval":
        processHeatInterval(db).catch(() => {});
        break;
      case "start":
        break;
      case "shutdown":
        process.exit();
        break;
    }
  });
}
