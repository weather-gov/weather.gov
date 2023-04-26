import Location, { PermissionDeniedLocationError } from "./lib/location.js";
import log from "./lib/log.js";
import { getValue } from "./lib/convert.js";

const main = async () => {
  try {
    log("Getting location...");
    const location = await Location.get();
    const {
      coords: { latitude, longitude },
    } = location;
    log(`> got ${latitude}, ${longitude}`);

    const r = (n) => Math.round(n * 1000) / 1000;

    log("Fetching location metadata...");
    const metaUrl = `https://api.weather.gov/points/${r(latitude)},${r(
      longitude
    )}`;
    const meta = await fetch(metaUrl).then((r) => r.json());
    log(`> WFO: ${meta.properties.cwa}`);
    log(
      `> place: ${meta.properties.relativeLocation.properties.city}, ${meta.properties.relativeLocation.properties.state}`
    );

    log("Fetching observation stations...");
    const stations = await fetch(meta.properties.observationStations).then(
      (r) => r.json()
    );
    const station = stations.observationStations[0];
    log(`> ${station.split("/").pop()} is first`);

    log("Getting station metadata...");
    await fetch(station)
      .then((r) => r.json())
      .then((meta) => log(`> station: ${meta.properties.name}`));

    log("Fetching observations...");
    const observations = await fetch(`${station}/observations`).then((r) =>
      r.json()
    );
    log("> got observations");
    console.log(observations);

    const mostRecent = observations.features[0].properties;
    log(`> ${Math.round(getValue(mostRecent.temperature))}°F`);
  } catch (e) {
    log(e.message);
    switch (true) {
      case e instanceof PermissionDeniedLocationError:
        // The user has turned location services off or did not permit it
        // for this site right now.
        break;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  main();
});
