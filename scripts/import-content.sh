#! /bin/bash

echo "Importing all content files..."

for file in web/scs-export/*; do
    file=${file#*/};
    drush content:import $file;
done
