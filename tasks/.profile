#!/usr/bin/env bash
set -euo pipefail

# copied from Dockerfile
SUPERCRONIC_VERSION="v0.2.29"
SUPERCRONIC_SHA1="cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b"
WGRIB2_VERSION="wgrib-v3.8.0"
WGRIB2_SHA256="7670bad9ed9e5f316a0d2f56a09f917b5909fee551d9618dac92e05aec1121f9"

# install once per cloud.gov deployment
SUPERCRONIC_BIN="$HOME/app/bin/supercronic"
mkdir -p "$HOME/app/bin"
if [ ! -x "$SUPERCRONIC_BIN" ]; then
  curl -fsSLo "$SUPERCRONIC_BIN" \
    "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64"
  echo "${SUPERCRONIC_SHA1} $SUPERCRONIC_BIN" | sha1sum -c -
  chmod +x "$SUPERCRONIC_BIN"
fi

WGRIB2_BIN="$HOME/app/bin/wgrib2"
if [ ! -x "$WGRIB2_BIN" ]; then
  curl -fsSLo "$WGRIB2_BIN" \
    "https://github.com/weather-gov/weather.gov/releases/download/${WGRIB2_VERSION}/wgrib2"
  echo "${WGRIB2_SHA256} $WGRIB2_BIN" | sha256sum -c -
  chmod +x "$WGRIB2_BIN"
fi

export PATH="$HOME/app/bin:$PATH"

# modify the crontab to point to $HOME instead of /usr/local because we have no permissions to install on cloud.gov
sed -i 's/\/usr\/local/\/home\/vcap\/app/g' crontab
