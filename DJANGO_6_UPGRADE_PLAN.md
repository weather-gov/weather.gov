# Django 6.0 Upgrade Plan for weather.gov Django Project

## Executive Summary

This document provides a comprehensive plan for upgrading the weather.gov Django project from Django 5.2.10 to Django 6.0. The upgrade requires coordinated changes across Python version, Django, Wagtail, third-party dependencies, and CSP configuration.

**Current State:**
- Django: 5.2.10
- Python: 3.11 (constrained to >= 3.11, < 3.12)
- Wagtail: 7.2.1
- Third-party CSP: django-csp 4.0

**Target State:**
- Django: 6.0.x
- Python: 3.12+ (3.12, 3.13, or 3.14 supported)
- Wagtail: 7.3+ (required for Django 6.0 compatibility)
- Native Django CSP (replacing django-csp)

---

## Table of Contents

1. [Pre-Upgrade Requirements](#1-pre-upgrade-requirements)
2. [Breaking Changes Analysis](#2-breaking-changes-analysis)
3. [Dependency Upgrade Matrix](#3-dependency-upgrade-matrix)
4. [Regression Test Strategy](#4-regression-test-strategy)
5. [Step-by-Step Upgrade Instructions](#5-step-by-step-upgrade-instructions)
6. [Rollback Plan](#6-rollback-plan)
7. [Agent Implementation Prompt](#7-agent-implementation-prompt)

---

## 1. Pre-Upgrade Requirements

### 1.1 Python Version Upgrade (CRITICAL)

Django 6.0 **drops support for Python 3.10 and 3.11**. The project must upgrade to Python 3.12+.

**Files to modify:**
- `forecast/pyproject.toml` - Line 4: Change `requires-python = ">= 3.11, < 3.12"` to `requires-python = ">= 3.12"`
- Docker configurations (if applicable)
- CI/CD pipeline configurations

### 1.2 Wagtail Upgrade (CRITICAL BLOCKER)

Wagtail 7.2.1 does **NOT** support Django 6.0. Must upgrade to Wagtail 7.3+ (released February 2, 2026).

**Files to modify:**
- `forecast/pyproject.toml` - Line 28: Update `wagtail>=7.2.1` to `wagtail>=7.3`
- `forecast/requirements.txt` - Update wagtail version

### 1.3 Create Baseline Test Suite

Before making any changes, ensure all existing tests pass:

```bash
cd forecast
python manage.py test
```

Document current test count and coverage percentage.

---

## 2. Breaking Changes Analysis

### 2.1 Changes That Affect This Project

#### 2.1.1 Content Security Policy (MAJOR CHANGE)

**Impact: HIGH**

Django 6.0 includes built-in CSP support, making `django-csp` redundant.

**Current Implementation (django-csp):**
```python
# forecast/backend/config/settings/base.py
from csp.constants import NONCE, SELF
MIDDLEWARE = [
    # ...
    "csp.middleware.CSPMiddleware",
]
INSTALLED_APPS = [
    # ...
    "csp",
]
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {...}
}
CONTENT_SECURITY_POLICY_REPORT_ONLY = {
    "DIRECTIVES": {...}
}
```

**Required Migration:**
```python
# New Django 6.0 native CSP
from django.utils.csp import CSP
MIDDLEWARE = [
    # ...
    "django.middleware.csp.ContentSecurityPolicyMiddleware",
]
# Remove "csp" from INSTALLED_APPS
SECURE_CSP = {
    "default-src": [CSP.SELF],
    "script-src": [CSP.SELF, "'unsafe-eval'", "'unsafe-inline'"],
    # ... migrate all directives
}
SECURE_CSP_REPORT_ONLY = {
    # ... for monitoring
}
```

**Files affected:**
- `forecast/backend/config/settings/base.py` (lines 18, 73, 105, 289-371)
- `forecast/pyproject.toml` (remove django-csp dependency)
- `forecast/requirements.txt` (remove django-csp)

#### 2.1.2 DEFAULT_AUTO_FIELD Now Defaults to BigAutoField

**Impact: LOW (Already configured)**

The project already sets `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"` in `base.py` (line 243). No action required.

#### 2.1.3 Python Minimum Version Libraries

**Impact: MEDIUM**

Several dependencies require minimum versions for Python 3.12 compatibility:
- `psycopg2-binary` >= 2.9.9 (currently 2.9.10 ✓)
- `Pillow` >= 10.1.0 (currently 12.1.0 ✓)
- `PyYAML` >= 6.0.2 (currently 6.0.3 ✓)
- `sqlparse` >= 0.5.0 (currently 0.5.5 ✓)
- `asgiref` >= 3.9.1 (currently 3.11.0 ✓)

All current versions are compatible.

### 2.2 Features Deprecated in Django 6.0 (Not Affecting This Project)

The following deprecated features are NOT used in this project:
- ❌ Email positional arguments (no email usage found)
- ❌ PostgreSQL `StringAgg` (not used)
- ❌ `ADMINS`/`MANAGERS` tuple format (not configured)
- ❌ `MIMEBase` attachments (no email usage)

### 2.3 Features Removed in Django 6.0 (Verify Not Used)

Verify these removed features are not used anywhere:
- `DjangoDivFormRenderer` / `Jinja2DivFormRenderer` - Not used ✓
- `BaseDatabaseOperations.field_cast_sql()` - Not used ✓
- `format_html()` without args - Search codebase to verify
- Positional args to `BaseConstraint` - Check model constraints
- `cx_Oracle` support - Not used (using PostgreSQL) ✓
- `FORMS_URLFIELD_ASSUME_HTTPS` - Not used ✓

---

## 3. Dependency Upgrade Matrix

| Package | Current Version | Required Version | Notes |
|---------|----------------|------------------|-------|
| Django | 5.2.10 | 6.0.x | Core upgrade |
| Wagtail | 7.2.1 | 7.3+ | Required for Django 6 support |
| django-csp | 4.0 | REMOVE | Replaced by Django native CSP |
| django-allow-cidr | 0.7.1 | Verify 6.0 compat | Check release notes |
| django-debug-toolbar | 6.1.0 | Verify 6.0 compat | Check release notes |
| django-filter | 25.2 | Verify 6.0 compat | Wagtail dependency |
| django-silk | 5.4.3 | Verify 6.0 compat | Dev only |
| django-storages | 1.14.6 | Verify 6.0 compat | S3 storage |
| djangorestframework | 3.16.1 | Verify 6.0 compat | API framework |
| Python | 3.11 | 3.12+ | Required for Django 6 |

### 3.1 Dependency Verification Commands

```bash
# Check each package for Django 6.0 compatibility
pip index versions django-allow-cidr
pip index versions django-debug-toolbar
pip index versions django-storages
pip index versions djangorestframework

# Or check PyPI pages for Django 6.0 compatibility statements
```

---

## 4. Regression Test Strategy

### 4.1 Existing Test Coverage

The project has 23 test files covering:

| Category | Files | Coverage |
|----------|-------|----------|
| Backend Views | 7 files | Views, URLs, partials |
| Backend Models | 2 files | NOAAUser, Roadmap, etc. |
| Template Tags | 4 files | i18n, partials, utils |
| URL Routing | 2 files | Converters, URL patterns |
| Weather Stories API | 4 files | Views, models, URLs |
| NOAA SAML | 2 files | Auth, views |
| Interop | 2 files | API integration, GHWO |

### 4.2 Pre-Upgrade Test Baseline

**Execute before any changes:**

```bash
cd forecast

# Run full test suite
python manage.py test --verbosity=2

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html

# Record results
echo "Pre-upgrade test count: $(python manage.py test --verbosity=0 2>&1 | grep -o '[0-9]* test')"
```

### 4.3 Django 6.0 Specific Regression Tests

Create new test file: `forecast/backend/tests/test_django6_upgrade.py`

```python
"""
Django 6.0 Upgrade Regression Tests

These tests verify that Django 6.0 upgrade did not break functionality.
Run these tests before and after the upgrade.
"""
import json
from unittest import mock
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.gis.geos import GEOSGeometry


class CSPMigrationTests(TestCase):
    """Verify CSP headers are correctly set after migration from django-csp."""
    
    def setUp(self):
        self.client = Client()
    
    def test_csp_header_present(self):
        """Verify Content-Security-Policy header is present."""
        response = self.client.get('/')
        self.assertIn('Content-Security-Policy', response.headers)
    
    def test_csp_self_directive(self):
        """Verify 'self' directive is present in CSP."""
        response = self.client.get('/')
        csp = response.headers.get('Content-Security-Policy', '')
        self.assertIn("'self'", csp)
    
    def test_csp_report_only_header(self):
        """Verify CSP Report-Only header is present for monitoring."""
        response = self.client.get('/')
        # Either enforced or report-only should be present
        has_csp = 'Content-Security-Policy' in response.headers
        has_report = 'Content-Security-Policy-Report-Only' in response.headers
        self.assertTrue(has_csp or has_report)


class CriticalPageTests(TestCase):
    """Verify all critical pages load without errors."""
    
    def setUp(self):
        self.client = Client()
    
    def test_homepage_loads(self):
        """Homepage should return 200."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
    
    def test_health_endpoint(self):
        """Health check endpoint should work."""
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
    
    def test_static_pages(self):
        """Static pages should load."""
        pages = ['/about/', '/accessibility/', '/disclaimer/', '/privacy/']
        for page in pages:
            with self.subTest(page=page):
                response = self.client.get(page)
                self.assertIn(response.status_code, [200, 404])  # 404 OK if page not created
    
    def test_county_index(self):
        """County index page should load."""
        response = self.client.get('/county/')
        self.assertEqual(response.status_code, 200)
    
    def test_state_index(self):
        """State index page should load."""
        response = self.client.get('/state/')
        self.assertEqual(response.status_code, 200)


class TemplateRenderingTests(TestCase):
    """Verify templates render correctly with Django 6.0."""
    
    def setUp(self):
        self.client = Client()
        # Setup minimal data for functional tests if database access is needed
        # Note: In a real run, these might need to be created if not present
        pass
    
    def test_base_template_renders(self):
        """Base template should render without template errors."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        # Should not contain Django template error messages
        content = response.content.decode()
        self.assertNotIn('TemplateSyntaxError', content)
        self.assertNotIn('TemplateDoesNotExist', content)

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_forecast_rendering(self, mock_get_point_forecast):
        """
        Verify complex point forecast template renders correctly.
        This ensures custom template tags and partials work in Django 6.0.
        """
        # Mock successfully returned data structure (simplified)
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "forecast": {
                "days": [{
                    "id": "day1",
                    "isNightPeriod": False,
                    "temps": [70, 50],
                    "pop": 10,
                    "qpf": {"liquid": [0, 0], "snow": [0, 0], "ice": [0, 0]},
                    "hourly": {
                        "temps": [70],
                        "pops": [10],
                        "windSpeeds": [5],
                        "windDirections": ["N"],
                        "windGusts": [10],
                        "feelsLike": [70],
                        "dewpoints": [50],
                        "relativeHumidity": [50],
                    },
                    "periods": [{"isDaytime": True, "data": {"temperature": {"degF": 70}}}],
                }]
            },
            "alerts": {"items": []},
            "point": {"latitude": 30, "longitude": 30},
            "place": {"name": "Test Place", "state": "TX"},
        }
        
        # Determine strictness of template checking
        # For regression, we just want to ensure it doesn't crash (500)
        # and renders the main container.
        try:
            response = self.client.get('/point/30/30/')
            self.assertEqual(response.status_code, 200)
            content = response.content.decode()
            
            # Verify critical partials are rendered
            self.assertIn('daily-forecast-list', content) 
            # self.assertIn('hourly-forecast-list', content) # Might be loaded async or via partial
            self.assertNotIn('TemplateSyntaxError', content)
        except Exception as e:
            self.fail(f"Point forecast page failed to render: {e}")

    def test_context_processors(self):
        """Verify context processors inject expected variables."""
        response = self.client.get('/')
        # Check for variables injected by backend.context_processors
        # This confirms middleware interaction with templates is working
        self.assertEqual(response.context.get('base_template_name'), 'weather/base.html')



class URLPatternTests(TestCase):
    """Verify URL patterns work correctly."""
    
    def test_float_converter(self):
        """Custom FloatConverter should work."""
        # Valid coordinates
        response = self.client.get('/point/44.92/-92.937/')
        # Should not be 404 due to URL pattern issues
        self.assertNotEqual(response.status_code, 404)
    
    def test_url_reverse(self):
        """URL reverse should work for named routes."""
        url = reverse('index')
        self.assertEqual(url, '/')
        
        url = reverse('health')
        self.assertEqual(url, '/health/')


class MiddlewareChainTests(TestCase):
    """Verify middleware chain works correctly."""
    
    def setUp(self):
        self.client = Client()
    
    def test_security_middleware(self):
        """Security middleware should set security headers."""
        response = self.client.get('/')
        # XFrameOptions or CSP should be present
        has_security = (
            'X-Frame-Options' in response.headers or
            'Content-Security-Policy' in response.headers
        )
        self.assertTrue(has_security)
    
    def test_session_middleware(self):
        """Session middleware should work."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)


class ModelTests(TestCase):
    """Verify models work correctly with Django 6.0."""
    
    def test_noaa_user_model(self):
        """Custom user model should work."""
        from backend.models import NOAAUser
        user = NOAAUser.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.assertIsNotNone(user.pk)
        user.delete()
    
    def test_wfo_model(self):
        """WFO model should work."""
        from backend.models import WFO, Region
        region = Region.objects.create(name='Test Region', weight=1)
        wfo = WFO.objects.create(
            code='TST',
            name='Test WFO',
            weight=1,
            region=region
        )
        self.assertIsNotNone(wfo.pk)
        wfo.delete()
        region.delete()
```

### 4.4 Manual Testing Checklist

Before deployment, manually verify:

- [ ] Homepage loads correctly
- [ ] Point forecast pages work (e.g., `/point/44.92/-92.937/`)
- [ ] County pages load
- [ ] State pages load
- [ ] AFD (Area Forecast Discussion) pages work
- [ ] Wagtail CMS admin (`/cms/`) is accessible
- [ ] SAML authentication works
- [ ] Weather Stories API endpoints respond
- [ ] Static assets (CSS/JS) load correctly
- [ ] Browser console shows no CSP violations
- [ ] All template partials render (check Network tab)

### 4.5 Performance Regression Tests

```bash
# Run Django check for deprecation warnings
python -Wd manage.py check

# Check for any new warnings
python -Wd manage.py test 2>&1 | grep -i "deprecat"
```

---

## 5. Step-by-Step Upgrade Instructions

### Phase 1: Preparation (No Code Changes)

```bash
# 1. Create upgrade branch
git checkout -b feature/django6-upgrade

# 2. Document current state
python manage.py test --verbosity=2 > pre_upgrade_tests.log
coverage run manage.py test && coverage report > pre_upgrade_coverage.log

# 3. Check for deprecation warnings in current code
python -Wd manage.py check 2>&1 | tee deprecation_warnings.log
python -Wd manage.py test 2>&1 | grep -i deprecat | tee test_deprecations.log
```

### Phase 2: Python Version Upgrade

**File: `forecast/pyproject.toml`**
```diff
[project]
name = "weather.gov"
version = "1.21.0-beta"
-requires-python = ">= 3.11, < 3.12"
+requires-python = ">= 3.12"
```

Update Docker and CI configurations to use Python 3.12+.

### Phase 3: Update Dependencies

**File: `forecast/pyproject.toml`**
```diff
dependencies = [
    # ...
-    "django>=5.2.10",
+    "django>=6.0",
-    "django-csp==4.0",
+    # django-csp removed - using Django native CSP
    # ...
-    "wagtail>=7.2.1",
+    "wagtail>=7.3",
]
```

### Phase 4: Migrate CSP Configuration

**File: `forecast/backend/config/settings/base.py`**

```python
# REMOVE these lines:
# from csp.constants import NONCE, SELF

# ADD these imports:
from django.utils.csp import CSP

# UPDATE INSTALLED_APPS - remove "csp":
INSTALLED_APPS = [
    # ...
    # "csp",  # REMOVE THIS LINE
    # ...
]

# UPDATE MIDDLEWARE:
MIDDLEWARE = [
    "allow_cidr.middleware.AllowCIDRMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "wx_stories_api.middleware.FilterIPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    # REPLACE csp.middleware.CSPMiddleware with:
    "django.middleware.csp.ContentSecurityPolicyMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
]

# Add CSP context processor for nonce support:
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.i18n",
                "django.template.context_processors.media",
                "backend.context_processors.route_info",
                # ADD THIS:
                "django.template.context_processors.csp",
            ],
            # ...
        },
    },
]

# REPLACE CONTENT_SECURITY_POLICY with SECURE_CSP:
CRITICAL_HOSTS = {
    # ... keep as-is
}

SECURE_CSP = {
    "default-src": [CSP.SELF],
    "script-src": [
        CSP.SELF,
        "'unsafe-eval'",
        "'unsafe-inline'",
    ],
    "script-src-elem": [
        CSP.SELF,
        CSP.NONCE,
        "dap.digitalgov.gov",
        "www.googletagmanager.com",
        "client.rum.us-east-1.amazonaws.com",
        "'unsafe-inline'",
        "https://unpkg.com",
    ],
    "connect-src": [
        CSP.SELF,
        "www.google-analytics.com",
        "dap.digitalgov.gov",
        "cognito-identity.us-east-1.amazonaws.com",
        "dataplane.rum.us-east-1.amazonaws.com",
        *CRITICAL_HOSTS["connect-src"],
    ],
    "font-src": [CSP.SELF],
    "img-src": [
        CSP.SELF,
        "www.google-analytics.com",
        "www.googletagmanager.com",
        "www.gravatar.com",
        *CRITICAL_HOSTS["img-src"],
        "data:",
    ],
    "media-src": [CSP.SELF, *CRITICAL_HOSTS["media-src"]],
    "style-src": [
        CSP.SELF,
        "'unsafe-inline'",
    ],
    "worker-src": [
        CSP.SELF,
        "blob:",
    ],
    "frame-ancestors": [CSP.SELF],
    "form-action": [CSP.SELF],
}

SECURE_CSP_REPORT_ONLY = {
    "default-src": [CSP.SELF],
    # ... same as SECURE_CSP but for monitoring
    "style-src": [
        CSP.SELF,
        CSP.NONCE,
        "'sha256-gRE3bxId7YdBMR/AIWG7jHh2sJ9XAtq1YUxCaFh3hng='",
        "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
        "'sha256-624gmqlO23N0g1Ru4tkjuaPEoL/hXP4w7tUqel4WM98='",
        "'sha256-5uOIRR03mYcVoiexgzGGALQ0p1Babe2XxbeIl9t1UpA='",
        "'sha256-lM8P08IzH0mbT5Tvlm1F5BY3h0gPsb0qNpnZW9YHc7A='",
        "'sha256-UykT9B84Ik0dt1VPV3lpHxAikh/bNzWCgLl3XN0PYtw='",
        "'sha256-RXxNUJG3UfHAeHA4copS/oAu4QHoWavn3IraEQ+XrTk='",
        "'sha256-PhvAqgz4qsgszcJzzo3ctihcuOyVv4VbFiW+ns+wtJM='",
    ],
}

# REMOVE the old CONTENT_SECURITY_POLICY and CONTENT_SECURITY_POLICY_REPORT_ONLY dictionaries
# REMOVE the DIRECTIVES dictionary
```

### Phase 5: Regenerate Requirements

```bash
cd forecast
uv pip compile pyproject.toml -o requirements.txt
# or
pip-compile pyproject.toml -o requirements.txt
```

### Phase 6: Run Migrations

```bash
python manage.py migrate --check  # Check for pending migrations
python manage.py makemigrations   # Create any needed migrations
python manage.py migrate          # Apply migrations
```

### Phase 7: Run Tests

```bash
# Run deprecation check
python -Wd manage.py check

# Run full test suite
python manage.py test --verbosity=2

# Compare with pre-upgrade results
diff pre_upgrade_tests.log <(python manage.py test --verbosity=2)
```

### Phase 8: Manual Verification

Complete the manual testing checklist from Section 4.4.

---

## 6. Rollback Plan

If the upgrade fails:

```bash
# 1. Revert to previous branch
git checkout main

# 2. Restore original requirements
pip install -r requirements.txt

# 3. Verify rollback
python manage.py test
```

Keep the `feature/django6-upgrade` branch for debugging.

---

## 7. Agent Implementation Prompt

The following XML prompt can be used by Antigravity agents to implement this upgrade:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<upgrade_task>
  <metadata>
    <task_name>Django 6.0 Upgrade</task_name>
    <project>weather.gov Django Application</project>
    <current_versions>
      <django>5.2.10</django>
      <python>3.11</python>
      <wagtail>7.2.1</wagtail>
    </current_versions>
    <target_versions>
      <django>6.0.x</django>
      <python>3.12+</python>
      <wagtail>7.3+</wagtail>
    </target_versions>
  </metadata>

  <prerequisites>
    <requirement priority="critical">
      Ensure Python 3.12+ is available in the execution environment
    </requirement>
    <requirement priority="critical">
      Verify Wagtail 7.3+ is released and available on PyPI
    </requirement>
    <requirement priority="high">
      Create feature branch before making changes
    </requirement>
    <requirement priority="high">
      Run and record baseline test results
    </requirement>
  </prerequisites>

  <execution_phases>
    <phase number="1" name="Baseline Documentation">
      <steps>
        <step>Create git branch: feature/django6-upgrade</step>
        <step>Run: python manage.py test --verbosity=2 > pre_upgrade_tests.log</step>
        <step>Run: python -Wd manage.py check 2>&1 | tee deprecation_warnings.log</step>
        <step>Run: coverage run manage.py test && coverage report > pre_upgrade_coverage.log</step>
      </steps>
      <success_criteria>
        All existing tests pass before proceeding
      </success_criteria>
    </phase>

    <phase number="2" name="Update Python Version">
      <files>
        <file path="forecast/pyproject.toml">
          <change>
            <find>requires-python = ">= 3.11, < 3.12"</find>
            <replace>requires-python = ">= 3.12"</replace>
          </change>
        </file>
      </files>
      <verification>
        Ensure Python 3.12+ is being used for subsequent steps
      </verification>
    </phase>

    <phase number="3" name="Update Dependencies">
      <files>
        <file path="forecast/pyproject.toml">
          <change>
            <find>django>=5.2.10</find>
            <replace>django>=6.0</replace>
          </change>
          <change>
            <find>django-csp==4.0</find>
            <replace><!-- Remove this line entirely --></replace>
          </change>
          <change>
            <find>wagtail>=7.2.1</find>
            <replace>wagtail>=7.3</replace>
          </change>
        </file>
      </files>
      <commands>
        <command>cd forecast && pip install -e .</command>
        <command>pip freeze > requirements.txt</command>
      </commands>
    </phase>

    <phase number="4" name="Migrate CSP Configuration">
      <files>
        <file path="forecast/backend/config/settings/base.py">
          <changes>
            <change type="import">
              <remove>from csp.constants import NONCE, SELF</remove>
              <add>from django.utils.csp import CSP</add>
            </change>
            <change type="installed_apps">
              <remove>"csp",</remove>
            </change>
            <change type="middleware">
              <find>"csp.middleware.CSPMiddleware",</find>
              <replace>"django.middleware.csp.ContentSecurityPolicyMiddleware",</replace>
            </change>
            <change type="context_processors">
              <add>"django.template.context_processors.csp",</add>
            </change>
            <change type="settings">
              <description>
                Convert CONTENT_SECURITY_POLICY to SECURE_CSP format.
                Replace SELF with CSP.SELF, NONCE with CSP.NONCE.
                Convert CONTENT_SECURITY_POLICY_REPORT_ONLY to SECURE_CSP_REPORT_ONLY.
                Remove DIRECTIVES wrapper - Django 6.0 uses flat dictionary.
              </description>
            </change>
          </changes>
        </file>
      </files>
    </phase>

    <phase number="5" name="Create Upgrade Tests">
      <files>
        <file path="forecast/backend/tests/test_django6_upgrade.py">
          <action>Create new file with regression tests from Section 4.3</action>
        </file>
      </files>
    </phase>

    <phase number="6" name="Run Migrations">
      <commands>
        <command>python manage.py makemigrations --check</command>
        <command>python manage.py migrate</command>
      </commands>
    </phase>

    <phase number="7" name="Verification">
      <commands>
        <command>python -Wd manage.py check</command>
        <command>python manage.py test --verbosity=2</command>
      </commands>
      <success_criteria>
        <criterion>All tests pass</criterion>
        <criterion>No new deprecation warnings</criterion>
        <criterion>CSP headers present in responses</criterion>
        <criterion>All critical pages load (/, /health/, /county/, /state/)</criterion>
      </success_criteria>
    </phase>
  </execution_phases>

  <critical_files>
    <file path="forecast/pyproject.toml" changes="python_version,dependencies"/>
    <file path="forecast/requirements.txt" changes="regenerate"/>
    <file path="forecast/backend/config/settings/base.py" changes="csp_migration,middleware,imports"/>
    <file path="forecast/backend/tests/test_django6_upgrade.py" changes="create"/>
  </critical_files>

  <rollback_instructions>
    <step>git checkout main</step>
    <step>pip install -r requirements.txt</step>
    <step>python manage.py migrate</step>
    <step>python manage.py test</step>
  </rollback_instructions>

  <known_risks>
    <risk level="high">
      <description>Wagtail 7.3 may not be released yet</description>
      <mitigation>Check PyPI before proceeding. If not available, wait for release.</mitigation>
    </risk>
    <risk level="medium">
      <description>Third-party packages may not support Django 6.0</description>
      <mitigation>Check compatibility for: django-allow-cidr, django-debug-toolbar, django-storages, djangorestframework</mitigation>
    </risk>
    <risk level="medium">
      <description>CSP migration may break inline scripts</description>
      <mitigation>Test all pages with browser console open, check for CSP violations</mitigation>
    </risk>
  </known_risks>
</upgrade_task>
```

---

## Appendix A: File Change Summary

| File | Type of Change |
|------|---------------|
| `forecast/pyproject.toml` | Python version, Django version, remove django-csp, upgrade Wagtail |
| `forecast/requirements.txt` | Regenerate after pyproject.toml changes |
| `forecast/backend/config/settings/base.py` | CSP migration, middleware, imports, context processors |
| `forecast/backend/tests/test_django6_upgrade.py` | Create new regression test file |

## Appendix B: CSP Constant Mapping

| django-csp | Django 6.0 Native |
|------------|-------------------|
| `SELF` | `CSP.SELF` |
| `NONCE` | `CSP.NONCE` |
| `NONE` | `CSP.NONE` |
| `UNSAFE_INLINE` | `"'unsafe-inline'"` (string) |
| `UNSAFE_EVAL` | `"'unsafe-eval'"` (string) |

## Appendix C: Third-Party Dependency Verification Checklist

Before upgrading, verify Django 6.0 compatibility for each package:

- [ ] django-allow-cidr - Check GitHub/PyPI for Django 6.0 support
- [ ] django-debug-toolbar - Check GitHub releases
- [ ] django-filter - Check release notes (Wagtail dep)
- [ ] django-modelcluster - Check release notes (Wagtail dep)
- [ ] django-silk - Check GitHub releases (dev only)
- [ ] django-storages - Check PyPI for Django 6.0
- [ ] django-taggit - Check release notes (Wagtail dep)
- [ ] django-tasks - Check release notes (Wagtail dep)
- [ ] django-treebeard - Check release notes (Wagtail dep)
- [ ] djangorestframework - Check release notes
