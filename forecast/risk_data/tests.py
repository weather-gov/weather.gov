from unittest import mock

from django.test import TestCase

from risk_data.util import get_risk_data_for_county, get_risk_data_for_state


class TestRiskDataUtils(TestCase):
    """Tests our risk_data utilities."""

    @mock.patch("risk_data.util.RiskData.objects.filter", autospec=True)
    def test_get_risk_data_for_county_with_errors(self, mocked_filter_func):
        """Test getting risk data that has errors in it."""
        data = {
            "id": "51013",
            "data": {
                "errors": {
                    "wfo": "ABC",
                    "kind": "county|state|wfo|generic",
                    "localityCode": "<fips-or-statecode>",
                    "errors": ["A list of error message strings"],
                }
            }
        }

        mock_values = mock.Mock()
        mock_values.values.return_value = [data]
        mocked_filter_func.return_value = mock_values

        expected = {
            "error": "Error: A list of error message strings",
            "errorData": data["data"]["errors"]
        }

        actual = get_risk_data_for_county("51013", "LWX")

        self.assertEqual(actual, expected)

    @mock.patch("risk_data.util.RiskData.objects.filter")
    @mock.patch("risk_data.util.RiskErrors.objects.filter")
    def test_get_risk_data_for_county_empty_query_result(self, mock_risk_errors_filter, mock_risk_data_filter):
        """Test getting risk data that is not present in the table."""
        mock_value_getter = mock.Mock()

        # Return an empty query result for risk data
        mock_value_getter.values.return_value = []
        mock_risk_data_filter.return_value = mock_value_getter

        # When checking for WFO errors, return an empty result
        # which corresponds to no error recorded for that WFO
        mock_risk_errors_filter.return_value = []

        expected = {"error": True}
        actual = get_risk_data_for_county("51013", "ABC")

        self.assertEqual(expected, actual)

    @mock.patch("risk_data.util.RiskData.objects.filter")
    @mock.patch("risk_data.util.RiskErrors.objects.filter")
    def test_get_risk_data_for_county_empty_query_result_wfo_error(
            self,
            mock_risk_errors_filter,
            mock_risk_data_filter
    ):
        """Test getting risk data not present in the table, for a corresponding WFO."""
        mock_value_getter = mock.Mock()

        # Return an empty query result for risk data
        mock_risk_data_filter.return_value = mock_value_getter
        mock_value_getter.values.return_value = []

        # When checking for WFO errors, return a result
        mock_risk_errors_filter.return_value = ["ABC"]

        expected = {
            "error": "WFO Risk Error",
            "wfo": "ABC"
        }
        actual = get_risk_data_for_county("51013", "ABC")

        self.assertEqual(expected, actual)

    @mock.patch("risk_data.util.RiskData.objects.filter")
    def test_get_risk_data_for_county_ok(self, mock_risk_data_filter):
        """Test getting risk data that is ok."""
        mock_value_getter = mock.Mock()
        data = [{"data": {"hello": True}, "id": "51013"}]
        mock_value_getter.values.return_value = data
        mock_risk_data_filter.return_value = mock_value_getter

        expected = data[0]["data"]
        actual = get_risk_data_for_county("51013", "ABC")

        self.assertEqual(expected, actual)

    @mock.patch("risk_data.util.RiskData.objects.filter", autospec=True)
    def test_get_risk_data_for_state_with_errors(self, mock_risk_data_filter):
        """Test getting state risk data that has errors in it."""
        data = {
            "id": "VA",
            "data": {
                "errors": {
                    "wfo": "ABC",
                    "kind": "county|state|wfo|generic",
                    "localityCode": "<fips-or-statecode>",
                    "errors": ["A list of error message strings"],
                }
            }
        }

        mock_values = mock.Mock()
        mock_values.values.return_value = [data]
        mock_risk_data_filter.return_value = mock_values

        expected = {
            "error": "Error: A list of error message strings",
            "errorData": data["data"]["errors"]
        }

        actual = get_risk_data_for_state("VA")

        self.assertEqual(expected, actual)

    @mock.patch("risk_data.util.RiskData.objects.filter")
    def test_get_risk_data_for_state_ok(self, mock_risk_data_filter):
        """Test getting state risk data that is ok."""
        input = [
            {"id": "VA", "data": {"hello": True}}
        ]
        mock_value_getter = mock.Mock()
        mock_value_getter.values.return_value = input
        mock_risk_data_filter.return_value = mock_value_getter

        expected = input[0]["data"]
        actual = get_risk_data_for_state("VA")

        self.assertEqual(expected, actual)
