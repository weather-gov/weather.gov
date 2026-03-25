# gunicorn configuration for prod
#
wsgi_app = "backend.config.wsgi"
worker_class = "gevent"
workers = 4  # number of worker processes
worker_connections = 1000  # max connections per worker
max_requests = 1000  # restart workers after processing this many requests
max_requests_jitter = 50  # add randomness to avoid mass restarts
timeout = 60  # workers silent for this many seconds are killed and restarted
