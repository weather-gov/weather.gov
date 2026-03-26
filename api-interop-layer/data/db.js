import pg from "pg";
import { sleep } from "../util/sleep.js";

const { Pool } = pg;

export const getDatabaseConnectionInfo = () => {
  if (process.env.API_INTEROP_PRODUCTION) {
    // we are in a cloud.gov environment and must retrieve credentials from
    // the VCAP_SERVICES environment variable
    const vcap = JSON.parse(process.env.VCAP_SERVICES);
    const db = vcap["aws-rds"][0];
    return {
      user: db.credentials.username,
      password: db.credentials.password,
      database: db.credentials.name,
      host: db.credentials.host,
      port: db.credentials.port,
      ssl: true,
      min: 20,
      max: 40,
    };
  }

  // we are in a local environment: offer defaults for ease of use
  return {
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "database",
    port: process.env.DB_PORT ?? 3306,
    min: 20,
    max: 40,
  };
};

const connectionDetails = getDatabaseConnectionInfo();
let pool;

export default async () => {
  if (pool) {
    return pool;
  }

  // Try to connect, wait, try again, wait, etc. If the database isn't ready after
  // 4 attempts and 30 seconds, we'll just fail.
  pool = new Pool(connectionDetails);
  const client = await pool
    .connect()
    .catch(() => sleep(5_000))
    .then(() => pool.connect())
    .catch(() => sleep(9_000))
    .then(() => pool.connect())
    .catch(() => sleep(16_000))
    .then(() => pool.connect());
  await client.release();

  return pool;
};

let isExiting = false;

export const cleanup = async () => {
  if (isExiting) return;
  if (pool) {
    isExiting = true;
    await pool.end();
  }
};

process.on("SHUTDOWN", cleanup);
