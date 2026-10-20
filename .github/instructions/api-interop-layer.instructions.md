---
description: 'Node.js logging and caching conventions for the API interop layer'
applyTo: 'api-interop-layer/**/*.js'
---
# API Interop Layer Conventions

- Use Pino for all logging. Do not use `console.*` (ESLint enforces `no-console`). See ADR `docs/architecture/decisions/0028-we-will-use-pino-for-logging.md`.
- Import the shared logger from `util/monitoring/index.js` and create a module-level child logger: `const fooLogger = logger.child({ subsystem: "foo" });`.
- Pass structured data first, then the message: `fooLogger.error({ err }, "Could not fetch");`.
- Redis caches external NWS API data. See ADR `docs/architecture/decisions/0027-we-will-use-redis-for-interop-cache.md`.
- Use `saveToRedis` / `getFromRedis` from `redis.js`; they no-op when Redis is unavailable or `DISABLE_REDIS=true`, so callers must work without the cache.
- Derive TTLs from the `s-maxage` directive of the API's `Cache-Control` header using `getTTLFromResponse` in `util/caching.js`.
- Tests use Mocha, Chai, and Sinon, live next to the code as `*.test.js`, and run with `just test-interop`.
- See `docs/dev/api-interop-layer.md` for architecture and endpoint documentation.
