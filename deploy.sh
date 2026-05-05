#!/usr/bin/env bash
set -euo pipefail

PROFILE="wisaw"
STACK_NAME="wisaw"
S3_BUCKET="wisaw.click-web"
REGION="ap-northeast-1"

echo "=== Build all packages ==="
pnpm -r build

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
