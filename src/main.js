import Location, { PermissionDeniedLocationError } from "./lib/location.js";
import setupServiceWorker from "./lib/setupServiceWorker.js";
import { getFromLocation } from "./lib/api/location.js";
import "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js";

const main = async () => {
  setupServiceWorker();

  try {
    const {
      coords: { latitude, longitude },
    } = await Location.get();
    document.querySelector("preload").innerText =
      "Got your location. Fetching weather...";

    const loc = await getFromLocation(latitude, longitude);
    document.querySelector("preload").setAttribute("class", "hidden");
    document.querySelector("main").setAttribute("class", "");

    document.getElementById(
      "place_name"
    ).innerText = `Conditions for ${loc.place}`;

    loc.observations.then((o) => {
      document.getElementById("obs_text").innerText = o.text;

      document.getElementById(
        "obs_temperature"
      ).innerText = `${o.temperature}°F`;

      document.getElementById(
        "obs_time"
      ).innerText = `Last updated at ${o.timestamp.toLocaleTimeString("en-US", {
        timeStyle: "short",
      })}`;

      document.getElementById("obs_loc").innerText = `at ${
        o.stationName
      } (about ${Math.round(o.distanceFrom(latitude, longitude))} miles away)`;
    });

    loc.hourlyForecast.then((forecast) => {
      const thisHour = new Date().getHours();
      const start = forecast.hours.findIndex(
        ({ valid: { start } }) => start.getHours() === thisHour
      );

      const hours = forecast.hours.slice(start, start + 25);

      const temps = hours.map((hourly) => hourly.temperature);

      new Chart(document.getElementById("hourly_temp_canvas"), {
        type: "line",
        data: {
          labels: hours.map((hourly) => {
            const h = hourly.valid.start.getHours();
            const ampm = h >= 12 ? "pm" : "am";
            const hour = h > 12 ? h - 12 : h;

            return `${hour > 0 ? hour : 12}:00${ampm}`;
          }),
          datasets: [
            {
              label: "Forecast temperatue",
              data: temps,
            },
          ],
        },
      });
    });
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    document.querySelector("preload").innerText = `Error: ${e.message}`;
    console.log(e);

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
