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
      if (headers && headers["x-correlation-id"]) {
        meta.correlationId = headers["x-correlation-id"];
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

export default function (url) {
  const newMeta = new PerformanceMeta(url);
  return newMeta;
}
