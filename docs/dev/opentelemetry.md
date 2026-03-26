# OpenTelemetry

[OpenTelemetry](https://opentelemetry.io/) is an open source observability
framework. We automatically trace and emit OTEL logs for Django (frontend) and
Node (API interoperability layer). Currently we use
[Jaeger](https://www.jaegertracing.io/) though this may change in the future.

When you run `docker-compose up`, a Jaeger instance is automatically started up
and accessible via http://localhost:16686/ -- the most useful tab is "Search".
In that tab, the "Service" filter should show both `weathergov-django` and
`weathergov-api-interop` as options. We correlate Django requests with the API
interoperability layer so it usually suffices to filter by `weathergov-django`
since traces from the API interoperability layer will also show up there.

Note that you can turn off OTEL entirely by setting `ENABLE_OPENTELEMETRY` to
false. Alternatively, `TRACE_TEMPLATES` can also be turned off because tracing
templates tends to be quite noisy.

## Other profiling tools

Django Debug Toolbar is also enabled for individual page profiling. It will show
up as a tab on the right (on local environments). Click to expand.
