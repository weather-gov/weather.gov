# OpenTelemetry

[OpenTelemetry](https://opentelemetry.io/) is an open source observability
framework. We automatically trace and emit OTEL logs for Django (frontend) and
Node (API interoperability layer). Currently we use
[Openobserve](https://openobserve.ai/) though this may change in the future.

When you run `docker-compose up`, an Openobserve instance is automatically
started up and accessible via http://localhost:8083/ -- all application logs and
traces are sent to Openobserve (logs are forwarded via fluent-bit).

Note that you can turn off OTEL entirely by setting `ENABLE_OPENTELEMETRY` to
false. Alternatively, `TRACE_TEMPLATES` can also be turned off because tracing
templates tends to be quite noisy.

## Other profiling tools

Django Debug Toolbar is also enabled for individual page profiling. It will show
up as a tab on the right (on local environments). Click to expand.
