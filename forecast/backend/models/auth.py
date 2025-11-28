from django.contrib.auth.models import AbstractUser


class NOAAUser(AbstractUser):
    """Represents a User of the Wagtail system who can be authenticated in NOAA ICAM.

    For now, we do no special overrides. This model is just a placeholder
    we can manipulate down the road should we need to.
    It inherits all of the existing functionality of the default User model
    """
