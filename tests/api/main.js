import express from "express";
import proxyToApi from "./proxy.js";
import config from "./config.js";
import serveLocally from "./local.js";

const app = express();
const port = process.env.PORT ?? 8081;

app.get("*", (req, res) => {
  if (req.path === "/no-local") {
    config.localService = false;
    res.write("Locally-served files are now disabled");
    console.log("Locally-served files are now disabled");
    res.end();
    return;
  }

  if (req.path === "/local") {
    config.localService = true;
    res.write("Locally-served files are now enabled");
    console.log("Locally-served files are now enabled");
    res.end();
    return;
  }

  if (req.path === "/record") {
    config.toggleRecording();
    res.write(`Recording is now ${config.recording ? "en" : "dis"}abled`);
    console.log(`Recording is now ${config.recording ? "en" : "dis"}abled`);
    res.end();
    return;
  }

  if (req.path === "/bundle") {
    config.bundling = true;
    res.write("The next sequence of requests will be recorded and bundled");
    console.log("The next sequence of requests will be recorded and bundled");
    res.end();
    return;
  }

  const query = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  console.log(`REQUEST:  ${req.path}${query.length > 0 ? `?${query}` : ""}`);

  if (!config.localService) {
    proxyToApi(req, res);
  } else {
    serveLocally(req, res);
  }
});

app.listen(port, () => {
  console.log(`Now listening on ${port}`);
  console.log(`Locally-served files is ${serveLocalFiles ? "en" : "dis"}abled`);
  console.log(`Recording is ${record ? "en" : "dis"}abled`);
});
