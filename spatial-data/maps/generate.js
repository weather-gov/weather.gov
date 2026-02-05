const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { Client } = require("pg");

const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

// Do pathing based on the location of *this* file, not where it was executed
// from.
const srcPath = path.dirname(require.main.filename);
const outputPath = path.resolve(
  srcPath,
  "../../forecast/frontend/assets/images/wfos/",
);

async function main() {
  // Slice off Node executable and script, keep just the args.
  const args = process.argv.slice(2);

  const db = new Client({
    user: args[0] ?? "drupal",
    password: args[1] ?? "drupal",
    database: args[2] ?? "weathergov",
    host: args[3] ?? process.env.DB_HOST ?? "database",
    port: args[4] ?? 5432,
  });
  await db.connect();

  const { rows: wfos } = await db.query(
    `SELECT wfo,ST_ASGEOJSON(shape) shape FROM weathergov_geo_cwas`,
  );
  // We don't need the DB connection anymore, but rather than wait here, we can
  // continue with other stuff and await it later.
  const dbEnd = db.end();

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = pathToFileURL(path.join(srcPath, "template.html")).href;
  await page.goto(url);

  // For each WFO, we'll load the template file, call its global draw function
  // passing in the WFO's GeoJSON, and save a screenshot of the resulting map
  // to disk.
  for await (const { wfo, shape } of wfos) {
    await page.reload();
    await sleep(500);

    await page.evaluate((geojson) => {
      window.draw(geojson);
    }, JSON.parse(shape));
    await sleep(3_000);

    const map = await page.$("#map");
    await map.screenshot({ path: path.join(outputPath, `${wfo}.png`) });
  }

  // Wait for the database and browser to fully close.
  await Promise.all([dbEnd, browser.close()]);
}

main();
