import Location, { PermissionDeniedLocationError } from "./lib/location.js";
import log from "./lib/log.js";
import getObservations from "./lib/observations.js";

const main = async () => {
  try {
    log("Getting location...");
    const location = await Location.get();
    const {
      coords: { latitude, longitude },
    } = location;
    log(`> got ${latitude}, ${longitude}`);

    const observations = await getObservations(latitude, longitude);
    log(
      `> got observations from ${observations.wfo} (${observations.stationName})`
    );

    log(`> ${observations.timestamp.toLocaleString()}`);
    log(`> ${observations.temperature}°F`);
  } catch (e) {
    log(`ERROR: ${e.message}`);
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
