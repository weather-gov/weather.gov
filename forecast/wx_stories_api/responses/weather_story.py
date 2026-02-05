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
            "type": "node--wfo_weather_story_upload",
            "id": str(uuid),
            "links": {
                "self": {
                    "href": f"https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload/{uuid}",
                },
            },
            "attributes": {
                "title": attr["title"],
                "field_cwa_center_lat": attr["field_cwa_center_lat"],
                "field_cwa_center_lon": attr["field_cwa_center_lon"],
                "field_description": {
                    "value": attr["field_description"],
                    "format": None,
                    "processed": attr["field_description"],
                },
                "field_endtime": attr["field_endtime"],
                "field_frontpage": attr["field_frontpage"],
                "field_graphicnumber": attr["field_graphicnumber"],
                "field_office": attr["field_office"],
                "field_order": attr["field_order"],
                "field_radar": attr["field_radar"],
                "field_starttime": attr["field_starttime"],
                "field_weburl": attr["field_weburl"],
            },
            "relationships": {
                "field_fullimage": {
                    "data": {
                        "type": "file--file",
                        "id": str(uuid),
                        "meta": {
                            "alt": None,
                            "title": None,
                            "width": 1536,
                            "height": 864,
                            "drupal_internal__target_id": 253520,
                        },
                    },
                    "links": {
                        "related": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload/{uuid}/field_fullimage",
                        },
                        "self": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload/{uuid}/relationships/field_fullimage",
                        },
                    },
                },
                "field_smallimage": {
                    "data": {
                        "type": "file--file",
                        "id": str(uuid),
                        "meta": {
                            "alt": None,
                            "title": None,
                            "width": 1536,
                            "height": 864,
                            "drupal_internal__target_id": 253519,
                        },
                    },
                    "links": {
                        "related": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload/{uuid}/field_smallimage",
                        },
                        "self": {
                            "href": f"https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload/{uuid}/relationships/field_smallimage",
                        },
                    },
                },
            },
        },
        "links": {
            "self": {
                "href": "https://beta.weather.gov/jsonapi/node/wfo_weather_story_upload",
            },
        },
    }
