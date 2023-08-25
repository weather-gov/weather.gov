const CACHE_KEY = "2023-07-31: obs site info";

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

  // Cache a clone of the response. Responses can only be used once, at which
  // point they can't be used again and even calling .clone() on them will fail.
  // So clone early, clone often, I guess!
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
};

// These are API endpoints we want to cache.
const endpointsToCache = [
  // The list of observation stations for a given gridpoint.
  // [TODO] This one probably should *NOT* be cached, since it's doing some
  // temporal logic around up-ness of stations.
  {
    host: "api.weather.gov",
    endpoint: /^\/gridpoints\/[A-Z]{3,4}\/\d+,\d+\/stations\/?$/i,
  },

  // The metadata for a given station. Unless we expect stations to physically
  // move or be renamed regularly, this cache is probably fine. We may need to
  // eventually work in some logic around expiring even these caches, though
  { host: "api.weather.gov", endpoint: /^\/stations\/[^\/]*\/?$/i },
];

self.addEventListener("fetch", async (event) => {
  const go = async () => {
    const url = new URL(event.request.url);
    // We should refer to the cache if this request matches any of the specified
    // endpoints above. This is not a sufficiently robust check because it
    // ignores the hostname, but it's good enough for proving the concept.
    const shouldCache = endpointsToCache.some(
      (route) =>
        url.host.toLowerCase() === route.host &&
        route.endpoint.test(url.pathname)
    );

    // [TEMPORARY] For api.weather.gov calls, capture them so we can get some
    // basic performance data on them.
    if (url.host === "api.weather.gov") {
      const client = await clients.get(event.clientId);
      if (client) {
        const timerId = `timer_${Math.random() * 1000}`;
        performance.mark(`${timerId}_start`);
        const response = await (shouldCache
          ? fromCache(event.request)
          : fetch(event.request));
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
