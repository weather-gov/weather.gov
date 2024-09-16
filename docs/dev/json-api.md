# JSON:API

## Modules

We have enabled and configured the core Drupal [`jsonapi`](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/api-overview) module specifically to allow uploading of WFO daily situation reports, which are produced as PDFs.

We are also enabling the following core Drupal modules:

- [`basic_auth`](https://www.drupal.org/docs/8/core/modules/basic_auth/overview) for authentication
- [`jsonapi_extras`](https://www.drupal.org/project/jsonapi_extras) by default, prevent resources (and resource fields) from being accessible via the API
- `jsonapi_defaults` is a submodule of the above which adds defaults to API resource types
- [`serialization`](https://www.drupal.org/docs/8/core/modules/serialization/overview) for JSON support

## Configuration

A new content type, `wfo_pdf_upload` was created for WFO daily situation reports. The `field_wfo_sitrep` field holds the PDF file.

We have configured JSON:API to only display `wfo_pdf_upload`s and `file`s. (The latter is needed because we need to upload the PDF and then link the PDF to the `wfo_pdf_upload`.) Furthermore, `wfo_pdf_upload` is configured to only allow the `title` and `field_wfo_sitrep` fields to be shown or set. `file` is configured to only allow the `uri` field to be shown. 

We have also configured a new user type, `uploader`, which has no permissions except to create new `wfo_pdf_upload`s.

Because JSON:API follows Drupal entity permissions, JSON:API also respects the user permissions for that entity type. This permission system is not sufficient in and of itself (for example, `anonymous` users could browse the JSON API, including viewing `file`s and `wfo_pdf_upload`s, because `anonymous` users can `view published content`.). So, to further restrict access, we have added a `JsonApiLimitingRouteSubscriber` that mandates an `uploader` role for the API. All other users will get a `403` response.

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

A sample [Python script](./json-api-upload-example.py) is provided to help to aid in integration. Note that this script depends on the [requests](https://pypi.org/project/requests/) library.
