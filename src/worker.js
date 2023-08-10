const CACHE_KEY = "2023-06-26: only latest obs";

const populateCache = async () => {
  const cache = await caches.open(CACHE_KEY);
  cache.addAll([
    "/lib/api/hourlyForecast.js",
    "/lib/api/location.js",
    "/lib/api/observations.js",
    "/lib/location.js",
    "/lib/setupServiceWorker.js",
    "/main.js",
    "/index.html",
    "/worker.js",

    // External dependencies
    "https://cdn.jsdelivr.net/npm/convert@4",
    "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js",
  ]);
};

const releaseOldCaches = async () => {
  const allKeys = await caches.keys();
  const toDelete = allKeys.filter((key) => key != CACHE_KEY);

  return Promise.all(toDelete.map((key) => caches.delete(key)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(populateCache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(releaseOldCaches());
});

const fromCache = async (request) => {
  const cache = await caches.open(CACHE_KEY);
  const match = await cache.match(request);

  if (match) {
    return match;
  }

  return fetch(request);
};

self.addEventListener("fetch", async (event) => {
  const go = async () => {
    const url = new URL(event.request.url);
    if (url.host === "api.weather.gov") {
      const client = await clients.get(event.clientId);
      if (client) {
        const timerId = `timer_${Math.random() * 1000}`;
        performance.mark(`${timerId}_start`);
        const response = await fetch(event.request);
        const blob = await response.blob();
        performance.mark(`${timerId}_end`);

        const measure = performance.measure(
          `${event.request.url} fetch time`,
          `${timerId}_start`,
          `${timerId}_end`
        );
        performance.clearMarks(`${timerId}_start`);
        performance.clearMarks(`${timerId}_end`);

        client.postMessage({
          type: "api_hit",
          url: url.pathname,
          size: blob.size,
          time: measure.duration,
        });

        return Promise.resolve(new Response(blob));
      } else {
        return fromCache(event.request);
      }
    } else {
      return fromCache(event.request);
    }
  };

  event.respondWith(go());
});
