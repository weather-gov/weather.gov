import { performance } from "node:perf_hooks";
import asyncStorage from "../async-storage.js";

// Recording the API timings and associated metadata with
// each request is disabled by default.
// To enable, we need to set this env variable to true
export let API_TIMINGS_METADATA = false;
if (
  process.env.API_TIMINGS_METADATA &&
  process.env.API_TIMINGS_METADATA === "true"
) {
  API_TIMINGS_METADATA = true;
}

class PerformanceMeta {
  constructor(url) {
    if (url) {
      this.url = url;
    }
    this.timing = undefined;
    this.cached = false;
    this._start = undefined;
    this._end = undefined;
  }

  start() {
    if (API_TIMINGS_METADATA) {
      this._start = performance.now();
    }
  }

  end() {
    if (API_TIMINGS_METADATA) {
      this._end = performance.now();
      if (this._start) {
        this.timing = this._end - this._start;
      }
    }
  }

  updateStore(headers) {
    if (!API_TIMINGS_METADATA) {
      return;
    }
    const store = asyncStorage.getStore();
    if (store) {
      let meta = {
        cached: false,
        timing: this.timing,
        url: this.url,
      };
      // record headers for traceability and observability purposes
      if (headers) {
        if (headers["x-correlation-id"]) {
          meta.correlationId = headers["x-correlation-id"];
        }
        if (headers["x-request-id"]) {
          meta.requestId = headers["x-request-id"];
        }
        if (headers["x-server-id"]) {
          meta.serverId = headers["x-server-id"];
        }
        if (headers["x-cache"]) {
          meta.akamaiCache = headers["x-cache"];
        }
        if (headers["x-cache-remote"]) {
          meta.akamaiCacheRemote = headers["x-cache-remote"];
        }
        if (headers["x-check-cacheable"]) {
          meta.akamaiCacheable = headers["x-check-cacheable"];
        }
      }
      store.push(meta);
    }
  }

  recordCacheHit() {
    if (!API_TIMINGS_METADATA) {
      return;
    }
    const store = asyncStorage.getStore();
    if (store) {
      let meta = {
        cached: true,
        timing: this.timing,
        url: this.url,
      };
      store.push(meta);
    }
  }

  get "@meta"() {
    return {
      cached: this.cached,
      timing: this.timing,
      url: this.url,
    };
  }
}

/**
 * Update an existing timing in the store
 * (if present).
 * We look for the matching url in the store
 * and, if not null, we return the execution of
 * the passed in callback on the item.
 */
export const updateStoreUrl = function (url, cb) {
  if (API_TIMINGS_METADATA) {
    const store = asyncStorage.getStore();
    if (store) {
      const item = store.find((entry) => entry.url === url);
      if (item) {
        return cb(item);
      }
    }
  }
  return null;
};

const isObservationUrl = (url) => {
  return url.startsWith("/station") || url.endsWith("limit=3");
};

/**
 * Calculate the big second batch for the forecast endpoint. We need to do extra
 * calculation when it comes to the observation station calls.
 */
const calculateObservationTimings = (batch) => {
  const result = { batch };
  // Observation timings are now determined based on annotations
  // made to the corresponding timing objects in /obs/index.js
  // Since we request all observations, but only conditionally
  // await/care about some of them, we have annotated the timings
  // with a boolean `awaited` property that tells us if they are relevant
  // to the overall timing considerations.
  const observationTimings = batch.filter((item) => {
    return item.url.startsWith("/station") && item.awaited === true;
  });
  const maxObservation =
    observationTimings.length > 0
      ? Math.max(...observationTimings.map((timingData) => timingData.timing))
      : 0;
  const stationsListTiming = batch.find((item) => {
    return item.url.endsWith("limit=3");
  });
  const stationsListVal = stationsListTiming ? stationsListTiming.timing : 0;
  const totalObservationTiming = stationsListVal + maxObservation;
  let timings = batch
    .filter((batchItem) => {
      return !isObservationUrl(batchItem.url);
    })
    .map((batchItem) => {
      return batchItem.timing;
    });
  timings = [...timings, totalObservationTiming];
  result.max = Math.max(...timings);
  return result;
};

/**
 * Calculate the point timings. We intentionally return an empty array if the
 * points endpoint is not used so we can collapse the final result.
 */
const calculatePointTimings = (batch) => {
  if (batch.length == 0) {
    return [];
  }
  let timings = batch.map((batchItem) => batchItem.timing);
  return [
    {
      batch,
      max: Math.max(...timings),
    },
  ];
};

/**
 * Given an array of timing objects, group them into the async
 * batches reflecting how they are called in order. Then compute
 * total batch and overall total API request timings
 */
export const groupPointBatches = (timings) => {
  const pointBatch = timings.filter((timing) =>
    timing.url.startsWith("/point"),
  );
  const nonPointBatch = timings.filter(
    (timing) => !timing.url.startsWith("/point"),
  );
  let batches = [
    ...calculatePointTimings(pointBatch),
    calculateObservationTimings(nonPointBatch),
  ];
  return {
    batches,
    total: batches.reduce((acc, batch) => acc + batch.max, 0),
  };
};

export default function (url) {
  const newMeta = new PerformanceMeta(url);
  return newMeta;
}
