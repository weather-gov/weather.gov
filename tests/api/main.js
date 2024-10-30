import fs from "node:fs/promises";
// eslint-disable-next-line import/no-unresolved
import express from "express";
import path from "node:path";
import mustache from "mustache";
import proxyToApi from "./proxy.js";
import config from "./config.js";
import serveBundle from "./serve.js";
import * as products from "./products.js";
import { savePoint, saveBundle } from "./save.js";

const app = express();
const port = process.env.PORT ?? 8081;

const fsExists = async (filePath) =>
  fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

const getPointFileInfo = async () => {
  try {
    const pointFiles = await fs.readdir(
      path.join("./data", config.play, "points"),
    );
    if (!pointFiles.length) {
      return [];
    }

    return await Promise.all(
      pointFiles.map(async (pointFile) => {
        const target = JSON.parse(
          await fs.readFile(
            path.join("./data", config.play, "points", pointFile),
          ),
        );
        const name = target["@bundle"]?.name ?? pointFile;
        const attributes = target["@bundle"]?.attributes ?? [];

        const grid = {
          wfo: target.properties.cwa,
          x: target.properties.gridX,
          y: target.properties.gridY,
        };

        let hostName = "http://localhost:8080";
        if (process.env.CLOUDGOV_PROXY) {
          hostName = "https://weathergov-design.app.cloud.gov";
        }
        const link = `${hostName}/point/${path.basename(pointFile, ".json").split(",").join("/")}`;
        const interop = `http://localhost:8082/point/${path.basename(pointFile, ".json").split(",").join("/")}`;

        return {
          name,
          attributes,
          grid,
          point: pointFile.replace(".json", ""),
          link,
          interop,
        };
      }),
    );
  } catch (e) {
    return [];
  }
};

const ui = async ({ error = false } = {}) => {
  const template = await fs.readFile("./index.mustache", { encoding: "utf-8" });

  const contents = await fs
    .readdir("./data")
    .then((files) => files.filter((file) => !file.startsWith(".")));

  const dirs = await Promise.all(
    contents.map(async (file) => {
      const stat = await fs.stat(path.join("./data", file));
      return stat.isDirectory();
    }),
  );

  const bundles = contents.filter((_, i) => dirs[i]);

  const isLocal = !process.env.CLOUDGOV_PROXY;

  const points = config.play ? await getPointFileInfo() : [];
  const bundleProducts = config.play
    ? await products.info("./data", config.play)
    : [];

  return mustache.render(template, {
    error,
    config,
    points,
    products: bundleProducts,
    bundles,
    isLocal,
  });
};

app.get("/set-now", async (req, res) => {
  config.now = req.query.t || null;
  res.redirect("/");
});

app.get("*any", async (req, res) => {
  res.setHeader("Content-Type", "text/html");

  // If there are any double-dots in the path, that could result in a path
  // traversal, so just eat it here and go straight to the UI.
  if (req.path === "/" || /\.\./.test(req.path)) {
    res.write(await ui());
    res.end();
    return;
  }

  if (/^\/stop\/?$/i.test(req.path)) {
    config.play = false;
    config.bundling = false;
    res.write(await ui());
    res.end();
    return;
  }

  if (/^\/play\/.+$/.test(req.path)) {
    const bundle = req.path.split("/").pop();
    const exists = await fsExists(path.join("./data", bundle));
    if (exists) {
      config.play = bundle;
      config.bundling = false;
      res.write(await ui());
      res.end();
      return;
    }

    res.write(await ui({ error: `I don't have a bundle ${bundle}` }));
    res.end();
    return;
  }

  if (/^\/add-point\/?$/.test(req.path) && !process.env.CLOUDGOV_PROXY) {
    const target = URL.parse(req.url, "http://localhost:8081").searchParams.get(
      "url",
    );

    const [, lat, lon] =
      target.match(/\/point\/(-?\d+\.\d+)\/(-?\d+\.\d+)/) ?? [];

    if (!Number.isNaN(+lat) && !Number.isNaN(+lon)) {
      const output = await savePoint(+lat, +lon);
      if (output.error) {
        res.write(await ui(output));
      } else {
        res.redirect(302, "/");
      }
      res.end();
    } else {
      res.write(
        await ui({
          error: "Invalid latitude and longitude in requested point.",
        }),
      );

      res.end();
    }
    return;
  }

  if (/^\/bundle\/?$/.test(req.path) && !process.env.CLOUDGOV_PROXY) {
    const target = URL.parse(req.url, "http://localhost:8081").searchParams.get(
      "url",
    );

    const [, lat, lon] =
      target.match(/\/point\/(-?\d+\.\d+)\/(-?\d+\.\d+)/) ?? [];

    if (!Number.isNaN(+lat) && !Number.isNaN(+lon)) {
      const output = await saveBundle(+lat, +lon);
      if (output.error) {
        res.write(await ui(output));
      } else {
        res.redirect(302, "/");
      }
      res.end();
    } else {
      res.write(
        await ui({
          error: "Invalid latitude and longitude in requested point.",
        }),
      );
      res.end();
    }
    return;
  }

  const query = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  console.log(`REQUEST:  ${req.path}${query.length > 0 ? `?${query}` : ""}`);

  if (config.play) {
    serveBundle(req, res);
  } else {
    proxyToApi(req, res);
  }
});

app.listen(port, () => {
  console.log(`Now listening on ${port}`);
  console.log(
    `Locally-served files is ${config.localService ? "en" : "dis"}abled`,
  );
  console.log(`Recording is ${config.recording ? "en" : "dis"}abled`);
});
