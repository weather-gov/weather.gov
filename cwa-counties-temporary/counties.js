import { Worker } from "node:worker_threads";
import fs from "node:fs/promises";
import mariadb from "mariadb";
import path from "node:path";
import throttle from "@mgwalker/promise-throttle";

const main = async () => {
  const db = await mariadb.createConnection({
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "localhost",
    port: process.env.DB_PORT ?? 3306,
    ssl: { rejectUnauthorized: false },
  });

  const mapping = JSON.parse(await fs.readFile("shapes.json"));

  const backgroundPath = path.join(import.meta.dirname, "background.js");

  const doCWA = async (cwa) =>
    new Promise((resolve) => {
      const worker = new Worker(backgroundPath);
      worker.on("message", async ({ wfo, counties }) => {
        if (wfo !== "dead") {
          mapping[wfo] = counties;
          await fs.writeFile("shapes.json", JSON.stringify(mapping, null, 2));
        }
        worker.terminate();
        resolve();
      });

      worker.postMessage(cwa);
    });

  const cwas = (await db.query("SELECT * FROM weathergov_geo_cwas")).filter(
    ({ wfo }) => !mapping[wfo],
  );
  await db.end();

  throttle(cwas, doCWA, 12);
};

main();

// LWX
// MLB
// PPG
// PHI
