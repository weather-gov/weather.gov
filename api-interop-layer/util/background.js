import { isMainThread } from "node:worker_threads";

/*
 * Determines if background processing should be enabled for this process.
 *
 * In production, we want to make sure background tasks run once per cloud.gov
 * environment since we can have multiple instances of the interop running in an
 * environment or even within the same app.
 *
 * To ensure we do this, we check that:
 * - we are on the main thread (`isMainThread`)
 * - we are on the first cloud.gov instance (`CF_INSTANCE_INDEX == 0`)
 * - we are on the first PM2 worker (`NODE_APP_INSTANCE == 0`)
 *
 * In development, we just check to see if we are on the main thread.
 */
export const enableBackgroundProcessing = () => {
  const isPrimaryWorker =
    !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";

  return process.env.API_INTEROP_PRODUCTION
    ? process.env.CF_INSTANCE_INDEX == 0 && isPrimaryWorker && isMainThread
    : isMainThread;
};
