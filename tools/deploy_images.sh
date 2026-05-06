#!/usr/bin/env bash
set -euo pipefail

BUCKET="wisaw.click-images"
SOURCE_DIR="apps/web/assets/images"
PROFILE="${AWS_PROFILE:-wisaw}"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: $SOURCE_DIR not found" >&2
    exit 1
fi

echo "Uploading images to s3://$BUCKET/images/ ..."
aws s3 sync "$SOURCE_DIR" "s3://$BUCKET/images/" \
    --profile "$PROFILE" \
    --cache-control "max-age=31536000, immutable" \
    --delete

echo "Done."
