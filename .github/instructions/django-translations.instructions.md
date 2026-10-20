---
description: 'Django template translation conventions using i18n tags'
applyTo: 'forecast/backend/templates/**,forecast/locale/**'
---
# Django Translation Conventions

- All user-visible static text in templates must be translated. See ADR `docs/architecture/decisions/0026-we-will-use-django-translations.md`.
- Load tags with `{% load i18n %}` and `{% load weather_i18n %}`. Use `{% trans "key" %}` for plain strings, `{% trans_with_args "key" name=value %}` for interpolation (`{name}` placeholders), and `{% translate_plural_with_args "key" count name=value %}` for plurals (plural key is `<key>-plural`).
- Message IDs are keys, not English text. Follow the `location.role.name.version` pattern (for example, `wfo-info.labels.wfo.01`). The English text goes in `msgstr`.
- Add new entries by hand to `forecast/locale/en/LC_MESSAGES/django.po`. Strings used in JavaScript go in `djangojs.po` and are read with `gettext("js.<key>.01")`.
- Never change the English text of an existing `msgid`. Add a new `msgid` with an incremented version and remove the old one so translations do not drift.
- After adding or changing strings, run `just compile-messages`.
