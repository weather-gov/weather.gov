import { Worker, isMainThread } from "node:worker_threads";
import path from "node:path";

import { booleanIntersects, buffer, point } from "@turf/turf";
import dayjs from "../../util/day.js";
import { createLogger } from "../../util/monitoring/index.js";
import { parseDuration } from "./parse/index.js";
import sort from "./sort.js";

const logger = createLogger("alerts");
const backgroundLogger = createLogger("alerts (background)");
const cachedAlerts = new Map();

const metadata = {
  error: false,
  updated: null,
};

// The background process handles fetching and massaging alerts so they don't
// block the main thread. It will message us if it encounters a new alert or if
// an alert in its cache is missing from the API results.
export const updateFromBackground = ({
  action,
  hash,
  alert,
  level,
  message,
}) => {
  switch (action) {
    case "add":
      logger.verbose(`adding alert with hash ${hash}`);

      // dayjs objects turn into plain objects when they cross the thread
      // boundary, so we'll look for all of them and convert them back.
      Object.keys(alert).forEach((key) => {
        const value = alert[key];
        if (value?.$isDayjsObject) {
          alert[key] = dayjs(value.$d);
        }
      });

      cachedAlerts.set(hash, alert);
      metadata.updated = dayjs();
      metadata.error = false;
      break;

    case "remove":
      logger.verbose(`removing alert with hash ${hash}`);
      cachedAlerts.delete(hash);
      metadata.updated = dayjs();
      metadata.error = false;
      break;

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

export const startAlertProcessing = () => {
  // If this is the main thread, fire up the background worker. This should always
  // be the main thread, but if something goes haywire and this script somehow
  // gets loaded in the background worker, don't recursively keep loading it.
  if (isMainThread) {
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
  // Find all alerts within a radius of the location being requested. We're
  // using a quarter mile buffer here.
  const geometry = buffer(point([longitude, latitude]), 0.25, {
    units: "miles",
  });

  const alerts = [];
  for await (const [, alert] of cachedAlerts) {
    if (alert.geometry) {
      // Ignore intersections with self. I don't actually understand what that
      // means since any geometry ought to intersect with itself, but if we
      // don't set this, we get a whole bunch of unrelated alerts matching.
      const yes = booleanIntersects(geometry, alert.geometry, {
        ignoreSelfIntersections: true,
      });

      if (yes > 0) {
        alert.duration = parseDuration(alert, timezone);
        alert.timing = {
          start: alert.onset.tz(timezone).format("dddd MM/DD h:mm A z"),
          end: alert.finish?.tz(timezone).format("dddd MM/DD h:mm A z"),
        };

        logger.verbose(`has ${alert.event}`);
        alerts.push(alert);
      }
    }
  }

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
