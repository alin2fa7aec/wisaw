#!/usr/bin/env bash
set -euo pipefail

PROFILE="wisaw"
STACK_NAME="wisaw"
S3_BUCKET="wisaw.click-web"
REGION="ap-northeast-1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# デプロイパラメータの一時的な差し替えを受け付ける。
#
#   ./tools/deploy_service.sh
#   ./tools/deploy_service.sh MomentOpenAt=2026-09-06T00:00:00+09:00
#   ./tools/deploy_service.sh --parameter-overrides MomentOpenAt=... MomentCloseAt=...
#
# sam deploy の --parameter-overrides は samconfig.toml の値に足されるのではなく
# 置き換えるため、1つだけ変えたい場合も全部を並べ直す必要がある。それを手で
# やると証明書 ARN などを取りこぼすので、samconfig.toml を土台にして
# 引数で与えられた分だけ差し替えてから渡す。
#
# 戻すときは素で実行し直せばよい。samconfig.toml に確定値が並んでいるので
# 必ずその値に戻る(何も渡さないと CloudFormation が前回値を引き継ぐため、
# 「指定しなければ template.yaml の既定に戻る」は成立しない)。
PARAM_LINES="$(ROOT="$ROOT" python3 - "$@" <<'PYMERGE'
import os
import pathlib
import shlex
import sys
import tomllib

# --parameter-overrides は付いていてもいなくてもよい
extra = [a for a in sys.argv[1:] if a != "--parameter-overrides"]

malformed = [a for a in extra if "=" not in a]
if malformed:
    sys.exit("デプロイパラメータは KEY=VALUE で指定する: " + " ".join(malformed))

config_path = pathlib.Path(os.environ["ROOT"]) / "samconfig.toml"
config = tomllib.loads(config_path.read_text(encoding="utf-8"))
base = config["default"]["deploy"]["parameters"].get("parameter_overrides", "")

params: dict[str, str] = {}
for token in shlex.split(base) + extra:
    key, _, value = token.partition("=")
    params[key] = value

print("\n".join(f"{k}={v}" for k, v in params.items()))
PYMERGE
)"

mapfile -t PARAMS <<< "$PARAM_LINES"

echo "=== Deploy parameters ==="
printf '  %s\n' "${PARAMS[@]}"

echo "=== Build all packages ==="
pnpm -r build

# sharp はネイティブモジュールのため esbuild でバンドルできず、レイヤーから供給する。
# layers/ は git 管理外なので、クローン直後でも確実に用意されるようここで毎回組む。
echo "=== Build sharp layer ==="
"$(dirname "$0")/build_sharp_layer.sh"

echo "=== SAM build ==="
sam build --profile "$PROFILE"

echo "=== SAM deploy ==="
sam deploy --profile "$PROFILE" --no-fail-on-empty-changeset \
  --parameter-overrides "${PARAMS[@]}"

# 受付期間は manifest.json にも載っていて、フロントが「受付前/受付後は
# アップロードの導線を出さない」の判断に使う。パラメータを変えても manifest は
# 自動では変わらないため、ここで組み直しておく。
echo "=== Rebuild moment manifest ==="
"$(dirname "$0")/moment_admin.sh" rebuild ||
    echo "  再構築に失敗。./tools/moment_admin.sh rebuild を手で実行すること"

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
