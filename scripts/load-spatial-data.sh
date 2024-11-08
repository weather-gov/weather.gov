#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo 'Please specify a space to load spatial data into (i.e. beta)' >&2
    exit 1
fi

if [ ! "$(command -v jq)" ] || [ ! "$(command -v cf)" ]; then
    echo "jq and cf packages must be installed. Please install via your preferred manager."
    exit 1
fi

space=$(if [ "$1" = 'beta' ]; then echo "prod"; else echo "$1"; fi)

TARGET="weathergov-$1"

cf target -o nws-weathergov -s "$space"

# Get an available local port.
LOCAL_PORT=$(netstat -aln | awk '
  $6 == "LISTEN" {
    if ($4 ~ "[.:][0-9]+$") {
      split($4, a, /[:.]/);
      port = a[length(a)];
      p[port] = 1
    }
  }
  END {
    for (i = 3000; i < 65000 && p[i]; i++){};
    if (i == 65000) {exit 1};
    print i
  }
')

# Trap exit signals so we can force our background process to exit as well.
trap "exit" SIGINT SIGTERM
trap "kill 0" EXIT

# Get database service connection details from cf
cf curl "/v2/apps/$(cf app --guid "$TARGET")/env" | jq -r '.system_env_json.VCAP_SERVICES["aws-rds"][0].credentials' | jq -r '[.host, .port, .db_name, .username, .password]|@tsv' |
while read -r host port db username password; do
  echo "setting up SSH tunnel..."
  # open a tunnel
  cf ssh -N -T -L "$LOCAL_PORT":"$host":"$port" "$TARGET" &
  while ! netstat -tna | grep 'LISTEN' | grep -q ":$LOCAL_PORT"; do
    echo "...port not ready"
    sleep 3 # time in seconds, tune it as needed
  done

  # load
  docker compose run --rm -T spatial node load-shapefiles.js "$username" "$password" "$db" host.docker.internal "$LOCAL_PORT"
done
