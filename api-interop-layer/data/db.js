import database from "mysql2/promise.js";

import { sleep } from "../util/sleep.js";

const getDatabaseConnectionInfo = () => {
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
    };
  }

  // we are in a local environment: offer defaults for ease of use
  return {
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "database",
    port: process.env.DB_PORT ?? 3306,
    ssl: { rejectUnauthorized: false },
  };
};

let pool;

export default async () => {
  if (pool) {
    return pool;
  }

  const connectionDetails = getDatabaseConnectionInfo();

  // Try to connect, wait, try again, wait, etc. If the database isn't ready after
  // 4 attempts and 30 seconds, we'll just fail.
  const db = await database
    .createConnection(connectionDetails)
    .catch(() => sleep(5_000))
    .then(() => database.createConnection(connectionDetails))
    .catch(() => sleep(9_000))
    .then(() => database.createConnection(connectionDetails))
    .catch(() => sleep(16_000))
    .then(() => database.createConnection(connectionDetails));
  await db.end();

  pool = database.createPool(connectionDetails);
  return pool;
};

const cleanup = async () => {
  if (pool) {
    await pool.end();
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
