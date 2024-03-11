const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const lat = 33.211;
const lon = -87.566;
const wfo = "BMX";
const x = 32;
const y = 69;
const state = "AL";
const station = "KBHM";

const getEndpoints = (BASE_URL) => [
  ["points", `${BASE_URL}/points/${lat},${lon}`],
  ["gridpoints", `${BASE_URL}/gridpoints/${wfo}/${x},${y}`],
  ["daily forecast", `${BASE_URL}/gridpoints/${wfo}/${x},${y}/forecast`],
  [
    "hourly forecast",
    `${BASE_URL}/gridpoints/${wfo}/${x},${y}/forecast/hourly`,
  ],
  ["stations", `${BASE_URL}/gridpoints/${wfo}/${x},${y}/stations`],
  ["observations", `${BASE_URL}/alerts/active?status=actual&area=${state}`],
  ["alerts", `${BASE_URL}/stations/${station}/observations?limit=1`],
];

(async () => {
  const timings = [];

  const promises = ["https://api.weather.gov"].map(async (BASE_URL) => {
    const endpoints = getEndpoints(BASE_URL);

    const tests = endpoints.map(async ([name, url]) => {
      /* eslint-disable no-await-in-loop */
      const times = [];
      for (let i = 0; i < 20; i += 1) {
        const start = process.hrtime.bigint();
        await fetch(url);
        const end = process.hrtime.bigint();
        times.push((end - start) / 1_000_000n);

        await sleep(5_000);
      }

      const avg =
        times.reduce((sum, next) => sum + next, 0n) / BigInt(times.length);
      const max = times.reduce((max, next) => (next > max ? next : max), 0n);
      const min = times.reduce(
        (min, next) => (next < min ? next : min),
        999_999_999n,
      );

      timings.push({
        name,
        max,
        min,
        avg,
      });
    });
    await Promise.all(tests);
  });
  await Promise.all(promises);

  console.table(timings);
})();

// (async () => {
//   const times = [];

//   // eslint-disable-next-line
//   for (let i = 0; i < 20; i += 1) {
//     /* eslint-disable no-await-in-loop */
//     const start = process.hrtime.bigint();

//     await fetch(`${BASE_URL}/points/${lat},${lon}`);

//     await Promise.all([
//       fetch(`${BASE_URL}/gridpoints/${wfo}/${x},${y}`),
//       fetch(`${BASE_URL}/gridpoints/${wfo}/${x},${y}/forecast`),
//       fetch(`${BASE_URL}/gridpoints/${wfo}/${x},${y}/forecast/hourly`),
//       fetch(`${BASE_URL}/gridpoints/${wfo}/${x},${y}/stations`),
//     ]);

//     await Promise.all([
//       fetch(`${BASE_URL}/alerts/active?status=actual&area=${state}`),
//       fetch(`${BASE_URL}/stations/${station}/observations?limit=1`),
//     ]);

//     const end = (process.hrtime.bigint() - start) / 1_000_000n;
//     times.push(end);

//     console.log(`${end} ms`);
//     await sleep(3_000);
//   }

//   const avg =
//     times.reduce((sum, operand) => sum + operand, 0n) / BigInt(times.length);
//   console.log("-----------");
//   console.log(`${avg} ms`);
// })();
