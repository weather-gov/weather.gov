
import os
import sys

print("DEBUG: python executable:", sys.executable)
print("DEBUG: DJANGO_SETTINGS_MODULE:", os.environ.get("DJANGO_SETTINGS_MODULE"))
print("DEBUG: sys.path:", sys.path)

try:
    import django
    print("DEBUG: django version:", django.get_version())
except ImportError as e:
    print("DEBUG: django import failed:", e)

try:
    from django.conf import settings
    print("DEBUG: settings configured:", settings.configured)
    if not settings.configured:
        # Simulate manage.py logic
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.config.settings.dev")
        try:
            settings._setup()
            print("DEBUG: settings setup successful")
            print("DEBUG: INSTALLED_APPS:", settings.INSTALLED_APPS)
            print("DEBUG: DATABASES:", settings.DATABASES)
        except Exception as e:
            print("DEBUG: settings setup failed:", e)
except Exception as e:
    print("DEBUG: django.conf import failed:", e)
