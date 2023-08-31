const { performance } = require("node:perf_hooks");

const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const measure = async (cb) => {
  performance.mark("start");
  await cb();
  performance.mark("end");
  return performance.measure("time", "start", "end").duration;
};

const round = (num) => Math.round(num * 100) / 100;

const stats = (arr) => {
  const avg = round(arr.reduce((sum, next) => sum + next, 0) / arr.length);
  let median = [...arr].sort((a, b) => a - b);
  median = round(median[Math.floor(median.length / 2)]);

  return {
    avg,
    max: round(Math.max(...arr)),
    median,
    min: round(Math.min(...arr)),
  };
};

const urls = [
  {
    name: "Geocoding place name suggestions",
    url: new URL(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&text=Nashville%20TN`
    ),
  },
  {
    name: "Geocoding place data",
    url: new URL(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?text=Nashville%2C%20TN%2C%20USA&magicKey=dHA9MCNsb2M9Mjk0MzIxMyNsbmc9NTYjcGw9NjExODg4I2xicz0xNDozMzkyNjY1ODsyOjQ3NzQ3NzY1I2xuPUVhZ2xlTG9jYXRvcg%3D%3D&f=json`
    ),
  },
  {
    name: "api.weather.gov point",
    url: new URL(`https://api.weather.gov/points/36.168,-86.778`),
  },
  {
    name: "api.weather.gov observation stations",
    url: new URL(`https://api.weather.gov/gridpoints/OHX/50,57/stations`),
  },
  {
    name: "api.weather.gov observations",
    url: new URL(`https://api.weather.gov/stations/KJWN/observations?limit=1`),
  },
  { name: "local WordPress", url: new URL(`http://localhost:8080/`) },
];

const main = async (which, iterations) => {
  const times = [];

  const testing = urls[which];
  const url = testing.url;
  console.log(testing.name);
  console.log("=======================");

  const iter = [...Array(iterations)].map((_, i) => i);
  for await (const number of iter) {
    if (number > 0) {
      await sleep(1_000);
    }

    const r = Math.floor(Math.random() * 1_000_000);
    url.searchParams.set("cache-buster", r);

    const duration = await measure(() => fetch(url));

    times.push(duration);
    const pct = Math.round((10_000 * (number + 1)) / iterations) / 100;

    if (number > 0) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine();
      for (let _ = 0; _ < 6; _ += 1) {
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine();
      }
    }

    const s = stats(times);
    process.stdout.write(`${pct}%
=======================
Average: ${s.avg} ms
Median:  ${s.median} ms
Max:     ${s.max} ms
Min:     ${s.min} ms
`);
  }
};

const target = Number.parseInt(process.argv[2] ?? 0) || 0;
const iterations = Number.parseInt(process.argv[3] ?? 50) || 50;

if (target >= 0 && target < urls.length) {
  main(target, iterations);
} else {
  console.log(`
Usage: node api-perf-test.js [which url] [iterations]

which url:  a number between 0 and ${
    urls.length - 1
  }, inclusive, indicating which URL
            to test. Look at the source to figure out which number to use.
            Defaults to 0.
iterations: the number of times to hit the chosen URL to get stats. Defaults
            to 50.
`);
}
