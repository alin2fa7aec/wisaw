#!/usr/bin/env bash
set -euo pipefail

# sharp をネイティブバイナリごと Lambda レイヤーへ固める。
#
# apps/api は esbuild --bundle でビルドしているが、sharp はネイティブモジュールなので
# バンドルすると壊れる。--external:sharp で除外し、実体はこのレイヤーから供給する。
#
# pnpm ではなく npm を使うのは、pnpm の node_modules がシンボリックリンクで構成されており
# SAM のパッケージングで解決できないため。

SHARP_VERSION="0.34.5"
# cd するため絶対パスで解決しておく
LAYER_DIR="$(cd "$(dirname "$0")/.." && pwd)/layers/sharp"
TARGET="$LAYER_DIR/nodejs"

rm -rf "$LAYER_DIR"
mkdir -p "$TARGET"

cd "$TARGET"
cat > package.json <<JSON
{
  "name": "sharp-layer",
  "private": true,
  "dependencies": { "sharp": "$SHARP_VERSION" }
}
JSON

# Lambda は x86_64 / glibc。開発機が同じ構成でも明示しておく。
npm install --os=linux --cpu=x64 --libc=glibc --omit=dev --no-audit --no-fund

# 取り込まれたバイナリを確認する。ここが空だと実行時に落ちる。
if [ ! -d node_modules/@img ]; then
    echo "Error: node_modules/@img が無い。ネイティブバイナリが入っていない" >&2
    exit 1
fi

echo "--- 取り込んだプラットフォームパッケージ ---"
ls node_modules/@img

# sam build にこのディレクトリを .aws-sam/build/SharpLayer へ実体化させる。
# BuildMethod を指定しないと ContentUri が相対パス参照のまま残り、
# 何がデプロイされるのかがビルド成果物から読み取れなくなる。
cat > "$LAYER_DIR/Makefile" <<'MAKE'
build-SharpLayer:
	mkdir -p $(ARTIFACTS_DIR)/nodejs
	cp -r nodejs/node_modules $(ARTIFACTS_DIR)/nodejs/
MAKE

echo
echo "Layer built: $LAYER_DIR"
du -sh "$LAYER_DIR"
