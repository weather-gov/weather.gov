import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";
import { createLogger } from "../../util/monitoring/index.js";
import paragraphSquash from "../../util/paragraphSquash.js";
import { openDatabase } from "../db.js";
import alertKinds from "./kinds.js";
import {
  parseDescription,
  parseDuration,
  parseLocations,
} from "./parse/index.js";
import sort from "./sort.js";
import { generateAlertGeometry } from "./geometry.js";

const logger = createLogger("alerts");
const cachedAlerts = [];

const metadata = {
  error: false,
  updated: null,
};

export const updateAlerts = async () => {
  logger.verbose("updating alerts");
  const rawAlerts = await fetchAPIJson("/alerts/active?status=actual").then(
    ({ error, features }) => {
      if (error) {
        return { error: true };
      }
      return features.map((feature) => {
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

  if (rawAlerts.error) {
    metadata.error = true;
    return metadata;
  }

  const db = await openDatabase();

  logger.verbose(`got ${rawAlerts.length} alerts`);
  const alerts = [];

  for await (const rawAlert of rawAlerts) {
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

    alerts.push(alert);

    alert.id = alerts.length;
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

    alert.geometry = await generateAlertGeometry(db, rawAlert);
  }

  alerts.sort(sort);

  cachedAlerts.length = 0;
  cachedAlerts.push(...alerts);
  metadata.updated = dayjs();
  metadata.error = false;

  await db.end();

  logger.verbose(`storing ${cachedAlerts.length} alerts`);
  return cachedAlerts;
};

updateAlerts();

// Update the alerts every 30 seconds. They are cached upstream for about a
// minute, so there's no need to try much more often than this.
//
// Tell Node not to keep a reference to this timer. Otherwise, Node will think
// the process is still active forever. This is not an issue in production,
// where we don't want the process to end, but in testing, we want the process
// to quit cleanly when the Mocha tests are finished.
setInterval(updateAlerts, 30_000).unref();

export default async ({ grid, point, place: { timezone } }) => {
  let geometry;

  if (grid.error) {
    logger.warn("no grid; falling back to point");
    logger.verbose(`getting alerts for ${point.latitude}, ${point.longitude}`);
    geometry = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
    };
  } else {
    logger.verbose(`getting alerts for ${grid.wfo} ${grid.x} ${grid.y}`);
    geometry = grid.geometry;
  }
  const location = `ST_GEOMFROMGEOJSON('${JSON.stringify(geometry)}')`;
  const db = await openDatabase();

  const alerts = [];
  for await (const alert of cachedAlerts) {
    if (alert.geometry) {
      const sql = `
      SELECT ST_INTERSECTS(
        ${location},
        ST_GEOMFROMGEOJSON('${JSON.stringify(alert.geometry)}')
      ) as yes`;
      const [{ yes }] = await db.query(sql);

      if (yes > 0) {
        alert.duration = parseDuration(alert, timezone);
        alert.timing = {
          start: alert.onset.tz(timezone).format("dddd MM/DD h:mm A __"),
          end: alert.finish?.tz(timezone).format("dddd MM/DD h:mm A __"),
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

  await db.end();
  logger.verbose(`got ${alerts.length} alerts; highest is ${highest?.text}`);

  // Clone the cached stuff so external entities can't overwrite it. Also so
  // external references aren't modified unexpectedly mid-request.
  return {
    items: [...alerts],
    highestLevel: highest?.text,
    metadata: { ...metadata },
  };
};
