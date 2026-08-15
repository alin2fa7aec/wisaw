#!/usr/bin/env bash
set -euo pipefail

PROFILE="wisaw"
STACK_NAME="wisaw"
S3_BUCKET="wisaw.click-web"
REGION="ap-northeast-1"

echo "=== Build all packages ==="
pnpm -r build

# sharp はネイティブモジュールのため esbuild でバンドルできず、レイヤーから供給する。
# layers/ は git 管理外なので、クローン直後でも確実に用意されるようここで毎回組む。
echo "=== Build sharp layer ==="
"$(dirname "$0")/build_sharp_layer.sh"

echo "=== SAM build ==="
sam build --profile "$PROFILE"

echo "=== SAM deploy ==="
sam deploy --profile "$PROFILE" --no-fail-on-empty-changeset

echo "=== Upload frontend to S3 ==="
aws s3 sync apps/web/dist/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$REGION" \
  --profile "$PROFILE"

echo "=== Invalidate CloudFront cache ==="
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --profile "$PROFILE" \
  --query "DistributionList.Items[?Aliases.Items[0]=='wisaw.click'].Id" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --profile "$PROFILE"

echo "=== Done ==="
