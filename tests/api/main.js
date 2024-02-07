import express from "express";
import proxyToApi from "./proxy.js";
import serveLocally from "./local.js";

const app = express();
const port = process.env.PORT ?? 8081;

let serveLocalFiles = true;
let record = false;

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

  if (serveLocalFiles) {
    serveLocally(req, res, { record });
  } else {
    proxyToApi(req, res, { record });
  }
});

app.listen(port, () => {
  console.log(`Now listening on ${port}`);
  console.log(`Locally-served files is ${serveLocalFiles ? "en" : "dis"}abled`);
  console.log(`Recording is ${record ? "en" : "dis"}abled`);
});
