import fs from "node:fs/promises";

const testEndpoints = [
  // points
  "/points/36.077,-111.316",
  "/points/36.077,-112.316",
  "/points/38.077,-113.316",
  "/points/41.077,,-115.316",
  "/points/41.077,-118.316",
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

const main = async () => {
  console.log("updating...");
  const f = await fs.open("./timings.csv", "a+");

  for await (const url of testEndpoints) {
    const start = process.hrtime.bigint();
    const correlationId = await fetch(`https://api.weather.gov${url}`)
      .then((response) => response.headers.get("x-correlation-id"))
      .catch(() => {});
    const elapsed = (process.hrtime.bigint() - start) / 1_000_000n;

    const line = [correlationId, url, elapsed.toString()].join("\t");
    console.log(`  ${url} checked`);

    await fs.writeFile(f, `\n${line}`);
  }
  await f.close();
  console.log("update finished");
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
