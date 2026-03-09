/**
 * Common Undici Pool instance for API-based requests
 */
import { Pool } from "undici";
import POOL_SETTINGS from "./poolSettings.js";

export const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

export default new Pool(BASE_URL, POOL_SETTINGS);
