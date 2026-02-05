# We will use Django translations

Date: 2025-10-01

### Status

Accepted

### Context

Supersedes [ADR 0016](0016-we-will-use-core-translations-for-interface.md).

There are three aspects to internationalization (i18n) and translations when it
comes to our site:

1. **Providing translations for static text across the public site's interface**.
   These "static" portions include site headers, button labels, aria descriptions,
   and other portions of the site that we have written ourselves in templates.
2. **Translations of authored content in the CMS**
   A separate issue will be translating content that is authored by NWS staff
   within the CMS, and then later displayed to the public.
3. **Translations of information and labels returned by the NWS API**
   This is an ongoing issue to be resolved later.

The purpose of this ADR is to address **point 1 above**.

As with most large web frameworks, internationalization of static text involves
setting up the available languages in the system, and then providing custom
"translation files" of some format. In site templates, any text meant to be
translated will be wrapped in some kind of translation function / filter.

Django has built-in translation support using standed .po files.

### Decision

Since we are building on Django, we will use its built-in tools. We can use them
directly in templates as well as programmatically in Django Python code.

### Consequences

- Our static, translatable text will be in standard .po files, originally
  authored in English and then translated into the desired languages.
- Adding additional languages will require only creating the appropriate new
  .po file and placing it into the project file structure.
