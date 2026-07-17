#!/usr/bin/env bash
set -euo pipefail

# copied from Dockerfile
SUPERCRONIC_VERSION="v0.2.29"
SUPERCRONIC_SHA1="cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b"

# install once per cloud.gov deployment
BIN="$HOME/app/bin/supercronic"
mkdir -p "$HOME/app/bin"
if [ ! -x "$BIN" ]; then
  curl -fsSLo "$BIN" \
    "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64"
  echo "${SUPERCRONIC_SHA1} $BIN" | sha1sum -c -
  chmod +x "$BIN"
fi

export PATH="$HOME/app/bin:$PATH"

# modify the crontab to point to $HOME instead of /usr/local because we have no permissions to install on cloud.gov
sed -i 's/\/usr\/local/\/home\/vcap\/app/g' crontab
