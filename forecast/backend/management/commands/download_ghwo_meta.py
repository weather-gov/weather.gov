import json
from pathlib import Path

import requests
from django.core.management.base import BaseCommand, CommandError

from backend.models import WFO, HazardousWeatherOutlookMetadata


class Command(BaseCommand):
    """Download and process ghwo metadata files to json for each wfo."""

    help = "Download and process legend.json and chicklet.json files for each wfo."

    def add_arguments(self, parser):
        """Set up the cli parser arguments."""
        parser.add_argument(
            "--output-dir",
            help="Path to the output directory for the metadata files",
            default=Path(Path(__file__).parent, "..", "..", "ghwo-metadata"),
            type=str,
        )

        parser.add_argument(
            "--update-models",
            help="If present, will update the WFO models with processed metadata field",
            default=False,
            action="store_true",
        )

    def handle(self, *args, **options):
        """Fetch legend and chiclet for each wfo, then process and save metadata file for each."""
        for wfo in WFO.objects.all():
            wfo_code = wfo.normalized_code

            # Fetch legend and chiclet data from the
            # corresponding json endpoints
            try:
                legend = self.get_legend(wfo_code)
                chiclet = self.get_chiclet(wfo_code)
            except Exception as e:
                self.stdout.write(f"{e}")
                continue

            # Create a new dict that maps risk names to
            # metadata.
            result = {}

            # Pull what we need from the legend data.
            # For now, this is the metadata about the
            # different levels for a ris
            self.process_legend(legend, result)

            # Pull what we need from the chiclet data.
            # For now, this is just the description of how
            # the risk level is computed / described
            self.process_chiclet(chiclet, result)

            # Write the resulting metadata dictionary to the
            # output directory
            output_dir = options["output_dir"]
            output_dir.mkdir(parents=True, exist_ok=True)
            file_path = Path(output_dir, f"{wfo.code}.json")
            with open(file_path, "w") as fp:
                fp.write(
                    json.dumps(result, indent=4),
                )
                self.stdout.write(f"Wrote {file_path}")

            # If the user has flagged the cli to update the model,
            # do that with the parsed metadata dict
            if options["update_models"]:
                wfo.ghwo_metadata = result
                wfo.save()
                self.stdout.write(f"Updated {wfo.code} model with metadata")

    def process_chiclet(self, chiclet, result):
        """Pull out the data we need from the chiclet endpoint."""
        all_risk_types = {name: type for type, name in HazardousWeatherOutlookMetadata.get_all_types().values()}

        relevant_risks = [risk for risk in chiclet["hazards"] if risk["name"] in all_risk_types]

        for risk in relevant_risks:
            # We want to use the risk type ids as they appear in raw
            # ghwo data, not their labels
            risk_id = all_risk_types[risk["name"]]
            if risk_id not in result:
                result[risk_id] = {}
            result[risk_id]["basis_description"] = risk["description"]

    def process_legend(self, legend, result):
        """Pull out the data we need from the legend endpoint."""
        all_risk_types = {name: type for type, name in HazardousWeatherOutlookMetadata.get_all_types().values()}

        for risk_data in legend["hazards"]:
            if risk_data["name"] in all_risk_types:
                # We want to use the risk type ids as they appear in raw
                # ghwo data, not their labels
                risk_id = all_risk_types[risk_data["name"]]
                result[risk_id] = {
                    "levels": {
                        level_num: {
                            "label": level_info["levelName"],
                            "description": level_info["definition"],
                            "number": int(level_num),
                        }
                        for level_num, level_info in risk_data["category"].items()
                    },
                }

    def get_legend(self, wfo_code):
        """Fetch the legend metadata from the corresponding endpoint."""
        url = f"https://www.weather.gov/source/{wfo_code}/ghwo/legend.json"
        response = requests.get(url, timeout=20)
        if response.ok:
            return json.loads(response.text)
        raise CommandError(f"Could not fetch legend for {wfo_code}: [{response.status_code}] {response.text}")  #  noqa: TRY003

    def get_chiclet(self, wfo_code):
        """Fetch the chiclet metadata from the corresponding endpoint."""
        url = f"https://www.weather.gov/source/{wfo_code}/ghwo/chicklet.json"
        response = requests.get(url, timeout=20)
        if response.ok:
            return json.loads(response.text)
        raise CommandError(f"Could not fetch chiclet for {wfo_code}: [{response.status_code}] {response.text}")  #  noqa: TRY003
