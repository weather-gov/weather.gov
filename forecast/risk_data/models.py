from django.db import models
from django.db.models import JSONField


class RiskData(models.Model): # noqa: DJ008
    """
    Processed risk data.

    Represents processed risk data for a county or
    state, or, if there was an error, the error for the
    county or state record.
    """

    # The id will either be a string representation of a 5-digit county
    # FIPS code or the two-letter abbreviation for a state or territory
    id = models.CharField(max_length=5, primary_key=True, null=False)
    data = JSONField()

    class Meta:  # noqa: D106
        db_table = "weathergov_risk_data"


class RiskErrors(models.Model): # noqa: DJ008
    """
    Represents WFO-level errors for fetching risk data.

    If a WFO is represented here with is_error as true, it means
    that there was some error fetching ghwo/risk data for that
    WFO overall during a task cycle.
    """

    # The id here is the WFO code
    id = models.CharField(max_length=3, primary_key=True, null=False)
    is_error = models.BooleanField(default=False)

    class Meta: # noqa: D106
        db_table = "weathergov_risk_wfo_errors"

