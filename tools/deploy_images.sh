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

GALLERY_DIR="$SOURCE_DIR/gallery"
if [ -d "$GALLERY_DIR" ]; then
    echo "Generating gallery manifest..."
    MANIFEST_FILE=$(mktemp)
    python3 -c "
import struct, os, sys, json

def img_size(p):
    with open(p, 'rb') as f:
        head = f.read(65536)
    if head[:4] == b'\x89PNG':
        w, h = struct.unpack('>II', head[16:24])
        return w, h
    if head[:2] == b'\xff\xd8':
        off = 2
        while off < len(head) - 9:
            if head[off] != 0xff: break
            m = head[off+1]
            if m in (0xc0, 0xc1, 0xc2):
                h, w = struct.unpack('>HH', head[off+5:off+9])
                return w, h
            if m in (0xda, 0xd9): break
            off += 2 + struct.unpack('>H', head[off+2:off+4])[0]
    return 1, 1

d = sys.argv[1]
exts = ('.jpg','.jpeg','.png','.webp','.gif','.avif')
entries = []
for f in sorted(os.listdir(d)):
    if any(f.lower().endswith(e) for e in exts):
        w, h = img_size(os.path.join(d, f))
        entries.append({'file': f, 'w': w, 'h': h})
json.dump(entries, open(sys.argv[2], 'w'))
" "$GALLERY_DIR" "$MANIFEST_FILE"
    aws s3 cp "$MANIFEST_FILE" "s3://$BUCKET/images/gallery/manifest.json" \
        --profile "$PROFILE" \
        --content-type "application/json" \
        --cache-control "max-age=60"
    rm "$MANIFEST_FILE"
    echo "Gallery manifest uploaded."
fi

echo "Done."
