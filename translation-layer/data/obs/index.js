import { openDatabase } from "../db.js";

const wfos = new Set();
const stations = [];

const loadWFOs = async () => {
  const db = await openDatabase();
  const dbwfos = await db.query("SELECT wfo FROM weathergov_geo_cwas");
  dbwfos.forEach(({ wfo }) => wfos.add(wfo));
  await db.end();
};

const updateObsStations = async () => {
  const newStations = [];

  for await (const wfo of wfos) {
    const office = await fetch(`https://api.weather.gov/offices/${wfo}`).then(
      (r) => r.json(),
    );
    console.log("hi?");
    newStations.push(...office.approvedObservationStations);
  }

  stations.length = 0;
  stations.push(...newStations);

  console.log(stations);
};

loadWFOs().then(() => {
  updateObsStations();
  // Update hourly
  setTimeout(updateObsStations, 3_600_000);
});

export default async ({ point: { latitude, longitude } }) => {
  return "hi hi hi";
};
