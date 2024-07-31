const fs = require("node:fs/promises");

const allStations = [];
const getStations = async (url = "https://api.weather.gov/stations") => {
  console.log(`fetching stations for ${url}`);
  const stations = await fetch(url).then((r) => r.json());
  allStations.push(...stations.features);
  if (stations.features.length && stations.pagination?.next) {
    return getStations(stations.pagination.next);
  }
};

const main = async () => {
  await getStations().then(async () => {
    console.log("done");
    console.log(allStations.length);
    fs.writeFile("stations.json", JSON.stringify(allStations));
  });
};
main();