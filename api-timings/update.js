import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { config } from "dotenv";

config();

const API_KEY = process.env.API_KEY;

const commit = async () =>
  new Promise((resolve) => {
    exec(`git add timings.csv && git commit -m "update" && git push`, () => {
      resolve();
    });
  });

const testEndpoints = [
  // single endpoint
  "/forecasts/{lat},{lon}",
  "/forecasts/{lat},{lon}",
  "/forecasts/{lat},{lon}",
  "/forecasts/{lat},{lon}",
  "/forecasts/{lat},{lon}",
  // points
  "/points/{lat},{lon}",
  "/points/{lat},{lon}",
  "/points/{lat},{lon}",
  "/points/{lat},{lon}",
  "/points/{lat},{lon}",
  // gridpoints
  "/gridpoints/SLC/65,12/",
  "/gridpoints/SLC/29,17",
  "/gridpoints/VEF/151,90",
  "/gridpoints/LKN/91,55",
  "/gridpoints/PIH/73,15",
  // daily forecast
  "/gridpoints/BOI/18,66/forecast",
  "/gridpoints/LKN/105,145/forecast",
  "/gridpoints/SLC/111,97/forecast",
  "/gridpoints/VEF/171,56/forecast",
  "/gridpoints/BOI/85,22/forecast",
  // hourly forecast
  "/gridpoints/FGZ/91,36/forecast/hourly",
  "/gridpoints/REV/50,39/forecast/hourly",
  "/gridpoints/MPX/91,36/forecast/hourly",
  "/gridpoints/PIH/106,11/forecast/hourly",
  "/gridpoints/SLC/146,93/forecast/hourly",
  // stations
  "/gridpoints/VEF/59,195/stations?limit=3",
  "/gridpoints/SLC/100,108/stations?limit=3",
  "/gridpoints/REV/66,128/stations?limit=3",
  "/gridpoints/BOI/119,16/stations?limit=3",
  "/gridpoints/FGZ/55,131/stations?limit=3",
  // observations
  "/stations/ITD04/observations?limit=1",
  "/stations/C8738/observations/latest",
  "/stations/KGCN/observations?limit=1",
  "/stations/CMP27/observations/latest",
  "/stations/MJBN2/observations?limit=1",
];

const minLon = -119.316;
const maxLon = -80.284;
const minLat = 35.077;
const maxLat = 41.264;

const main = async () => {
  console.log("updating...");
  const f = await fs.open("./timings.csv", "a+");

  for await (let url of testEndpoints) {
    const lat =
      Math.round((Math.random() * (maxLat - minLat) + minLat) * 1_000) / 1_000;
    const lon =
      Math.round((Math.random() * (maxLon - minLon) + minLon) * 1_000) / 1_000;
    url = url.replace("{lat}", lat).replace("{lon}", lon);

    const start = process.hrtime.bigint();
    const correlationId = await fetch(`https://preview-api.weather.gov${url}`, {
      headers: { "API-Key": API_KEY },
    })
      .then((response) => response.headers.get("x-correlation-id"))
      .catch(() => {});
    const elapsed = (process.hrtime.bigint() - start) / 1_000_000n;

    const line = [correlationId, url, elapsed.toString()].join("\t");
    console.log(`  ${url} checked`);

    await fs.writeFile(f, `\n${line}`);
  }
  await f.close();
  console.log("update finished");
  console.log(new Date());
  await commit();
};

if (import.meta.main) {
  setInterval(
    () => {
      main();
    },
    900_000, // 15 minutes
  );
  main();
}
