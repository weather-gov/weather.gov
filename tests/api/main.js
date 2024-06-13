import fs from "node:fs/promises";
import express from "express";
import path from "node:path";
import proxyToApi from "./proxy.js";
import config from "./config.js";
import serveBundle from "./serve.js";

const app = express();
const port = process.env.PORT ?? 8081;

const fsExists = async (filePath) =>
  fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

const ui = async ({ error = false } = {}) => {
  const lines = ["<html>"];

  lines.push(`<span>'now' is set to <time>${config.now}</time></span><br/>`);

  if (error) {
    lines.push(`<h2>${error}</h2>`);
  }

  if (config.bundling) {
    lines.push("Currently recording new bundles");
    lines.push(`<br><a href="/stop">Stop recording</a>`);
    lines.push("<br><br>");
  } else if (config.play) {
    const points = await fs.readdir(path.join("./data", config.play, "points"));
    const targets = await Promise.all(
      points.map(async (p) => {
        const target = JSON.parse(
          await fs.readFile(path.join("./data", config.play, "points", p)),
        );
        const name = target["@bundle"]?.name ?? p;
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
        const link = `${hostName}/point/${path.basename(p, ".json").split(",").join("/")}`;

        return { name, attributes, grid, point: p.replace(".json", ""), link };
      }),
    );

    lines.push(`Currently playing bundle <strong>${config.play}</strong>`);
    if (targets.length) {
      lines.push("<br><br>Points in the bundle:");
      lines.push("<ul>");
      targets.forEach(({ name, attributes, grid, point, link }) => {
        lines.push(
          `<li><a href="${link}">${name}</a> (${point} | ${grid.wfo} / ${grid.x}, ${grid.y})`,
        );

        if (Array.isArray(attributes) && attributes.length > 0) {
          lines.push("<ul>");
          lines.push(attributes.map((v) => `<li>${v}</li>`).join(""));
          lines.push("</ul>");
        }
        lines.push(`</li>`);
      });
      lines.push("</ul>");
    }
    lines.push(`<br><a href="/stop">Stop playing</a>`);
    lines.push("<br><br>");
  } else {
    lines.push(`Not playing a bundle. Sending requests through.`);
    lines.push("<br><br>");
  }

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

  lines.push("Available bundles:");
  lines.push(
    `<ul><li>${bundles.map((p) => `<a href="/play/${p}">${p}</a>`).join("</li><li>")}</li></ul>`,
  );

  if (!config.bundling && !process.env.CLOUDGOV_PROXY) {
    lines.push(`<a href="/bundle">record bundles</a>`);
  }

  lines.push("</html>");
  return lines.join("");
};

app.get("/set-now", async (req, res) => {
  config.now = req.query.t || null;
  res.redirect("/");
  return;
});

app.get("*", async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  if (req.path === "/") {
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

  if (/^\/bundle\/?$/.test(req.path) && !process.env.CLOUDGOV_PROXY) {
    config.play = false;
    config.bundling = true;
    // res.write("The next sequence of requests will be recorded and bundled");
    // console.log("The next sequence of requests will be recorded and bundled");
    // res.end();
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
