# gunicorn configuration for prod
#
import os


def post_worker_init(_):
    """Set up open telemetry after a gevent worker has fully initialized."""
    if os.environ.get("ENABLE_OPENTELEMETRY") == "true":
        from tracing import enable_opentelemetry  # noqa: PLC0415

        enable_opentelemetry()


wsgi_app = "backend.config.wsgi"
worker_class = "gevent"
workers = os.environ.get("WEB_GEVENT_WORKERS", "1")  # number of worker processes
worker_connections = 1000  # max connections per worker
max_requests = 1000  # restart workers after processing this many requests
max_requests_jitter = 50  # add randomness to avoid mass restarts
timeout = 60  # workers silent for this many seconds are killed and restarted
