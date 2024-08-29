import { sleep } from "./sleep.js";

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

const internalFetch = async (path) =>
  fetch(`${BASE_URL}${path}`).then((r) => r.json());

export const fetchAPIJson = async (path, { wait = sleep } = {}) =>
  internalFetch(path)
    .catch(() => wait(75).then(() => internalFetch(path)))
    .catch(() => wait(124).then(() => internalFetch(path)))
    .catch(() => wait(204).then(() => internalFetch(path)))
    .catch(() => wait(337).then(() => internalFetch(path)))
    .catch((e) => {
      console.log(e);
      throw e;
    });

export default { fetchAPIJson };
