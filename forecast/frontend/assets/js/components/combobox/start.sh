#!/bin/bash

ln -s ../../../fonts fonts
ln -s ../../../images images
ln -s ../../../css/styles.css styles.css

python -m http.server
