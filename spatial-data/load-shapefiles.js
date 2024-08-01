const { downloadAndUnzip, unzip } = require("./lib/prep.js");

const metadata = require("./lib/meta.js");
const updateSchema = require("./lib/schema.js");

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

  for (const [target, { update }] of Object.entries(meta)) {
    console.log(`Fetching data for ${target}...`);
    if (update) {
      if (dataUrls[target]) {
        urls.push(...dataUrls[target]);
      }
      if (dataZips[target]) {
        zips.push(...dataZips[target]);
      }
    } else {
      console.log(`  already up-to-date; skipping`);
    }
  }

  for await (const url of urls) {
    await downloadAndUnzip(url);
  }

  for await (const zip of zips) {
    await unzip(zip);
  }

  for await (const [source, sourceMetadata] of Object.entries(meta)) {
    if (sourceMetadata.update) {
      console.log(`${source} needs updating...`);
      const importData = await updateSchema(sourceMetadata);
      if (importData) {
        console.log(`  ${source} requires data loading...`);
        await sourceMetadata.metadata.loadData();
      }
    }
  }

  await metadata.update();
}

main();
