const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { openDatabase } = require("../lib/db.js");
const { table } = require("../sources/countyWarningAreas.js");

const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const srcPath = path.dirname(require.main.filename);

const outputPath = path.resolve(
  srcPath,
  "../../web/themes/new_weather_theme/assets/images/wfos/",
);

async function main() {
  const db = await openDatabase();

  const url = pathToFileURL(path.join(srcPath, "template.html")).href;

  const wfos = await db.query(
    `SELECT wfo,ST_ASGEOJSON(shape) shape FROM ${table}`,
  );
  const dbEnd = db.end();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);

  for await (const { wfo, shape } of wfos) {
    await page.reload();
    await sleep(500);

    await page.evaluate((geojson) => {
      window.draw(geojson);
    }, shape);
    await sleep(3_000);

    const map = await page.$("#map");
    await map.screenshot({ path: path.join(outputPath, `${wfo}.png`) });
  }

  await Promise.all([dbEnd, browser.close()]);
}
main();
