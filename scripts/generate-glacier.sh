#!/bin/bash

source_dir=$(pwd)/forecast/frontend/assets/images/front-page/backgrounds/
source_image=${source_dir}wx_homepage_glacier_original.jpg
source_image_cropped=${source_dir}wx_homepage_glacier_original_cr.jpg
output_prefix=wx_glacier
#declare -a qualities=("80" "70" "60")

for size in 2000 1440; do
    for quality in 80 70 60; do
        # AVIF
        avif_filename=${output_prefix}_${size}_${quality}.avif
        avif_cropped_filename=${output_prefix}_${size}_${quality}_cr.avif
        # Uncropped AVIF
        magick $source_image -resize ${size}x -define avif:speed=1 -quality $quality ${source_dir}${avif_filename}
        echo "Wrote ${avif_filename}"
        # Cropped AVIF
        magick $source_image_cropped -resize ${size}x -define avif:speed=1 -quality $quality ${source_dir}${avif_cropped_filename}
        echo "Wrote ${avif_cropped_filename}"

        # JPEG
        jpeg_filename=${output_prefix}_${size}_${quality}.jpg
        jpeg_cropped_filename=${output_prefix}_${size}_${quality}_cr.jpg
        # Uncropped JPEG
        magick $source_image -resize ${size}x -quality $quality ${source_dir}${jpeg_filename}
        echo "Wrote $jpeg_filename"
        # Cropped JPEG
        magick $source_image_cropped -resize ${size}x -quality $quality ${source_dir}${jpeg_cropped_filename}
        echo "Wrote $jpeg_cropped_filename"

        # WebP
        webp_filename=${output_prefix}_${size}_${quality}.webp
        webp_cropped_filename=${output_prefix}_${size}_${quality}_cr.webp
        # Uncropped WebP
        magick $source_image -resize ${size}x -define webp:sns-strength=80 -define webp:filter-sharpness=3 -define webp:filter-strength=30 -define webp:preprocessing=2 -quality $quality -define webp:lossless=false ${source_dir}${webp_filename}
        echo "Wrote $webp_filename"
        # Croipped WebP
        magick $source_image_cropped -resize ${size}x -define webp:sns-strength=80 -define webp:filter-sharpness=3 -define webp:filter-strength=30 -define webp:preprocessing=2 -quality $quality -define webp:lossless=false ${source_dir}${webp_cropped_filename}
        echo "Wrote $webp_cropped_filename"
    done
done

