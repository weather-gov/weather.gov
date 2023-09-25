#!/bin/bash 
set -euo pipefail

while true
do
  drush --root=$HOME/web core:cron
  sleep 15m
done
