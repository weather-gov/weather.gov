import json
from datetime import datetime, timedelta, timezone
from os import path

import requests
from django.core.management.base import BaseCommand, CommandError
from requests.auth import _basic_auth_str


class Command(BaseCommand):
    """Create example weather story and sitrep for local development and testing."""

    help = "Create a Weather Story image and entry, and a Situation Report pdf and entry"

    def add_arguments(self, parser):
        """Add arguments to the command."""
        parser.add_argument(
            "--story-image-path",
            help="Path to the weather story image file you want to load",
            default=path.join(path.dirname(__file__), "example_weather_story_image.png"),
            type=str,
        )
        parser.add_argument(
            "--sitrep-pdf-path",
            help="Path to the situation report pdf file you want to load",
            default=path.join(path.dirname(__file__), "example_situation_report.pdf"),
            type=str,
        )

    def handle(self, *args, **options):
        """Post weather story image/data and sitrep pdf/data to the server."""
        # Post the example situation report PDF file
        # and the corresponding data json
        pdf_id = self._post_sitrep_pdf(options["sitrep_pdf_path"])
        self._post_sitrep_data(pdf_id)

        # Post the example weather story image file
        # and the corresponding data json
        image_id = self._post_weatherstory_image(options["story_image_path"])
        self._post_weatherstory_data(image_id)

    def _post_weatherstory_image(self, image_path):
        """Post a weather story image to the wx endpoint and get the id."""
        with open(image_path, "rb") as fp:
            data = fp.read()

        url = "http://localhost:8080/jsonapi/node/wfo_weather_story_upload/field_fullimage"
        headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": _basic_auth_str("uploader", "uploader"),
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "file; filename=fullimage1.png",
        }

        try:
            self.stdout.write(f"Posting weather story image {image_path}")
            response = requests.post(
                url,
                data=data,
                headers=headers,
                timeout=60,
            )

            if response.status_code < 300:  #  noqa: PLR2004
                response_data = json.loads(response.text)
                id = response_data["data"]["id"]
                self.stdout.write(f"Successfully posted image with id {id}")
                self.stdout.write(response.text)
                return id
        except Exception as e:
            raise CommandError(f"Request error posting weather story image file: {e}") from e  #  noqa: TRY003

    def _post_weatherstory_data(self, id):
        """Post weather story data to the wx endpoint using an uploaded image id."""
        now = datetime.now(tz=timezone.utc)
        end = now + timedelta(days=100)
        post_data = {
            "data": {
                "type": "node--wfo_pdf_upload",
                "attributes": {
                    "title": "Sample Weather Story",
                    "field_description": "a sample weather story for illustrative purposes",
                    "field_office": "AJK",
                    "field_cwa_center_lat": "39.5709807",
                    "field_cwa_center_lon": "-119.8023437",
                    "field_starttime": now.replace(second=0, microsecond=0).timestamp(),
                    "field_endtime": end.replace(second=0, microsecond=0).timestamp(),
                    "field_graphicnumber": "1",
                    "field_order": "1",
                    "field_radar": "0",
                    "field_weburl": "/FXC/wxstory.php?wfo=rev",
                    "field_imageloop": None,
                    "field_frontpage": True,
                },
                "relationships": {
                    "field_fullimage": {
                        "data": {
                            "type": "file--file",
                            "id": id,
                        },
                    },
                },
            },
        }

        headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": _basic_auth_str("uploader", "uploader"),
            "Content-Type": "application/vnd.api+json",
        }
        url = "http://localhost:8080/jsonapi/node/wfo_weather_story_upload"
        response = requests.post(
            url,
            data=json.dumps(post_data),
            headers=headers,
            timeout=60,
        )

        if response.status_code < 300:  #  noqa: PLR2004
            self.stdout.write("Success writing weather story image file and data")
            self.stdout.write(response.text)

    def _post_sitrep_pdf(self, pdf_path):
        """Post a sitrep pdf file to the wx endpoint and get the id."""
        with open(pdf_path, "rb") as fp:
            data = fp.read()

        url = "http://localhost:8080/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep"
        headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": _basic_auth_str("uploader", "uploader"),
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'file; filename="test1.pdf"',
        }

        try:
            self.stdout.write(f"Posting situation report pdf {pdf_path}")
            response = requests.post(
                url,
                data=data,
                headers=headers,
                timeout=60,
            )

            if response.status_code < 300:  #  noqa: PLR2004
                response_data = json.loads(response.text)
                id = response_data["data"]["id"]
                self.stdout.write(f"Successfully posted PDF with id {id}")
                self.stdout.write(response.text)
                return id
        except Exception as e:
            raise CommandError(f"Error posting sitrep pdf: {e}") from e  #  noqa: TRY003

    def _post_sitrep_data(self, id):
        """Post sitrep data to the wx endpoint using an uploaded pdf id."""
        now = datetime.now(tz=timezone.utc)
        end = now + timedelta(days=100)
        post_data = {
            "data": {
                "type": "node--wfo_pdf_upload",
                "attributes": {
                    "title": "sample situation report",
                    "field_description": "a sample situation report for illustrative purposes",
                    "field_wfo_code": "AJK",
                    "field_cwa_center_lat": "39.5709807",
                    "field_cwa_center_lon": "-119.8023437",
                    "field_starttime": now.replace(second=0, microsecond=0).timestamp(),
                    "field_endtime": end.replace(second=0, microsecond=0).timestamp(),
                    "field_graphicnumber": "5",
                    "field_order": "5",
                    "field_radar": "0",
                    "field_weburl": "/FXC/wxstory.php?wfo=rev",
                    "field_imageloop": None,
                    "field_frontpage": True,
                },
                "relationships": {
                    "field_wfo_sitrep": {
                        "data": {
                            "type": "file--file",
                            "id": id,
                        },
                    },
                },
            },
        }

        headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": _basic_auth_str("uploader", "uploader"),
            "Content-Type": "application/vnd.api+json",
        }
        url = "http://localhost:8080/jsonapi/node/wfo_pdf_upload"
        response = requests.post(
            url,
            data=json.dumps(post_data),
            headers=headers,
            timeout=60,
        )

        if response.status_code < 300:  #  noqa: PLR2004
            self.stdout.write("Success writing situation report PDF file and data")
            self.stdout.write(response.text)
        else:
            self.stdout.write(str(response))
            raise CommandError(  #  noqa: TRY003
                f"Could not complete sitrep data post request. Failed with {response.status_code}: {response.text}",
            )
