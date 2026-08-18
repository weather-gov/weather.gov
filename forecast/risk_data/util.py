from risk_data.models import RiskData, RiskErrors


def get_errors_from_risk_data(risk_data):
    """Check to see if the risk data has any error(s).

    Return a concatenated string of all the errors.

    Risk data appears as follows:
    {
    "errors": {
        "wfo": "ABC",
        "kind": "county|state|wfo|generic",
        "localityCode": "<fips-or-statecode>",
        "errors": ["A list of error message strings"],
      }
    }
    """
    if "errors" not in risk_data:
        return None

    # If there are no error messages in the contained list,
    # we will compose a generic one
    if "errors" not in risk_data["errors"]:
        risk_type = risk_data.get("type", "unknown type")
        locality = risk_data.get("localityCode", "unknown locality")
        wfo = risk_type.get("wfo", "unknown wfo")
        return f"Error: {risk_type} error for {locality} at {wfo}"
    concat_messages = "\n".join(risk_data["errors"]["errors"])
    return f"Error: {concat_messages}"


def get_risk_data_for_county(county_fips, wfo):
    """Get county risk data from the database."""
    # First, we attempt to retrieve the JSON data from the
    # RiskData model
    county_data = RiskData.objects.filter(id=county_fips).values("id", "data")
    if len(county_data) != 0:
        errors = get_errors_from_risk_data(county_data[0]["data"])
        if errors:
            return {"error": errors, "errorData": county_data[0]["data"].get("errors", None) }
        return county_data[0]["data"]

    # If there was no record found for the county, check to see
    # if there was an error fetching data for the corresponding WFO
    wfos_with_errors = RiskErrors.objects.filter(id=wfo, is_error=True)
    if len(wfos_with_errors) > 0:
        return {"error": "WFO Risk Error", "wfo": wfo}

    return {"error": True}

def get_risk_data_for_state(state_code):
    """Get state risk data from the database."""
    # First, we attempt to retrieve the JSON data from the
    # RiskData model
    state_data = RiskData.objects.filter(id=state_code).values("id", "data")
    if len(state_data) != 0:
        errors = get_errors_from_risk_data(state_data[0]["data"])
        if errors:
            return {"error": errors, "errorData": state_data[0]["data"]["errors"]}
        return state_data[0]["data"]

    # Unlike with counties, the lack of presence in the database
    # will indicate an overall error for the state. We do not for the
    # moment distinguish between the error types, so we can return
    # a basic error structure
    return {"error": True}
