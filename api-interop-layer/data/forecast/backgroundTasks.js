import { parentPort } from "node:worker_threads";
import { SPATIAL_PROJECTION } from "../../util/constants.js";
import openDatabase from "../db.js";

const tableName = "weathergov_ndfd_gridpoints";
const logTableName = "weathergov_ndfd_grid_logs";

export const flushForecastGridLogs = async (db, batch) => {
  // Log the number of hits being processed
  if (parentPort) {
    parentPort.postMessage({
      action: "log",
      level: "info",
      message: `flushing ${batch.length} grid hits to the database`,
    });
  }

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
    if (parentPort) {
      parentPort.postMessage({
        action: "log",
        level: "error",
        message: `Grid Batcher failed: ${err.message}`,
      });
    }
  }
};

let db;
if (parentPort) {
  parentPort.on("message", async (msg) => {
    if (!db) db = await openDatabase();

    switch (msg.action?.toLowerCase()) {
      case "flush_forecast_grid_logs":
        await flushForecastGridLogs(db, msg.payload);
        break;
    }
  });
}
