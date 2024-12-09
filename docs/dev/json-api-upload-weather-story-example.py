#!/usr/bin/env python

import requests  # https://pypi.org/project/requests/
import os
import sys
import xml.etree.ElementTree as ET

# This is a sample python script to demonstrate how to upload a WFO weather
# story, which contains several images. This script is for educational purposes
# only and is intended to aid as a helper for integration.

# configuration options
endpoint = "http://localhost:8080"
user = "uploader"
password = "uploader"
ws_filename = "WeatherStory.xml"
wfo_code = "EAX"

if len(sys.argv) != 2:
    # override the filename if passed via cli args
    ws_filename = sys.argv[1]


def upload_file(filename, data, field):
    headers = {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/octet-stream",
        "Content-Disposition": f'file; filename="{filename}"',
    }
    resp = requests.post(
        f"{endpoint}/jsonapi/node/wfo_weather_story_upload/field_{field}",
        data=data,
        headers=headers,
        auth=(user, password),
    )
    if resp.status_code != 201:
        errors = resp.json()["errors"]
        print(f"error: could not upload file: {errors}")
        return None
    return resp.json()["data"]["id"]


def upload_content_type(small_image_id, full_image_id, data):
    headers = {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }

    # because a Drupal content type expects a title, rename field_title to title
    title = data.pop("field_title")
    data.update({"title": title})
    data.update({"field_office", wfo_code})

    # process frontpage to be a proper True/False
    frontpage = data.pop("field_frontpage")
    data.update({"field_frontpage": frontpage == "true"})

    images = {
        "field_fullimage": {
            "data": {
                "type": "file--file",
                "id": full_image_id,
            },
        },
    }
    if small_image_id:
        images.update(
            {
                "field_smallimage": {
                    "data": {
                        "type": "file--file",
                        "id": small_image_id,
                    },
                }
            }
        )
    payload = {
        "data": {
            "type": "node--wfo_weather_story_upload",
            "attributes": data,
            "relationships": images,
        },
    }
    resp = requests.post(
        f"{endpoint}/jsonapi/node/wfo_weather_story_upload",
        json=payload,
        headers=headers,
        auth=(user, password),
    )
    if resp.status_code != 201:
        errors = resp.json()["errors"]
        print(f"error: could not upload the content type: {errors}")
        return False
    return True


number = 0
tree = ET.parse(ws_filename)
root = tree.getroot()
for item in root.findall("./graphicasts/graphicast"):

    number += 1
    print(f"processing weather story #{number}")

    story = {f"field_{child.tag.lower()}": child.text for child in item}
    if "imageloop" in story.keys():
        del story["imageloop"]  # not used as far as we know

    # extract the images for upload
    small_image_id = None
    full_image_id = None

    if "field_smallimage" in story.keys():
        smallimage = story.pop("field_smallimage")
        url = smallimage if smallimage.startswith("https://www.weather.gov") else f"https://www.weather.gov{smallimage}"
        response = requests.get(url, allow_redirects=True)
        small_image_id = upload_file(
            f"smallimage{number}.png", response.content, "smallimage"
        )
        if not small_image_id:
            continue

    # full image is required
    fullimage = story.pop("field_fullimage")
    url = fullimage if fullimage.startswith("https://www.weather.gov") else f"https://www.weather.gov{fullimage}"
    response = requests.get(url, allow_redirects=True)
    full_image_id = upload_file(f"fullimage{number}.png", response.content, "fullimage")
    if not full_image_id:
        continue

    result = upload_content_type(small_image_id, full_image_id, story)

    if not result:
        print(f"error: could not upload weather story #{number}")
    else:
        print(f"uploaded weather story #{number}")
