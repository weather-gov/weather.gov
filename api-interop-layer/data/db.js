import { Pool } from "pg";
import { sleep } from "../util/sleep.js";
import { isMainThread } from "node:worker_threads";
import { logger } from "../util/monitoring/logger.js";

const dbLogger = logger.child({ subsystem: "database" });

const getProductionPoolLimits = () => {
  // worker threads (e.g., alerts background task) only need a small db pool
  // since they run on a scheduler.
  if (!isMainThread) {
    dbLogger.warn({ max: 2, min: 1 }, "set worker thread pool limits");
    return { min: 1, max: 2 };
  }

  // ensure the database pool allocation is spread evenly across all interop
  // instances.
  const dbMaxConnections =
    Number.parseInt(process.env.API_DB_MAX_CONNECTIONS, 10) || 195;
  const nodeApps = Number.parseInt(process.env.API_NODE_APPS, 10) || 1;
  const interopInstances =
    Number.parseInt(process.env.API_INTEROP_INSTANCES, 10) || 1;
  const instances = nodeApps * interopInstances;
  const max = Math.max(Math.floor(dbMaxConnections / instances), 5);
  const min = Math.max(Math.floor(max / 2), 2);
  dbLogger.warn(
    { dbMaxConnections, instances, max, min },
    "set production pool limits",
  );
  return { min, max };
};

const getDevelopmentPoolLimits = () => {
  // worker threads (e.g., alerts background task) only need a small db pool
  // since they run on a scheduler.
  if (!isMainThread) {
    dbLogger.warn({ max: 2, min: 1 }, "set worker thread pool limits");
    return { min: 1, max: 2 };
  }

  // ensure the database pool allocation is spread evenly across all
  // interop instances
  const dbMaxConnections =
    Number.parseInt(process.env.API_DB_MAX_CONNECTIONS, 10) || 45;
  const nodeApps = Number.parseInt(process.env.API_NODE_APPS, 10) || 1;
  const interopInstances =
    Number.parseInt(process.env.API_INTEROP_INSTANCES, 10) || 1;
  const instances = nodeApps * interopInstances;
  const max = Math.max(Math.floor(dbMaxConnections / instances), 5);
  const min = Math.max(Math.floor(max / 2), 2);
  dbLogger.warn(
    { dbMaxConnections, instances, max, min },
    "set development pool limits",
  );
  return { min, max };
};

export const getDatabaseConnectionInfo = () => {
  if (process.env.API_INTEROP_PRODUCTION) {
    // we are in a cloud.gov environment and must retrieve credentials from
    // the VCAP_SERVICES environment variable
    const vcap = JSON.parse(process.env.VCAP_SERVICES);
    const db = vcap["aws-rds"][0];
    const prodPoolLimits = getProductionPoolLimits();
    return {
      user: db.credentials.username,
      password: db.credentials.password,
      database: db.credentials.name,
      host: db.credentials.host,
      port: db.credentials.port,
      ssl: true,
      ...prodPoolLimits,
    };
  }

  // we are in a local environment: offer defaults for ease of use
  const devPoolLimits = getDevelopmentPoolLimits();
  return {
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "database",
    port: process.env.DB_PORT ?? 3306,
    ...devPoolLimits,
  };
};

const connectionDetails = getDatabaseConnectionInfo();
let pool;

export default async () => {
  if (pool) {
    return pool;
  }

  pool = new Pool(connectionDetails);
  const client = await pool.connect(); // do not retry: if the pool is not available then abort immediately.
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
