import fs from "node:fs/promises";
// eslint-disable-next-line import/no-unresolved
import express from "express";
import path from "node:path";
import mustache from "mustache";
import proxyToApi from "./proxy.js";
import config from "./config.js";
import serveBundle from "./serve.js";
import getProductInfo from "./products.js";
import save from "./save.js";

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
          hostName = "https://weathergov-test.app.cloud.gov";
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
    ? await getProductInfo("./data", config.play)
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

app.get(/\/proxy\/stop\/?/, async (_, res) => {
  config.play = false;
  res.redirect("/");
  res.end();
});

app.get("/proxy/play/:bundle", async (req, res) => {
  // Prevent path traversals by only getting the very last component of whatever
  // was passed in. This is the target bundle name.
  const bundle = path.basename(req.params.bundle);
  const exists = await fsExists(path.join("./data", bundle));
  if (exists) {
    config.play = bundle;
    res.redirect("/");
    res.end();
    return;
  }

  res.write(await ui({ error: `I don't have a bundle ${bundle}` }));
  res.end();
});

app.get("/proxy/add-point", async (req, res) => {
  const output = await save(req, res, false);
  if (output.error) {
    res.write(await ui(output));
    res.end();
  }
});

app.get("/proxy/bundle", async (req, res) => {
  const output = await save(req, res, true);
  if (output.error) {
    res.write(await ui(output));
    res.end();
  }
});

app.get("*any", async (req, res) => {
  // If there are any double-dots in the path, that could result in a path
  // traversal, so just eat it here and go straight to the UI.
  if (req.path === "/" || /\.\./.test(req.path)) {
    res.write(await ui());
    res.end();
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
