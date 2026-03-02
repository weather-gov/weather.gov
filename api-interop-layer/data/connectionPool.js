import { Pool } from "undici";

export const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

export default new Pool(BASE_URL);
