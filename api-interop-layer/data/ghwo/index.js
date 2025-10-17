import path from "node:path";
import { Worker, isMainThread } from "node:worker_threads";
import { createLogger } from "../../util/monitoring/index.js";
import openDatabase from "../db.js";
const logger = createLogger("ghwo");
const backgroundLogger = createLogger("ghwo (background)");

// Save the returned promise and immediately kick off the database init. The
// rest of the stuff in here will await the promise, but it'll be basically
// instantaneous for each await after the database is initialized.
const ensureDatabaseExists = openDatabase().then(async (db) => {
  // Not modeling these tables in Django because they should not be part of the
  // product in the longterm. Maybe. It's possible that we will decide to cache
  // GHWO data from the API, but we're not caching anything else besides alerts
  // so that will probably be a whole conversation if it ever comes up. Anyway,
  // working on the assumption that these tables will eventually go away, I'm
  // not capturing them in our data models.
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
});

export const startGHWOProcessing = async () => {
  if (isMainThread) {
    // Make sure the database is initialized.
    await ensureDatabaseExists;

    const worker = new Worker(path.join(import.meta.dirname, "background.js"));

    worker.on("message", ({ action, level, message }) => {
      switch (action) {
        case "log":
          backgroundLogger[level]?.(message);
          if (!backgroundLogger[level]) {
            logger.error(`Attempted to write to invalid log level: '${level}'`);
            logger.error("Received message:");
            logger.error(message);
          }
          break;

        case "block":
          blocked.add(message);
          break;

        case "unblock":
          blocked.delete(message);
          break;

        default:
          break;
      }
    });

    let restartTimer = null;

    const restart = () => {
      // We can get the exit event two or more times for the same background
      // process. Wait a few seconds after the last exit/error event before
      // restarting so we don't end up with multiples of our background worker.
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      restartTimer = setTimeout(() => {
        startGHWOProcessing();
      }, 5_000);
    };

    // If our background thread stops, restart it.
    worker.on("exit", restart);
    worker.on("error", (e) => {
      backgroundLogger.error(e);
      restart();
    });

    // Make it go. Otherwise it won't go.
    worker.postMessage({
      action: "start",
    });
  }
};
startGHWOProcessing();

export const getGHWOData = async (id) => {
  try {
    // Make sure the database is initialized.
    await ensureDatabaseExists;

    const db = await openDatabase();
    const data = await db.query(
      "SELECT data FROM weathergov_temp_ghwo WHERE id=$1::text",
      [id.toUpperCase()],
    );

    if (data.rows.length) {
      return data.rows[0];
    }
    return { error: `No GHWO found for ${id}`, status: 404 };
  } catch (e) {
    logger.error(`Error fetching GHWO for ${id}`);
    logger.error(e);
    return { error: `Error fetching GHWO for ${id}` };
  }
};
