const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

export default async (path) =>
  fetch(`${BASE_URL}${path}`)
    .then((r) => r.json())
    .catch((e) => {
      console.log(e);
      throw e;
    });
