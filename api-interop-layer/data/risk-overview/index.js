import path from "node:path";
import { Worker, isMainThread } from "node:worker_threads";
import { logger } from "../../util/monitoring/index.js";
import openDatabase from "../db.js";

const riskOverviewLogger = logger.child({ subsystem: "risk overview" });

// Save the returned promise and immediately kick off the database init. The
// rest of the stuff in here will await the promise, but it'll be basically
// instantaneous for each await after the database is initialized.
const ensureDatabaseExists = openDatabase().then(async (db) => {
  // Not modeling these tables in Django because they should not be part of the
  // product in the longterm. Maybe. It's possible that we will decide to cache
  // risk overview data from the API, but we're not caching anything else besides
  // alerts so that will probably be a whole conversation if it ever comes up.
  // Anyway, working on the assumption that these tables will eventually go away,
  // I'm not capturing them in our data models.
  await db.query(`CREATE TABLE
    IF NOT EXISTS
    weathergov_temp_ghwo
    (
      id character varying(5),
      data jsonb not null,
      PRIMARY KEY(id)
    )`);

  await db.query(`CREATE TABLE
    IF NOT EXISTS
    weathergov_temp_ghwo_meta
    (
      url text not null,
      updated timestamp default NOW(),
      primary key(url)
    )`);

  // If the TRUNCATE_HAZARD_OUTLOOKS env variable
  // is set to true, we drop the GHWO metadata
  // from the meta table on each restart.
  if (process.env.TRUNCATE_HAZARD_OUTLOOKS === "true") {
    riskOverviewLogger.info(
      "Truncating weathergov_temp_ghwo_meta, weathergov_temp_ghwo...",
    );
    await db.query(`TRUNCATE weathergov_temp_ghwo_meta`);
    await db.query(`TRUNCATE weathergov_temp_ghwo`);
  }
});

export const startRiskOverviewProcessing = async () => {
  // If this is the main thread (and the first instance in production), fire up
  // the background worker.
  const enableBackgroundProcessing = process.env.API_INTEROP_PRODUCTION
    ? process.env.CF_INSTANCE_INDEX == 0 && isMainThread
    : isMainThread;
  if (enableBackgroundProcessing) {
    // Make sure the database is initialized.
    await ensureDatabaseExists;

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
startRiskOverviewProcessing();

/**
 *
 * @param {string} placeId 5-digit FIPS code for a county, or 2-letter state abbreviation
 * @returns Risk overview information.
 */
export const getRiskOverview = async (placeId) => {
  try {
    // Make sure the database is initialized.
    await ensureDatabaseExists;

    const db = await openDatabase();
    const data = await db.query(
      "SELECT data FROM weathergov_temp_ghwo WHERE id=$1::text",
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
