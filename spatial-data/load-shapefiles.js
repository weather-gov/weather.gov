const { downloadAndUnzip, unzip } = require("./lib/prep.js");

const metadata = require("./lib/meta.js");
const loadCounties = require("./sources/counties.js");
const loadCWAs = require("./sources/countyWarningAreas.js");
const loadPlaces = require("./sources/places.js");
const loadStates = require("./sources/states.js");
const loadZones = require("./sources/zones.js");

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
  };
  const dataZips = { places: ["us.cities500.txt.zip"] };

  const urls = [];
  const zips = [];

  for (const [target, { update }] of Object.entries(meta)) {
    if (update) {
      if (dataUrls[target]) {
        urls.push(...dataUrls[target]);
      }
      if (dataZips[target]) {
        zips.push(...dataZips[target]);
      }
    } else {
      console.log(`${target} already up-to-date; skipping`);
    }
  }
  if (meta.zones.update) {
    urls.push(
      "https://www.weather.gov/source/gis/Shapefiles/WSOM/z_05mr24.zip",
      "https://www.weather.gov/source/gis/Shapefiles/WSOM/fz05mr24.zip",
    );
  }

  for await (const url of urls) {
    await downloadAndUnzip(url);
  }

  for await (const zip of zips) {
    await unzip(zip);
  }

  if (meta.states.update) {
    await loadStates();
  }
  if (meta.counties.update) {
    await loadCounties();
  }
  if (meta.cwas.update) {
    await loadCWAs();
  }
  if (meta.zones.update) {
    await loadZones();
  }
  if (meta.places.update) {
    await loadPlaces();
  }

  await metadata.update();
}

main();
