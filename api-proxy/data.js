import fs from "node:fs/promises";
import path from "node:path";

export const localData = new Map();

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
        .then(JSON.parse);

      localData.set(`/${resourcePath}`, response);
    }
  }
};

export const loadBundle = async (bundle) => {
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
