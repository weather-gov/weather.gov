import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator


def enable_opentelemetry():
    """
    Enable opentelemetry for Django.

    We trace Django, postgres, requests, and optionally, Django templates.
    """
    name = os.environ.get("OTEL_SERVICE_NAME", "weathergov-django")
    resource = Resource.create({"service.name": name})
    provider = TracerProvider(resource=resource)

    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318")
    exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # global propagation so that we can correlate with the api-interop traces
    set_global_textmap(TraceContextTextMapPropagator())

    DjangoInstrumentor().instrument()
    PsycopgInstrumentor().instrument()
    RequestsInstrumentor().instrument()

    print("*** open telemetry is enabled ***") # noqa: T201

    # we monkey-patch Template.render to explicitly trace templates. this is
    # quite noisy so it can be turned off independently when needed.
    if os.environ.get("TRACE_TEMPLATES", None):
        from django.template.base import Template  # noqa: PLC0415

        _original_render = Template.render

        def traced_render(self, context):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(f"django.template.render: {self.name or 'unknown'}"):
                return _original_render(self, context)

        Template.render = traced_render
