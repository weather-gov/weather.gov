#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from django.conf import settings


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.config.settings")

    if settings.DEBUG:
        # Check "RUN_MAIN" so we don't keep re-registering the debugger when
        # Django is simply reloading due to file changes or something.

        command = sys.argv[1:2].pop()

        if os.environ.get("RUN_MAIN") or os.environ.get("RUN_MAIN") or command == "test":
            import debugpy
            debugpy.listen(("0.0.0.0", int(os.environ.get("DEBUG_PORT", 34235))))

            if os.environ.get("BREAK", None) == "true":
                debugpy.wait_for_client()
                debugpy.breakpoint()

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
