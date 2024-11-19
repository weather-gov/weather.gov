const path = require("node:path");
const chalk = require("chalk");
const { downloadAndUnzip, unzip } = require("./lib/prep.js");

const metadata = require("./lib/meta.js");
const updateTable = require("./lib/update.js");

async function main() {
  const meta = await metadata();

  const dataUrls = {
    states: [
      "https://www.weather.gov/source/gis/Shapefiles/County/s_05mr24.zip",
    ],
    counties: [
      "https://www.weather.gov/source/gis/Shapefiles/County/c_05mr24.zip",
    ],
    cwas: ["https://www.weather.gov/source/gis/Shapefiles/WSOM/w_05mr24.zip"],
    zones: [
      "https://www.weather.gov/source/gis/Shapefiles/WSOM/z_05mr24.zip",
      "https://www.weather.gov/source/gis/Shapefiles/WSOM/fz05mr24.zip",
    ],
  };
  const dataZips = { places: ["us.cities500.txt.zip"] };

  const urls = [];
  const zips = [];

  let hasUpdates = false;

  for (const { target, update } of meta) {
    if (update) {
      hasUpdates = true;
      if (dataUrls[target]) {
        urls.push(...dataUrls[target]);
      }
      if (dataZips[target]) {
        zips.push(...dataZips[target]);
      }
    }
  }

  if (!hasUpdates) {
    console.log(chalk.green("Everything is already up-to-date. Stopping!"));
    // return;
  }

  if (urls.length) {
    console.log("━━━━━━ Downloading needed data ━━━━━");
    for await (const url of urls) {
      await downloadAndUnzip(url);
    }
  }

  if (zips.length) {
    console.log("━━━━━━ Decompressing local data ━━━━━");
    for await (const zip of zips) {
      await unzip(path.join("./data", zip));
    }
  }

  for await (const updateMetadata of meta) {
    if (updateMetadata.update) {
      await updateTable(updateMetadata);
    }
  }
}

main();
