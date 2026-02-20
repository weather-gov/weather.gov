import fs from "node:fs/promises";
import path from "node:path";
import logger from "./logger.js";
import RelativeDate from "./RelativeDate.js";
import SerializableMap from "./SerializableMap.js";

export const localData = new Map();
const dataLogger = logger.child({ subsystem: "data service" });

const setRelativeDates = (obj) => {
  if (!obj.entries) {
    return obj;
  }

  for (const [key, value] of obj.entries()) {
    const realKey = /^date:\S+/.test(key) ? new RelativeDate(key) : key;
    if (realKey !== key) {
      obj.set(realKey, value);
      obj.delete(key);
    }

    if (Array.isArray(value)) {
      value.forEach(setRelativeDates);
    } else if (typeof value === "object" && value !== null) {
      setRelativeDates(value);
    } else if (/^date:\S+/.test(value)) {
      obj.set(realKey, new RelativeDate(value));
    }
  }

  return obj;
};

const loadFromDirectory = async (dir, parent) => {
  const contents = await fs.readdir(dir, { withFileTypes: true });
  const promises = [];

  for await (const item of contents) {
    if (item.isDirectory()) {
      promises.push(
        loadFromDirectory(
          path.join(dir, item.name),
          path.join(parent, item.name),
        ),
      );
    } else {
      const resourcePath = path.join(
        parent,
        item.name.replace("__", "?").replace(/\.json$/, ""),
      );
      const response = await fs
        .readFile(path.join(dir, item.name))
        .then(JSON.parse)
        .then(SerializableMap.fromObj)
        .then(setRelativeDates);

      localData.set(`/${resourcePath}`, response);
    }
  }
};

const activeBundle = (() => {
  let bundle = null;
  return {
    get() {
      return bundle;
    },
    set(value) {
      bundle = value;
    },
  };
})();

(async () => {
  // Watch for changes in the proxy data. If the active bundle changed,
  // reload it. Otherwise, no need to do anything.
  const watcher = fs.watch("./data", { recursive: true });
  for await (const event of watcher) {
    const bundle = event.filename.split("/").shift();
    if (bundle === activeBundle.get()) {
      dataLogger.trace({ bundle }, "reloading bundle due to file changes");
      loadBundle(bundle);
    }
  }
})();

export const loadBundle = async (bundle) => {
  dataLogger.trace({ bundle }, "switching to bundle");
  activeBundle.set(bundle);
  const bundlePath = path.join("./data", bundle);
  localData.clear();

  try {
    const dirs = await fs.readdir(bundlePath, { withFileTypes: true });
    await Promise.all(
      dirs.map((dir) => {
        if (dir.isDirectory()) {
          return loadFromDirectory(path.join(bundlePath, dir.name), dir.name);
        }
      }),
    );
  } catch (e) {}
};
