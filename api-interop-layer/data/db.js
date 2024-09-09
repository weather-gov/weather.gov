import mariadb from "mariadb";

import { sleep } from "../util/sleep.js";

export const openDatabase = async () => {
  const connectionDetails = {
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "database",
    port: process.env.DB_PORT ?? 3306,
    ssl: { rejectUnauthorized: false },
  };

  return mariadb.createConnection(connectionDetails);
};

// Try to connect, wait, try again, wait, etc. If the database isn't ready after
// 4 attempts and 30 seconds, we'll just fail.
const db = await openDatabase()
  .catch(() => sleep(5_000))
  .then(openDatabase)
  .catch(() => sleep(9_000))
  .then(openDatabase)
  .catch(() => sleep(16_000))
  .then(openDatabase);
await db.end();

export default { openDatabase };
