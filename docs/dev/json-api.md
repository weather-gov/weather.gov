# JSON:API

## Modules

We have enabled and configured the core Drupal [`jsonapi`](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/api-overview) module specifically to allow uploading of WFO daily situation reports, which are produced as PDFs.

We are also enabling the following core Drupal modules:

- [`basic_auth`](https://www.drupal.org/docs/8/core/modules/basic_auth/overview) for authentication
- [`jsonapi_extras`](https://www.drupal.org/project/jsonapi_extras) by default, prevent resources (and resource fields) from being accessible via the API
- `jsonapi_defaults` is a submodule of the above which adds defaults to API resource types
- [`serialization`](https://www.drupal.org/docs/8/core/modules/serialization/overview) for JSON support

## Configuration

Two new content types, `wfo_pdf_upload` and `wfo_weather_story_upload` were created for WFO daily situation reports and WFO weather stories, respectively. 

The `wfo_pdf_upload` may take three fields:

- `title` (required). The PDF filename.
- `field_wfo_code` (required). The WFO code corresponding to this PDF. e.g., `ABQ`
- `field_wfo_sitrep` (required). An reference to a previously uploaded PDF file.

The `wfo_weather_story_upload` may take four fields:

- `field_office` (required). The WFO code corresponding to this weather story. e.g., `LCH`
- `field_fullimage` (required). A reference to a previously uploaded image.
- `field_smallimage` (optional). A reference to a previously uploaded image.
- `field_description` (required). The description of the weather story.

We have configured JSON:API to only display `wfo_pdf_upload`s, `wfo_weather_story_upload`s, and `file`s. (`file` is needed because we need to upload the PDF or image and then link the PDF or image to the appropriate field) Furthermore, `file` is configured to only allow the `uri` field to be shown. Note that any PDFs or images uploaded will be publicly available.

We have also configured a new user type, `uploader`, which has no permissions except to create new `wfo_pdf_upload`s and `wfo_weather_story_upload`s.

Because JSON:API follows Drupal entity permissions, JSON:API also respects the user permissions for that entity type. This permission system is not sufficient in and of itself (for example, `anonymous` users could browse the JSON API, including viewing `file`s, `wfo_pdf_upload`s, and `wfo_weather_story_upload`s, because `anonymous` users can `view published content`.). So, to further restrict access, we have added a `JsonApiLimitingRouteSubscriber` that mandates an `uploader` role for the API. All other users will get a `403` response.

# PDF upload example

Uploading a WFO sitrep is a two step process. Here, we use `curl` as an example. We also assume an `uploader` user type is used with the password `uploader` (please do not create this example user for any public site).

First, we upload the PDF itself to the `wfo_pdf_upload/field_wfo_sitrep` field (note: you can create a blank PDF by using [`imagemagick`](https://imagemagick.org/index.php): `magick xc:none -page Letter test.pdf`):

    curl -sL \
      --user uploader:uploader \
      -H 'Accept: application/vnd.api+json' \
      -H 'Content-Type: application/octet-stream' \
      -H 'Content-Disposition: file; filename="test.pdf"' \
      --data-binary @test.pdf \
      http://localhost:8080/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep

The response should be a 201 with JSON information about the newly uploaded file attributes. We want the `id` of the newly uploaded file for the next step. (You can use `jq` and add a pipe: `| jq "data.id"` above to more easily retrieve the resulting `id`.)

Let's assume the newly created PDF `id` is `9986844e-c190-428a-b152-7c3a03244b71`.

Second, we create the `wfo_pdf_upload` entity itself and link the PDF `id`:

    curl -sL \
      --user uploader:uploader \
      -H 'Accept: application/vnd.api+json' \
      -H 'Content-Type: application/vnd.api+json' \
      -d '{"data": {
            "type": "node--wfo_pdf_upload",
            "attributes": {
              "title": "test.pdf",
              "field_wfo_code": "EAX"
            },
            "relationships": {
              "field_wfo_sitrep": {
                "data": {
                  "type": "file--file",
                  "id": "9986844e-c190-428a-b152-7c3a03244b71"
                }
              }
            }
          }
        }' \
     http://localhost:8080/jsonapi/node/wfo_pdf_upload

The response should also be a 201 with JSON information about the newly created `wfo_pdf_upload` entity.

# Weather story image upload example

Similarly, uploading weather stories is a two-step process. We upload to different endpoints with different field names but the process is the same. First, start with uploading the image(s):

The `field_fullimage` is required.

    curl -sL \
      --user uploader:uploader \
      -H 'Accept: application/vnd.api+json' \
      -H 'Content-Type: application/octet-stream' \
      -H 'Content-Disposition: file; filename="fullimage.png"' \
      --data-binary @fullimage.png \
      http://localhost:8080/jsonapi/node/wfo_weather_story_upload/field_fullimage

Optionally one can also upload the `field_smallimage`.

    curl -sL \
      --user uploader:uploader \
      -H 'Accept: application/vnd.api+json' \
      -H 'Content-Type: application/octet-stream' \
      -H 'Content-Disposition: file; filename="smallimage.png"' \
      --data-binary @smallimage.png \
      http://localhost:8080/jsonapi/node/wfo_weather_story_upload/field_smallimage

And then we create the `wfo_weather_story_upload` and link the image(s) accordingly:

    curl -sL \
      --user uploader:uploader \
      -H 'Accept: application/vnd.api+json' \
      -H 'Content-Type: application/vnd.api+json' \
      -d '{"data": {
            "type": "node--wfo_pdf_upload",
            "attributes": {
              "title": "sample weather story",
              "field_description": "a sample weather story for illustrative purposes",
              "field_office": "QQQ"
            },
            "relationships": {
              "field_fullimage": {
                "data": {
                  "type": "file--file",
                  "id": "aab4348b-08d3-4317-9707-4b1238b2d0d6"
                }
              },
              "field_smallimage": {
                "data": {
                  "type": "file--file",
                  "id": "1831642e-8af7-490e-83c0-a61c7f4a462f"
                }
              }
            }
          }
        }' \
     http://localhost:8080/jsonapi/node/wfo_weather_story_upload

The response should also be a 201 with JSON information about the newly created `wfo_weather_story_upload` entity.

# Integration Example

We have sample Python scripts to aid with integration. Note that these scripts depend on the [requests](https://pypi.org/project/requests/) library.

- [Sample PDF upload script](./json-api-upload-pdf-example.py)
- [Sample weather story upload script](./json-api-upload-weather-story-example.py)

Sample data (randomly chosen):

- [PIH Weather Story](https://www.weather.gov/source/pih/WxStory/WeatherStory.xml)
- [EAX Daily Situation PDF](https://www.weather.gov/media/eax/DssPacket.pdf)

We also have [outside tests for uploads](../../tests/playwright/outside/api.spec.js).

# IP Address Filtering

To implement IP address filtering, we are using a [route service](https://docs.cloudfoundry.org/services/route-services.html) which involves creating an user-provided service as a route service in a separate cloud.gov app. To route, we use [Caddy](https://caddyserver.com/) as a [reverse proxy](../../proxy/Caddyfile). This configuration permits all traffic to pass through to the weather.gov application except for the `/jsonapi` endpoint, which is restricted by IP address.

Setting this up requires [several steps](../../scripts/create-cloudgov-env.sh#L101-L115):

- an internal route to the weather.gov application for container-to-container networking
- an user-provided service using the Caddy proxy above
- a route service that tells cloud.gov to use the Caddy proxy above to reach the weather.gov application
- a secure network policy for the weather.gov application
  - note that we use port `61443`: [all traffic sent to this port will use SSL/TLS](https://docs.cloudfoundry.org/concepts/understand-cf-networking.html#securing-traffic).
