import express from "express";
import markdownIt from "markdown-it";
import mustache from "mustache";
import fs from "node:fs/promises";
import path from "node:path";
import config from "./config.js";
import { loadBundle } from "./data.js";
import logger from "./logger.js";
import getProductInfo from "./products.js";
import proxyToApi from "./proxy.js";
import save from "./save.js";
import serveBundle from "./serve.js";

const mainLogger = logger.child({ subsystem: "main" });

const app = express();
const port = process.env.PORT ?? 8081;

const fsExists = async (filePath) =>
  fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

const getPlayingMetadata = async () => {
  try {
    const metaPath = path.join("./data", config.play, "@meta.json");
    const meta = await fsExists(metaPath).then((exists) => {
      if (exists) {
        return fs.readFile(metaPath).then(JSON.parse);
      }
      return null;
    });

    const metadata = {};

    if (meta && meta.description) {
      metadata.description = meta.description;
    }

    const descPath = path.join("./data", config.play, "@description.md");
    const md = await fsExists(descPath).then((exists) => {
      if (exists) {
        return fs.readFile(descPath, { encoding: "utf-8" });
      }
      return null;
    });

    if (md) {
      const markdown = markdownIt();
      metadata.description = markdown.render(md);
    }

    return metadata;
  } catch (e) {
    return {};
  }
};

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
  const metadata = config.play ? await getPlayingMetadata() : {};

  return mustache.render(template, {
    error,
    config,
    points,
    delay: config.delay ?? 0,
    products: bundleProducts,
    metadata,
    bundles,
    isLocal,
  });
};

app.get("/set-now", async (req, res) => {
  config.now = req.query.t || null;
  res.redirect("/");
});

app.get("/set-delay", async (req, res) => {
  config.delay = Number.parseInt(req.query.ms) || 0;
  res.redirect("/");
  res.send();
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
    await loadBundle(bundle);
    config.play = bundle;
    res.redirect("/");
    res.end();
    return;
  }

  res.setHeader("Content-Type", "text/html");
  res.write(await ui({ error: `I don't have a bundle ${bundle}` }));
  res.end();
});

app.get("/proxy/add-point", async (req, res) => {
  const output = await save(req, res, false);
  if (output.error) {
    res.setHeader("Content-Type", "text/html");
    res.write(await ui(output));
    res.end();
  }
});

app.get("/proxy/bundle", async (req, res) => {
  const output = await save(req, res, true);
  if (output.error) {
    res.setHeader("Content-Type", "text/html");
    res.write(await ui(output));
    res.end();
  }
});

app.get("*any", async (req, res) => {
  // If there are any double-dots in the path, that could result in a path
  // traversal, so just eat it here and go straight to the UI.
  if (req.path === "/" || /\.\./.test(req.path)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.write(await ui());
    res.end();
    return;
  }

  mainLogger.trace({ path: req.originalUrl || undefined }, "incoming request");

  if (config.play) {
    serveBundle(req, res);
  } else {
    proxyToApi(req, res);
  }
});

app.listen(port, () => {
  mainLogger.info({ port }, "Now listening");
  mainLogger.info(
    { localService: config.localService },
    "Locally-served files",
  );
  mainLogger.info({ recording: config.recording }, "Recording");
});
