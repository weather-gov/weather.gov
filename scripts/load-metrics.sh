#! /bin/bash

# Curl the site 20 times, clearing cache
# before each run. Time how long it takes
# to respond.
for i in {1..20}; do
    make cc
    /usr/bin/time -a -o curls_static.txt curl --silent --output /dev/null http://localhost:8080/point/40.693/-73.991
done

# Create a file with just the times
# pulled out
cat curls_static.txt | cut -d' ' -f9 > curls_static_times.txt

# Run lighthouse for FCR audit and
# output results, do so 20 times
for i in {1..20}; do
    npx lighthouse http://localhost:8080/point/21.31/-157.858 --only-audits first-meaningful-paint,first-contentful-paint,speed-index,total-blocking-time --output json --chrome-flags="--headless" | jq -M '.audits' > _current.json
    cat _current.json | jq '."total-blocking-time".numericValue' >> tbt.txt
    cat _current.json | jq '."first-meaningful-paint".numericValue' >> fmp.txt
    cat _current.json | jq '."first-contentful-paint".numericValue' >> fcp.txt
    cat _current.json | jq '."speed-index".numericValue' >> si.txt
    rm _current.json
done

rm _current.json
