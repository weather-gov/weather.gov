import { createHash } from "node:crypto";
import { parentPort } from "node:worker_threads";
import dayjs from "../../util/day.js";
import { modifyTimestampsForAlert } from "./utils.js";
import { fetchAPIJson } from "../../util/fetch.js";
import paragraphSquash from "../../util/paragraphSquash.js";
import openDatabase from "../db.js";
import alertKinds from "./kinds.js";
import { parseDescription, parseLocations } from "./parse/index.js";
import { generateAlertGeometry } from "./geometry.js";
import { AlertsCache } from "./cache.js";

// The hashes of all the active alerts we know about. Anything in this list will
// not be processed in future updates, since we've already captured it.
const KNOWN_ALERTS = new Set();
const alertsCache = new AlertsCache();


export const updateAlerts = async ({ parent = parentPort } = {}) => {
  const now = dayjs();
  parent.postMessage({
    action: "log",
    level: "verbose",
    message: `updating alerts with ${KNOWN_ALERTS.size} known alerts`,
  });

  // The list of alert hashes in the current results from the API. We'll use
  // this to figure out which alerts to remove from KNOWN_ALERTS.
  const theseAlertHashes = new Set();

  const rawAlerts = await fetchAPIJson("/alerts/active?status=actual").then(
    ({ error, features }) => {
      if (error) {
        return { error: true };
      }
      return features.map((feature) => {
        // To uniquely identify alerts, we'll use a hash of the JSON text of the
        // alert properties. Alert ID URNs don't appear to be globally unique,
        // so this should get us to uniqueness.
        const hash = createHash("sha256");
        hash.update(JSON.stringify(feature.properties));
        feature.properties.hash = hash.digest("base64");

        theseAlertHashes.add(feature.properties.hash);

        modifyTimestampsForAlert(feature);

        return feature;
      });
    },
  );

  // If there's an error coming from the API, signal that to the parent thread
  // and stop processing. We'll try again on the next timer tick.
  if (rawAlerts.error) {
    parent.postMessage({ action: "error" });
    return;
  }

  parent.postMessage({
    action: "log",
    level: "verbose",
    message: `got ${rawAlerts.length} alerts from the API`,
  });

  for (const hash of KNOWN_ALERTS) {
    if (!theseAlertHashes.has(hash)) {
      // A previously-known alert is no longer in this update. We should
      // remove it now.
      parent.postMessage({
        action: "log",
        level: "verbose",
        message: `removing alert with hash ${hash}`,
      });
      KNOWN_ALERTS.delete(hash);
      parent.postMessage({ action: "remove", hash });
    }
  }

  const alertsToUpdate = rawAlerts.filter(
    ({ properties: { hash } }) => !KNOWN_ALERTS.has(hash),
  );

  const db = await openDatabase();
  alertsCache.db = db;
  await alertsCache.createTable();

  // NEW
  // Remove any invalid alerts from the cache table
  // (ie alerts in the table that are not present in the current batch)
  const incomingHashes = alertsToUpdate.map(alert => alert.properties.hash);
  await alertsCache.removeInvalidBasedOn(incomingHashes);

  parent.postMessage({
    action: "log",
    level: "verbose",
    message: `got ${alertsToUpdate.length} alerts to update`,
  });

  for await (const rawAlert of alertsToUpdate) {
    const alert = {
      metadata: alertKinds.get(rawAlert.properties.event.toLowerCase()),
    };

    // If we get an alert type that we don't have a mapping for, capture that in
    // logs. Default to a land alert with the lowest priority so we can at least
    // still show it to users.
    if (!alert.metadata) {
      parent.postMessage({
        action: "log",
        level: "warn",
        message: `Unknown alert type: "${rawAlert.properties.event}"`,
      });

      alert.metadata = {
        level: { priority: Number.MAX_SAFE_INTEGER, text: "other" },
        kind: "land",
        priority: Number.MAX_SAFE_INTEGER,
      };

      if (/\bevacuation\b/i.test(rawAlert.properties.event)) {
        // For any alert with the word "evacuation", pin it to the same metadata
        // as the NWS-defined evacuation alert.
        alert.metadata = alertKinds.get("evacuation immediate");
      }
    }

    // For now, we're only ingesting land alerts. Once we get into marine
    // alerts, we'll revisit this, but since we don't know what the use case
    // will be in the future, we'll just leave them out entirely for now.
    if (!alert.metadata || alert.metadata.kind !== "land") {
      parent.postMessage({
        action: "log",
        level: "verbose",
        message: `Ignoring "${rawAlert.properties.event}" - not a land alert`,
      });

      KNOWN_ALERTS.add(rawAlert.properties.hash);
      continue; // eslint-disable-line no-continue
    }

    alert.id = alert.hash; // alerts.length;
    if (rawAlert.properties.id.startsWith("urn:oid:2.49.0.1.840")) {
      alert.id = rawAlert.properties.id.split(".").slice(-3).join("_");
    }

    alert.event = rawAlert.properties.event;

    try {
      const { locations, description } = parseLocations(
        rawAlert.properties.description,
      );

      alert.sender = rawAlert.properties.senderName;
      alert.locations = locations;
      alert.description = parseDescription(description);
      alert.instruction = paragraphSquash(rawAlert.properties.instruction);
    } catch (e) {
      parent.postMessage({
        type: "log",
        level: "error",
        message: `error on alert ${rawAlert.properties.id}`,
      });
      parent.postMessage({ type: "log", level: "error", message: e });
    }

    alert.area = paragraphSquash(rawAlert.properties.areaDesc)
      ?.split(";")
      .map((line) => line.trim());

    alert.sent = rawAlert.properties.sent;
    alert.effective = rawAlert.properties.effective;
    // Sometimes onset is missing. In that case, use the starting time.
    alert.onset = rawAlert.properties.onset ?? alert.effective;
    alert.expires = rawAlert.properties.expires;
    alert.ends = rawAlert.properties.ends;

    // If an alert has an ending time, that is when the alert is over. If the
    // alert doesn't have an end time, try using the expiration time. If that's
    // also missing, then the alert is indefinite.
    alert.finish = alert.ends;
    if (!alert.finish) {
      alert.finish = alert.expires;
    }
    if (!alert.finish) {
      alert.finish = null;
    }

    if (alert.finish && alert.finish.isBefore(now)) {
      KNOWN_ALERTS.add(rawAlert.properties.hash);
      continue; // eslint-disable-line no-continue
    }

    const geometry = await generateAlertGeometry(db, rawAlert);

    // NEW
    // Add the alert to the cache table
    if(geometry){
      await alertsCache.add(rawAlert.properties.hash, alert, geometry);

      parent.postMessage({
        action: "log",
        level: "verbose",
        message: `adding alert with hash ${rawAlert.properties.hash}`,
      });

      parent.postMessage({
        action: "add",
        hash: rawAlert.properties.hash,
        alert,
      });

      KNOWN_ALERTS.add(rawAlert.properties.hash);
    } else {
      parent.postMessage({
        action: "log",
        level: "error",
        message: `Could not determine geometry for alert ${rawAlert.id}`
      });
    }
  }
};

const setTimer = () => {
  setTimeout(async () => {
    await updateAlerts();
    setTimer();
  }, 30_000)
    // Tell Node not to keep a reference to this timer. Otherwise, Node will think
    // the process is still active forever. This is not an issue in production,
    // where we don't want the process to end, but in testing, we want the process
    // to quit cleanly when the Mocha tests are finished.
    .unref();
};

export const start = () => {
  updateAlerts().then(setTimer);
};

if (parentPort) {
  parentPort.on("message", ({ action, data }) => {
    switch (action.toLowerCase()) {
      case "start":
        data.forEach((hash) => {
          KNOWN_ALERTS.add(hash);
        });
        start();
        break;
      default:
        break;
    }
  });
}
