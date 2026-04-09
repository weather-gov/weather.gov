import { Worker } from "node:worker_threads";
import path from "node:path";

import { modifyTimestampsForAlert } from "./utils.js";
import { enableBackgroundProcessing } from "../../util/background.js";
import { logger } from "../../util/monitoring/index.js";
import { parseDuration } from "./parse/index.js";
import sort from "./sort.js";
import { AlertsCache } from "./cache.js";
import openDatabase from "../db.js";
import dayjs from "../../util/day.js";

const alertsLogger = logger.child({ subsystem: "alerts" });
const cachedAlerts = new Map();
const alertsCache = new AlertsCache();

const metadata = {
  error: false,
  updated: null,
};

// The background process handles fetching and massaging alerts so they don't
// block the main thread. It handles fetching alerts, writing new alerts to the
// database cache table, and removing stale alerts from the cache table.
export const updateFromBackground = ({ action, level, message }) => {
  switch (action) {
    case "error":
      metadata.error = true;
      break;

    default:
      metadata.updated = dayjs();
      metadata.error = false;
      break;
  }
};

export const startAlertProcessing = async () => {
  if (enableBackgroundProcessing()) {
    alertsCache.db = await openDatabase();

    logger.info("starting background worker");
    const updater = new Worker(
      path.join(import.meta.dirname, "backgroundUpdateTask.js"),
    );
    updater.on("message", updateFromBackground);

    let restartTimer = null,
      isExiting = false;

    process.on("SHUTDOWN", () => {
      isExiting = true;
      clearTimeout(restartTimer);
      updater.postMessage({ action: "SHUTDOWN" });
    });

    const restart = () => {
      // Don't restart if we're trying to shutdown.
      if (isExiting) return;
      // We can get the exit event two or more times for the same background
      // process. Wait a few seconds after the last exit/error event before
      // restarting so we don't end up with multiples of our background worker.
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        startAlertProcessing();
      }, 5_000);
    };

    // If our background thread stops, restart it.
    updater.on("exit", restart);
    updater.on("error", (e) => {
      alertsLogger.error({ err: e });
      restart();
    });

    // Make it go. Otherwise it won't go.
    updater.postMessage({
      action: "start",
      data: [...cachedAlerts.keys()],
    });
  }
};

export const postProcessAlerts = (alerts, { timezone }) => {
  alerts.forEach((alert) => {
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

    alertsLogger.trace({ event: alert.event });
  });

  const highest = alerts
    .map(({ metadata: { level } }) => level)
    .sort((a, b) => {
      const priorityA = a.priority;
      const priorityB = b.priority;

      return priorityB - priorityA;
    })
    .pop();

  alertsLogger.trace(
    { length: alerts.length, highest: highest?.text },
    "processed alerts",
  );

  // Clone the cached stuff so external entities can't overwrite it. Also so
  // external references aren't modified unexpectedly mid-request.
  return {
    items: [...alerts].sort(sort),
    highestLevel: highest?.text,
    metadata: { ...metadata },
  };
};

export const getAlertsForCountyFIPS = async (fips, { timezone }) => {
  const db = await openDatabase();
  alertsCache.db = db;

  const alerts = await alertsCache.getAlertsForCountyFIPS(fips);
  return postProcessAlerts(alerts, { timezone });
};

export const getAlertsForPoint = async ({
  point: { latitude, longitude },
  place: { timezone },
}) => {
  // Open a new database connection
  // (or existing pool instance -- see import)
  const db = await openDatabase();
  alertsCache.db = db;

  const alerts = await alertsCache.getIntersectingAlertsForPoint(
    latitude,
    longitude,
  );

  return postProcessAlerts(alerts, { timezone });
};

export default getAlertsForPoint;
