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

For `wfo_pdf_upload`, the `field_wfo_sitrep` field holds the PDF file. For `wfo_weather_story_upload`, `field_fullimage` (required) and `field_smallimage` (optional) hold the weather story images.

We have configured JSON:API to only display `wfo_pdf_upload`s, `wfo_weather_story_upload`s, and `file`s. (`file` is needed because we need to upload the PDF or image and then link the PDF or image to the appropriate field) Furthermore, `file` is configured to only allow the `uri` field to be shown. Note that any PDFs or images uploaded will be publicly available.

We have also configured a new user type, `uploader`, which has no permissions except to create new `wfo_pdf_upload`s and `wfo_weather_story_upload`s.

Because JSON:API follows Drupal entity permissions, JSON:API also respects the user permissions for that entity type. This permission system is not sufficient in and of itself (for example, `anonymous` users could browse the JSON API, including viewing `file`s, `wfo_pdf_upload`s, and `wfo_weather_story_upload`s, because `anonymous` users can `view published content`.). So, to further restrict access, we have added a `JsonApiLimitingRouteSubscriber` that mandates an `uploader` role for the API. All other users will get a `403` response.

# Example

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
              "title": "test.pdf"
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
