/**
 * ForecastGridCache
 * Handles high-volume logging of NWS grid square hits.
 * Stores grid hits for the `flushForecastGridLogs` function
 * to flush them every 5 seconds
 */
export class ForecastGridCache {
  static buffer = [];

  constructor(worker) {
    this.worker = worker;
    this._startFlushLoop();
  }

  /**
   * Synchronously pushes a grid hit to the memory buffer.
   * This is a zero-latency operation for the main API response.
   */
  logGridHit(grid) {
    if (grid?.wfo && grid?.x !== undefined) {
      ForecastGridCache.buffer.push({
        wfo: grid.wfo,
        x: grid.x,
        y: grid.y,
        geometry: grid.geometry,
      });
    }
  }

  /**
   * Background loop that flushes the buffer to the DB.
   * unref() allows the Node process to exit if only this timer is remaining.
   */
  _startFlushLoop() {
    let interval;

    interval = setInterval(() => {
      if (ForecastGridCache.buffer.length === 0) return;

      const batch = ForecastGridCache.buffer;
      ForecastGridCache.buffer = [];

      // Ship the batch to the background thread
      this.worker.postMessage({
        action: "flush_forecast_grid_logs",
        payload: batch,
      });
    }, 5_000).unref();

    process.on("SHUTDOWN", () => {
      clearInterval(interval);
    });
  }

  /**
   * 30-minute Heat Interval trigger
   * Fires the signal to calculate relative heat and truncate logs.
   */
  _startHeatIntervalLoop() {
    const now = new Date();

    // Calculate minutes until the next :00 or :30 mark
    const msUntilNextTick =
      (30 - (now.getMinutes() % 30)) * 60000 - now.getSeconds() * 1000;

    let timer,
      interval;

    const sendToWorker = () => {
      this.worker.postMessage({ action: "process_heat_interval" });
    }

    timer = setTimeout(() => {
      // Fire the first one exactly at the :30 mark
      sendToWorker();

      // Establish 30m loop
      interval = setInterval(sendToWorker, 1_800_000).unref();
    }, msUntilNextTick).unref();

    process.on("SHUTDOWN", () => {
      clearTimeout(timer);
      clearInterval(interval);
    });
  }
}
