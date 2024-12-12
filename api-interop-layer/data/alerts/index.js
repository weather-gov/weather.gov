import { Worker, isMainThread } from "node:worker_threads";
import path from "node:path";

import { booleanIntersects, buffer, point } from "@turf/turf";
import dayjs from "../../util/day.js";
import { modifyTimestampsForAlert } from "./utils.js";
import { createLogger } from "../../util/monitoring/index.js";
import { parseDuration } from "./parse/index.js";
import sort from "./sort.js";
import { AlertsCache } from "./cache.js";

const logger = createLogger("alerts");
const backgroundLogger = createLogger("alerts (background)");
const cachedAlerts = new Map();
const alertsCache = new AlertsCache();
import openDatabase from "../db.js";

const metadata = {
  error: false,
  updated: null,
};

// The background process handles fetching and massaging alerts so they don't
// block the main thread. It handles fetching alerts, writing new alerts to the
// database cache table, and removing stale alerts from the cache table.
export const updateFromBackground = ({
  action,
  hash,
  alert,
  level,
  message,
}) => {
  switch (action) {
    case "error":
      metadata.error = true;
      break;

    case "log":
      backgroundLogger[level]?.(message);
      if (!backgroundLogger[level]) {
        logger.error(`Attempted to write to invalid log level: '${level}'`);
        logger.error("Received message:");
        logger.error(message);
      }
      break;
    default:
      break;
  }
};

export const startAlertProcessing = async () => {
  // If this is the main thread, fire up the background worker. This should always
  // be the main thread, but if something goes haywire and this script somehow
  // gets loaded in the background worker, don't recursively keep loading it.
  if (isMainThread) {
    // Drop any existing alerts cache table, since that will be repopulated
    // by the first alerts request
    logger.info("dropping any existing alerts cache table");
    alertsCache.db = await openDatabase();
    await alertsCache.dropCacheTable();
    
    logger.info("starting background worker");
    const updater = new Worker(
      path.join(import.meta.dirname, "backgroundUpdateTask.js"),
    );
    updater.on("message", updateFromBackground);

    let restartTimer = null;

    const restart = () => {
      // We can get the exit event two or more times for the same background
      // process. Wait a few seconds after the last exit/error event before
      // restarting so we don't end up with multiples of our background worker.
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      restartTimer = setTimeout(() => {
        startAlertProcessing();
      }, 5_000);
    };

    // If our background thread stops, restart it.
    updater.on("exit", restart);
    updater.on("error", (e) => {
      backgroundLogger.error(e);
      restart();
    });

    // Make it go. Otherwise it won't go.
    updater.postMessage({
      action: "start",
      data: [...cachedAlerts.keys()],
    });
  }
};

export default async ({
  point: { latitude, longitude },
  place: { timezone },
}) => {

  // Open a new database connection
  // (or existing pool instance -- see import)
  const db = await openDatabase();
  alertsCache.db = db;
  
  // Find all alerts within a radius of the location being requested. We're
  // using a quarter mile buffer here.
  const geometry = buffer(point([longitude, latitude]), 0.25, {
    units: "miles",
  });
  
  const alerts = await alertsCache.getIntersectingAlerts(
    JSON.stringify(geometry)
  );
  
  alerts.forEach(alert => {
    // We need to turn all of the relevant timestamp
    // fields back into dayjs objects, in order to sort
    // and perform expiry checks
    modifyTimestampsForAlert(alert);

    // Parse out the correct duration object structure
    alert.duration = parseDuration(alert, timezone);
    alert.timing = {
      start: alert.onset.tz(timezone).format("dddd MM/DD h:mm A z"),
      end: alert.finish?.tz(timezone).format("dddd MM/DD h:mm A z"),
    };

    logger.verbose(`has ${alert.event}`);
  });

  const highest = alerts
    .map(({ metadata: { level } }) => level)
    .sort((a, b) => {
      const priorityA = a.priority;
      const priorityB = b.priority;

      return priorityB - priorityA;
    })
    .pop();

  logger.verbose(`got ${alerts.length} alerts; highest is ${highest?.text}`);

  // Clone the cached stuff so external entities can't overwrite it. Also so
  // external references aren't modified unexpectedly mid-request.
  return {
    items: [...alerts].sort(sort),
    highestLevel: highest?.text,
    metadata: { ...metadata },
  };
};
