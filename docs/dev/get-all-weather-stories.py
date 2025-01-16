#!/usr/bin/env python
#

import requests

import csv
import os
from datetime import datetime
import xml.etree.ElementTree as ET

# source: https://docs.google.com/spreadsheets/d/1jecu3PKpUoUPhTE-4i-g12N4Odx4_4uVlFmK-uhM_vk/edit?pli=1&gid=2144274847#gid=2144274847
filename = "sources.csv"

# make a directory with current day
output_dir = datetime.now().strftime('%Y-%m-%d')
if not os.path.exists(output_dir):
    os.mkdir(output_dir)


def process_ws(where_dir, ws, count):
    story = {child.tag.lower(): child.text for child in ws}

    # small image is technically optional
    if "smallimage" in story.keys():
        smallimage = story.pop("smallimage")
        if smallimage:
            print(f"  --> {count}: {smallimage}")
            complete_url = smallimage.startswith("http") or smallimage.startswith("www") # www.srh.noaa.gov
            url = smallimage if complete_url else f"https://www.weather.gov{smallimage}"
            ext = url.split(".")[-1]
            response = requests.get(url, allow_redirects=True)
            with open(f"{where_dir}/smallimage{count}.{ext}", "wb") as wfd:
                wfd.write(response.content)

    fullimage = story.pop("fullimage")
    if fullimage:
        print(f"  --> {count}: {fullimage}")
        complete_url = fullimage.startswith("http") or fullimage.startswith("www")
        url = fullimage if complete_url else f"https://www.weather.gov{fullimage}"
        ext = url.split(".")[-1]
        response = requests.get(url, allow_redirects=True)
        with open(f"{where_dir}/fullimage{count}.{ext}", "wb") as wfd:
            wfd.write(response.content)


with open(filename, "r") as fd:
    c = csv.reader(fd)
    next(c) # skip header
    for line in c:
        wfo = line[1]
        source = line[3].strip()
        if source == '':
            print(f"warning: could not process {wfo} as no source was given")
            continue

        print(f"processing {wfo}")

        output_wfo_dir = f"{output_dir}/{wfo}"
        if not os.path.exists(output_wfo_dir):
            os.mkdir(output_wfo_dir)

        response = requests.get(source, allow_redirects=True)
        xml = response.content.decode('utf-8')

        try:
            with open(f"{output_wfo_dir}/source.xml", "w+") as wfd:
                wfd.write(xml)

            tree = ET.parse(f"{output_wfo_dir}/source.xml")
            root = tree.getroot()
            count = 0
            for item in root.findall("./graphicasts/graphicast"):
                process_ws(output_wfo_dir, item, count)
                count += 1

        except Exception as e:
            print(f"error: generic exception {e}")
