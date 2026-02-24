# We will use `pino` for logging our node applications

Date: 2026-01-26

### Status

Draft

### Context

As our logs increase in size and volume, we need to ensure that logging does not
become a performance bottleneck for the interop and api proxy layers (which are
currently written in node, and are thus single-threaded). We need a more robust
logging framework that will process logs in a separate thread to avoid blocking
the main application thread.

### Decision

We will use Pino for node.js logs due to its speed, minimal overhead, and
structured JSON logging.

### Consequences

- Logs will be processed in a separate thread.
- Logs will be in JSON.
