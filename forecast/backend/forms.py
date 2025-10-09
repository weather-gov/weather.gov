from django import forms
from django.utils.translation import gettext_lazy as _
from wagtail.users.forms import UserCreationForm, UserEditForm

from backend.models import NOAAUser

# These classes are required by Wagtail when using
# a custom user model like we are doing in this
# application
# See https://docs.wagtail.org/en/6.4/advanced_topics/customization/custom_user_models.html


class CustomUserEditForm(UserEditForm):
    """Edit form class required by wagtail when using custom user models."""

    email = forms.ModelChoiceField(queryset=NOAAUser.objects, required=True, label=_("Email"))

    class Meta(UserEditForm.Meta):  # noqa: D106
        fields = UserEditForm.Meta.fields | {"username", "email"}


class CustomUserCreationForm(UserCreationForm):
    """Creation form class required by wagtail when using custom user models."""

    email = forms.ModelChoiceField(queryset=NOAAUser.objects, required=True, label=_("Email"))

    class Meta(UserEditForm.Meta):  # noqa: D106
        fields = UserEditForm.Meta.fields | {"username", "email"}
