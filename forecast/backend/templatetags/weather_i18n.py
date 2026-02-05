import json

from django import template
from django.utils.translation import gettext_lazy as _
from django.utils.translation import ngettext

from backend.util import mark_safer

register = template.Library()


def t(value, args=False):
    """Translate content in templates, e.g. `"key.03"|t`."""
    if args:
        args_parsed = json.loads(args)
        translated = _(value)
        result = translated
        for key, val in args_parsed:
            result = result.replace(key, val)
        return result
    return _(value)


@register.simple_tag
def trans_with_args(value, *args, **kwargs):
    """Translate content in templates, e.g. `{% trans_with_args "key.03" %}`."""
    translated = _(value)
    return mark_safer(translated.format(**kwargs))


@register.simple_tag
def translate_plural_with_args(key, count, *args, **kwargs):
    """Translate text that may need to be pluralized.

    The key is for the singular version. The plural key is the same, but with
    "-plural" added to the end. "count" is the value that determines whether to
    use the singular or plural key.

    We already have two other translation helpers, but they don't support
    plurals. This one does that by essentially exposing the ngettext method. The
    template tag doesn't actually do any logic of its own, except for creating
    the plural message key. ngettext is responsible for determining which of the
    two keys to use, based on the pluralization rules defined in the relevant PO
    file.

    The blocktrans tag does support plurals, but it requires that the msgid be
    the English text. That's not what we've done. Instead, our msgid is just an
    identifier, and we use msgstr for the English text. As a result, we can't
    use the standard translation tags. So... here we are!
    """
    return ngettext(key, key + "-plural", count).format(**kwargs)


register.filter("t", t)
