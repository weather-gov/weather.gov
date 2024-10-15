import dayjs from "dayjs";
import fs from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

const getRelativeTimestamp = (str) => {
  if (!str) {
    return str;
  }
  const now = dayjs();

  // Timestamps can be in ISO8601 duration format which Dayjs can't parse, so
  // preemptively split them up.
  const [timestamp, duration] = str.split("/");

  const time = dayjs(timestamp);
  if (time.isValid()) {
    const relativeStr = ["date:now"];

    // Get the number of seconds difference between the timestamp and now, and
    // tack that on to the magic timestamp we end up saving
    const secondsDiff = time.diff(now, "seconds");
    relativeStr.push(`${secondsDiff >= 0 ? "+" : ""}${secondsDiff} seconds`);

    // If we had a duration, put it back now.
    if (duration) {
      relativeStr.push(`/ ${duration}`);
    }

    return relativeStr.join(" ");
  }

  return str;
};

const replaceTimestamps = (obj) => {
  const replaced = JSON.parse(JSON.stringify(obj ?? {}));
  if (typeof replaced !== "object") {
    return obj;
  }

  // These are the time properties that we want to update.
  const timeProperties = new Set([
    "effective",
    "ends",
    "endTime",
    "expires",
    "onset",
    "sent",
    "startTime",
    "timestamp",
    "generatedAt",
    "updated",
    "updateTime",
    "validTime",
    "validTimes",
  ]);

  Object.entries(replaced).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      replaced[key] = value.map((v) => replaceTimestamps(v));
    } else if (typeof value === "object" && value !== null) {
      replaced[key] = replaceTimestamps(value);
    } else if (timeProperties.has(key)) {
      replaced[key] = getRelativeTimestamp(value);
    }
  });

  return replaced;
};

export default async (request, response, output) => {
  // Prevent path traversal.
  if (request.path.includes("..")) {
    response.end();
    return;
  }

  const requestID = request.headers["wx-gov-response-id"];

  if (!requestID) {
    return;
  }

  // If we are bundling and this request ID is the same as our bundle ID, then
  // save it to the bundle folder. Otherwise put it in the normal place.
  const dataPath = `./data/bundle_${requestID}`;

  // Put the query string back together.
  const query = Object.entries(request.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // The file path is the request path plus the query string, if any.
  const filePath = `${path.join(dataPath, request.path)}${
    query.length > 0 ? "__" : ""
  }${query}.json`;

  const contentType = response.headers["content-type"].replace(/\/geo\+/, "/");

  if (response.statusCode >= 200 && /^application\/.+json$/.test(contentType)) {
    console.log(`SAVE:     saving response to ${filePath}`);

    // Make the directory structure if necessary, then write out the
    // formatted JSON.
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const fixedUp = replaceTimestamps(JSON.parse(output));

    const json = await format(JSON.stringify(fixedUp), { parser: "json" });
    await fs.writeFile(filePath, json, {
      encoding: "utf-8",
    });
  }
};
