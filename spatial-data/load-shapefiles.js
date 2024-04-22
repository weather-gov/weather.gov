const { downloadAndUnzip, unzip } = require("./lib/prep.js");

const metadata = require("./lib/meta.js");
const loadCounties = require("./sources/counties.js");
const loadCWAs = require("./sources/countyWarningAreas.js");
const loadPlaces = require("./sources/places.js");
const loadStates = require("./sources/states.js");

async function main() {
  const meta = await metadata();

  const urls = [];
  if (meta.states.update) {
    urls.push(
      "https://www.weather.gov/source/gis/Shapefiles/County/s_05mr24.zip",
    );
  }
  if (meta.counties.update) {
    urls.push(
      "https://www.weather.gov/source/gis/Shapefiles/County/c_05mr24.zip",
    );
  }
  if (meta.cwas.update) {
    urls.push(
      "https://www.weather.gov/source/gis/Shapefiles/WSOM/w_05mr24.zip",
    );
  }

  for await (const url of urls) {
    await downloadAndUnzip(url);
  }

  if (meta.places.update) {
    await unzip("us.cities500.txt.zip");
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
  if (meta.places.update) {
    await loadPlaces();
  }

  await metadata.update();
}

main();
