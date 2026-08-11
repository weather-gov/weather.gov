import path from "node:path";
import { Worker } from "node:worker_threads";
import { enableBackgroundProcessing } from "../../util/background.js";
import { logger } from "../../util/monitoring/index.js";
import openDatabase from "../db.js";

const riskOverviewLogger = logger.child({ subsystem: "risk overview" });

export const startRiskOverviewProcessing = async () => {
  if (enableBackgroundProcessing()) {
    // Make sure the database is initialized.
    // await ensureDatabaseExists;

    const worker = new Worker(path.join(import.meta.dirname, "background.js"));

    worker.on("message", ({ action, level, message }) => {
      switch (action) {
        default:
          break;
      }
    });

    let restartTimer = null,
      isExiting = false;

    process.on("SHUTDOWN", () => {
      isExiting = true;
      clearTimeout(restartTimer);
      worker.postMessage({ action: "SHUTDOWN" });
    });

    const restart = () => {
      // Don't restart if we're trying to shutdown.
      if (isExiting) return;
      // We can get the exit event two or more times for the same background
      // process. Wait a few seconds after the last exit/error event before
      // restarting so we don't end up with multiples of our background worker.
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        startRiskOverviewProcessing();
      }, 5_000);
    };

    // If our background thread stops, restart it.
    worker.on("exit", restart);
    worker.on("error", (e) => {
      riskOverviewLogger.error({ err: e });
      restart();
    });

    // Make it go. Otherwise it won't go.
    worker.postMessage({
      action: "start",
    });
  }
};

// Only start processing risks if the environment
// variable / feature flag is set
if (process.env.TASKS_GHWO_INTEROP === "true") {
  startRiskOverviewProcessing();
}

/**
 *
 * @param {string} placeId 5-digit FIPS code for a county, or 2-letter state abbreviation
 * @returns Risk overview information.
 */
export const getRiskOverview = async (placeId) => {
  try {
    // Make sure the database is initialized.
    // await ensureDatabaseExists;

    const db = await openDatabase();
    const data = await db.query(
      "SELECT data FROM weathergov_risk_data WHERE id=$1::text",
      [placeId.toUpperCase()],
    );

    if (data.rows.length) {
      return data.rows[0].data;
    }
    return { error: `No risk overview found for ${placeId}`, status: 404 };
  } catch (e) {
    riskOverviewLogger.error({ err: e, placeId }, "could not fetch");
    return { error: `Error fetching risk overview for ${placeId}` };
  }
};
