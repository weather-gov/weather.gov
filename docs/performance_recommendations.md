# Performance Recommendations

To significantly improve the performance of the forecast page, despite long latencies (up to 16 seconds) in upstream API calls, we recommend the following three strategies:

1. **Stale-While-Revalidate Caching for Forecast Grids**
   Upstream gridpoint forecast endpoints (e.g. `/gridpoints/{wfo}/{x},{y}/forecast`) can have latency spikes. Implement a stale-while-revalidate caching layer (using Redis) that immediately serves slightly stale forecast data from the cache to the user, while asynchronously fetching fresh data in the background to update the cache for the next request. This completely removes the upstream API latency from the critical path of the user request.

2. **Decoupled Asynchronous Polling for Weather Stories and Observations**
   Weather stories and live station observations are often slow to respond and are secondary features to the primary forecast. Rather than making these requests synchronously (even in parallel) and blocking the UI render, the server should either fetch them eagerly in a background cron job for common WFOs and store them in the database, or push them via WebSockets/Server-Sent Events as they resolve.

3. **Client-Side Edge Caching with Service Workers**
   Deploy a client-side Service Worker configured to cache static assets, HTML partials, and API responses aggressively. By utilizing browser-level caching for the UI shell and lazy-loaded components, repeat visits to the forecast page will load near-instantaneously regardless of network or backend performance, providing a resilient offline or slow-network experience.

## Performance Demonstration

The following screencast demonstrates the high-performance load of the forecast page using the experimental branch. The page takes advantage of lazy loading and backend caching.

![Forecast Page Load Performance](experimental_perf_forecast.webm)
