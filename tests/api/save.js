import dayjs from "dayjs";
import fs from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import config from "./config.js";

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

const apiFetchAndSave = async (urlPath, savePath) => {
  const url = URL.parse(urlPath, "https://api.weather.gov");
  const data = await fetch(url).then((r) => r.json());

  const search = url.search ? `__${url.search.slice(1)}` : "";

  const filePath = `${path.join(savePath, urlPath)}${search}.json`;

  if (urlPath.startsWith("/points/")) {
    const { city, state } = data.properties.relativeLocation.properties;

    data["@bundle"] = {
      name: `${city}, ${state}`,
    };
  }

  const fixedTimes = replaceTimestamps(data);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  fs.writeFile(
    filePath,
    await format(JSON.stringify(fixedTimes), { parser: "json" }),
  );

  return fixedTimes;
};

const savePoint = async (lat, lon) => {
  if (!config.play) {
    return {
      error:
        "Not currently playing a bundle, so I don't know where to save this point.",
    };
  }

  const dataPath = `./data/${config.play}`;

  const point = await apiFetchAndSave(`/points/${lat},${lon}`, dataPath);

  const wfo = point.properties.gridId.toUpperCase();
  const { gridY, gridX } = point.properties;

  const fetching = [
    apiFetchAndSave(`/gridpoints/${wfo}/${gridX},${gridY}`, dataPath),
    apiFetchAndSave(`/gridpoints/${wfo}/${gridX},${gridY}/forecast`, dataPath),
    apiFetchAndSave(
      `/gridpoints/${wfo}/${gridX},${gridY}/forecast/hourly`,
      dataPath,
    ),
    apiFetchAndSave(
      `/gridpoints/${wfo}/${gridX},${gridY}/stations`,
      dataPath,
    ).then(async (stations) => {
      const stationID1 = stations.features[0].properties.stationIdentifier;
      const stationID2 = stations.features[1].properties.stationIdentifier;
      const stationID3 = stations.features[2].properties.stationIdentifier;

      return Promise.all([
        apiFetchAndSave(
          `/stations/${stationID1}/observations?limit=1`,
          dataPath,
        ),
        apiFetchAndSave(
          `/stations/${stationID2}/observations?limit=1`,
          dataPath,
        ),
        apiFetchAndSave(
          `/stations/${stationID3}/observations?limit=1`,
          dataPath,
        ),
      ]);
    }),
  ];

  await Promise.all(fetching);
  return {};
};

const saveBundle = async (lat, lon) => {
  config.play = `${Date.now()}`;
  const dataPath = `./data/${config.play}`;
  const output = await savePoint(lat, lon);

  if (output.error) {
    return output;
  }

  await apiFetchAndSave("/alerts/active?status=actual", dataPath);
  return {};
};

export default async (req, res, saveAsBundle) => {
  if (saveAsBundle === undefined) {
    throw new TypeError("saveAsBundle must be set");
  }

  const saveMethod = saveAsBundle ? saveBundle : savePoint;

  const target = URL.parse(req.url, "http://localhost:8081").searchParams.get(
    "url",
  );

  const [, lat, lon] =
    target.match(/\/point\/(-?\d+\.\d+)\/(-?\d+\.\d+)/) ?? [];

  if (!Number.isNaN(+lat) && !Number.isNaN(+lon)) {
    const output = await saveMethod(+lat, +lon);
    if (output.error) {
      return output;
    }
    res.redirect(302, "/");

    res.end();
  } else {
    return {
      error: "Invalid latitude and longitude in requested point.",
    };
  }

  return {};
};
