def response(uuid, original_filename):
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
            "type": "file--file",
            "id": str(uuid),
            "links": {
                "self": {
                    "href": f"https://beta.weather.gov/jsonapi/file/file/{uuid}",
                },
            },
            "attributes": {
                "uri": {
                    "value": f"private://tmp/2141792331/{original_filename}",
                    "url": f"/system/files/tmp/2141792331/{original_filename}",
                },
                "origname": original_filename,
            },
        },
        "links": {
            "self": {
                "href": f"https://beta.weather.gov/jsonapi/file/file/{uuid}",
            },
        },
    }
