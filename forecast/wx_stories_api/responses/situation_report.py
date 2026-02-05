def response(attr, uuid):
    """Template out the JSON response."""
    return {
        "jsonapi": {
            "version": "1.0",
            "meta": {
                "links": {
                    "self": {
                        "href": "http: //jsonapi.org/format/1.0/",
                    },
                },
            },
        },
        "data": {
            "type": "node--wfo_pdf_upload",
            "id": str(uuid),
            "links": {
                "self": {
                    "href": f"https://beta.weather.gov/jsonapi/node/wfo_pdf_upload/{uuid}",
                },
            },
            "attributes": {
                "title": attr["title"],
                "field_wfo_code": attr["field_wfo_code"],
            },
            "relationships": {
                "field_wfo_sitrep": {
                    "data": {
                        "type": "file--file",
                        "id": str(uuid),
                        "meta": {
                            "alt": None,
                            "title": None,
                            "drupal_internal__target_id": 253520,
                        },
                    },
                    "links": {
                        "related": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_pdf_upload/{uuid}/field_wfo_sitrep",
                        },
                        "self": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_pdf_upload/{uuid}/relationships/field_wfo_sitrep",
                        },
                    },
                },
            },
        },
        "links": {
            "self": {
                "href": "https://beta.weather.gov/jsonapi/node/wfo_pdf_upload",
            },
        },
    }
