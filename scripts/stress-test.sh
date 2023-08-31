#!/bin/bash

# from https://gist.github.com/jddonovan/c423c7e5bc008df3c4b8e1424fefd504/30ee0d38055b7ff4e3d7ff2a62695ba6a15ebe44

#### Default Configuration

CONCURRENCY=8
REQUESTS=10
ADDRESS="http://localhost:8080/"

show_help() {
cat << EOF
Naive Stress Test with cURL.

Usage: ./stress-test.sh [-a ADDRESS] [-c CONCURRENCY] [-r REQUESTS]

Params:
  -a  address to be tested.
      Defaults to localhost:8080

  -c  conccurency: how many process to spawn
      Defaults to 1

  -r  number of requests per process
      Defaults to 10

  -h  show this help text

Example:
  $ ./stress-test.sh -c 4 -p 100 (400 requests to localhost:8080)
EOF
}


#### CLI

while getopts ":a:c:r:h" opt; do
  case $opt in
    a)
      ADDRESS=$OPTARG
      ;;
    c)
      CONCURRENCY=$OPTARG
      ;;
    r)
      REQUESTS=$OPTARG
      ;;
    h)
      show_help
      exit 0
      ;;
    \?)
      show_help >&2
      echo "Invalid argument: $OPTARG" &2
      exit 1
      ;;
  esac
done

shift $((OPTIND-1))

#### Main

for i in `seq 1 $CONCURRENCY`; do
  curl --silent --output /dev/null -s "$ADDRESS?[1-$REQUESTS]_$RANDOM" & pidlist="$pidlist $!"
done

# Execute and wait
FAIL=0
for job in $pidlist; do
  echo $job
  wait $job || let "FAIL += 1"
done

# Verify if any failed
if [ "$FAIL" -eq 0 ]; then
  echo "SUCCESS!"
else
  echo "Failed Requests: ($FAIL)"
fi
