#!/usr/bin/env bash
set -euo pipefail

BUCKET="wisaw.click-images"
SOURCE_DIR="apps/web/assets/images"
PROFILE="${AWS_PROFILE:-wisaw}"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: $SOURCE_DIR not found" >&2
    exit 1
fi

echo "Generating thumbnails..."
node "$(dirname "$0")/generate_thumbnails.mjs"

echo "Uploading images to s3://$BUCKET/images/ ..."
aws s3 sync "$SOURCE_DIR" "s3://$BUCKET/images/" \
    --profile "$PROFILE" \
    --cache-control "max-age=31536000, immutable" \
    --delete

# manifest.json は generate_thumbnails.mjs が向き補正済みの寸法で生成する。
# 上の sync でも上がるが immutable キャッシュになるため、短命キャッシュで上書きする。
MANIFEST_FILE="$SOURCE_DIR/gallery/manifest.json"
if [ -f "$MANIFEST_FILE" ]; then
    echo "Uploading gallery manifest..."
    aws s3 cp "$MANIFEST_FILE" "s3://$BUCKET/images/gallery/manifest.json" \
        --profile "$PROFILE" \
        --content-type "application/json" \
        --cache-control "max-age=60"
    echo "Gallery manifest uploaded."
fi

echo "Done."
