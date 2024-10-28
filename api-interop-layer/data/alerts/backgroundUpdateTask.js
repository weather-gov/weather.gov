import { createHash } from "node:crypto";
import { parentPort } from "node:worker_threads";
import { createLogger } from "../../util/monitoring/index.js";
import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";
import paragraphSquash from "../../util/paragraphSquash.js";
import openDatabase from "../db.js";
import alertKinds from "./kinds.js";
import { parseDescription, parseLocations } from "./parse/index.js";
import { generateAlertGeometry } from "./geometry.js";

const logger = createLogger("alerts (background)");

// The hashes of all the active alerts we know about. Anything in this list will
// not be processed in future updates, since we've already captured it.
const KNOWN_ALERTS = new Set();

export const updateAlerts = async ({ parent = parentPort } = {}) => {
  const now = dayjs();
  logger.verbose("updating alerts");

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

        Object.keys(feature.properties).forEach((key) => {
          const value = feature.properties[key];
          const date = dayjs(value);

          // The day.js parser looks for ANY ISO-8601 valid text in the string
          // and attempts to convert it. As a result, some harmless text ends
          // up getting picked up as valid dates. For example:
          //
          // PLEASE CALL 5-1-1
          //
          // day.js parses that to May 1, 2001. That is obviously not correct.
          // But we know all of our timestamps are *only* ISO8601 strings with
          // full date information, so we can check that the string starts with
          // a YYYY-MM-DD format as well as parsing to a valid day.js object.
          if (date.isValid() && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            feature.properties[key] = date;
          }
        });

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

  logger.verbose(`got ${rawAlerts.length} alerts from the API`);

  for (const hash of KNOWN_ALERTS) {
    if (!theseAlertHashes.has(hash)) {
      // A previously-known alert is no longer in this update. We should
      // remove it now.
      logger.verbose(`removing alert with hash ${hash}`);
      KNOWN_ALERTS.delete(hash);
      parent.postMessage({ action: "remove", hash });
    }
  }

  const alertsToUpdate = rawAlerts.filter(
    ({ properties: { hash } }) => !KNOWN_ALERTS.has(hash),
  );

  const db = await openDatabase();

  logger.verbose(`got ${alertsToUpdate.length} alerts to update`);
  // const alerts = [];

  for await (const rawAlert of alertsToUpdate) {
    KNOWN_ALERTS.add(rawAlert.properties.hash);

    const alert = {
      metadata: alertKinds.get(rawAlert.properties.event.toLowerCase()),
    };

    // If we get an alert type that we don't have a mapping for, capture that in
    // logs. Default to a land alert with the lowest priority so we can at least
    // still show it to users.
    if (!alert.metadata) {
      logger.warn(`Unknown alert type: ${rawAlert.properties.event}`);
      alert.metadata = {
        level: { priority: Number.MAX_SAFE_INTEGER, text: "other" },
        kind: "land",
        priority: Number.MAX_SAFE_INTEGER,
      };
    }

    // For now, we're only ingesting land alerts. Once we get into marine
    // alerts, we'll revisit this, but since we don't know what the use case
    // will be in the future, we'll just leave them out entirely for now.
    if (!alert.metadata || alert.metadata.kind !== "land") {
      logger.verbose(
        `ignoring "${rawAlert.properties.event}" - not a land alert`,
      );
      continue; // eslint-disable-line no-continue
    }

    alert.id = alert.hash; // alerts.length;
    if (rawAlert.properties.id.startsWith("urn:oid:2.49.0.1.840")) {
      alert.id = rawAlert.properties.id.split(".").slice(-3).join("_");
    }

    alert.event = rawAlert.properties.event;

    const { locations, description } = parseLocations(
      rawAlert.properties.description,
    );

    alert.sender = rawAlert.properties.senderName;
    alert.locations = locations;
    alert.description = parseDescription(description);
    alert.instruction = paragraphSquash(rawAlert.properties.instruction);

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
      continue; // eslint-disable-line no-continue
    }

    alert.geometry = await generateAlertGeometry(db, rawAlert);

    logger.verbose(`adding alert with hash ${rawAlert.properties.hash}`);
    parent.postMessage({
      action: "add",
      hash: rawAlert.properties.hash,
      alert,
    });
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
  parentPort.on("message", (message) => {
    switch (message.toLowerCase()) {
      case "start":
        start();
        break;
      default:
        break;
    }
  });
}
