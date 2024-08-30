#!/usr/bin/env python

import requests # https://pypi.org/project/requests/
import subprocess
import base64
import os
import sys

# This is a sample python script to demonstrate how to upload a WFO daily
# situation report, which is produced as a PDF. This script is for educational
# purposes only and is intended to aid as a helper for integration.

# configuration options
endpoint = 'http://localhost:8080'
user = 'uploader'
password = 'uploader'
pdf_filename = 'test.pdf'

# if we don't have one already, create a pdf for uploading; requires magick
if not os.path.exists(pdf_filename):
    _ = subprocess.run(['magick', 'xc:none', '-page', 'Letter', pdf_filename])

pdf_data = open(pdf_filename, 'rb').read()

# first step: upload the pdf file
headers = {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': f'file; filename="{pdf_filename}"',
}
resp = requests.post(f'{endpoint}/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep',
                     data=pdf_data,
                     headers=headers,
                     auth=(user, password))
if resp.status_code != 201:
    print(f'could not upload pdf: {resp.text}')
    sys.exit(1)
print(f'successfully uploaded pdf: {resp.json()}')

# second step: grab the ID of the file we just uploaded
uploaded_file_id = resp.json()['data']['id']

# last step: create the wfo_pdf_upload type
payload = {
    'data': {
        'type': 'node--wfo_pdf_upload',
        'attributes': {
            'title': pdf_filename,
        },
        'relationships': {
            'field_wfo_sitrep': {
                'data': {
                    'type': 'file--file',
                    'id': uploaded_file_id,
                }
            }
        }
    }
}
headers = {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
}
resp = requests.post(f'{endpoint}/jsonapi/node/wfo_pdf_upload', json=payload, headers=headers, auth=(user, password))
if resp.status_code != 201:
    print(f'could not finish wfo pdf upload: {resp.text}')
    sys.exit(1)

print(f'created a new WFO daily situation report: {resp.json()}')
