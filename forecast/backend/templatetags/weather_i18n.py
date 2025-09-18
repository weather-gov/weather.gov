import json

from django import template
from django.utils.translation import gettext_lazy as _

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


register.filter("t", t)
