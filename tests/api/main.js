import express from "express";
import proxyToApi from "./proxy.js";
import serveLocally from "./local.js";

const app = express();
const port = process.env.PORT ?? 8081;

let serveLocalFiles = true;
let record = false;
let bundle = false;
let bundleTimer = false;

app.get("*", (req, res) => {
  if (req.path === "/no-local") {
    serveLocalFiles = false;
    res.write("Locally-served files are now disabled");
    console.log("Locally-served files are now disabled");
    res.end();
    return;
  }

  if (req.path === "/local") {
    serveLocalFiles = true;
    res.write("Locally-served files are now enabled");
    console.log("Locally-served files are now enabled");
    res.end();
    return;
  }

  if (req.path === "/record") {
    record = !record;
    res.write(`Recording is now ${record ? "en" : "dis"}abled`);
    console.log(`Recording is now ${record ? "en" : "dis"}abled`);
    res.end();
    return;
  }

  if (req.path === "/bundle") {
    bundle = true;
    res.write("The next sequence of requests will be recorded and bundled");
    console.log("The next sequence of requests will be recorded and bundled");
    res.end();
    return;
  }

  if (bundle) {
    clearTimeout(bundleTimer);
    bundleTimer = setTimeout(() => {
      bundle = false;
    }, 3_000);
  }

  if (bundle || !serveLocalFiles) {
    proxyToApi(req, res, { bundle });
  } else {
    serveLocally(req, res, { bundle, record });
  }
});

app.listen(port, () => {
  console.log(`Now listening on ${port}`);
});
