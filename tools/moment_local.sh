#!/usr/bin/env bash
set -euo pipefail

# MomentShare をローカルだけで動かすための道具。
#
#   ./tools/moment_local.sh setup    バケットとテーブルを作る(何度実行してもよい)
#   ./tools/moment_local.sh api      sam local start-api を正しい環境で起動する
#   ./tools/moment_local.sh watch    upload/ を監視し、着いたものを処理する
#   ./tools/moment_local.sh status   いま何が入っているか
#   ./tools/moment_local.sh reset    MomentShare 関連のデータを消す
#
# 本番の S3 イベントに相当する仕組みは MinIO には用意していないため、
# watch が代わりにポーリングして処理関数を直接呼ぶ。
#
# 前提:
#   docker compose up -d
#   pnpm --filter api build
#
# 併せて別ターミナルで以下が要る:
#   ./tools/moment_local.sh api
#   pnpm dev:web

export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_REGION=ap-northeast-1

S3="http://localhost:9000"
DDB="http://localhost:8000"
SRC_BUCKET="wisaw-local-moments-src"
PUB_BUCKET="wisaw-local-moments"
TABLE="wisaw-moments"

s3api() { aws --endpoint-url "$S3" s3api "$@"; }
s3_() { aws --endpoint-url "$S3" s3 "$@"; }
ddb() { aws --endpoint-url "$DDB" dynamodb "$@"; }

case "${1:-}" in
setup)
    for b in "$SRC_BUCKET" "$PUB_BUCKET"; do
        s3api create-bucket --bucket "$b" >/dev/null 2>&1 && echo "created: $b" || echo "exists : $b"
    done

    # 公開側は Vite の proxy から素で読めるようにしておく。
    # 本番では CloudFront + OAC が担う部分で、ここだけ構成が異なる。
    s3api put-bucket-policy --bucket "$PUB_BUCKET" --policy "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::${PUB_BUCKET}/*\"
        }]
    }" >/dev/null
    echo "public read: $PUB_BUCKET"

    # CORS はここでは設定しない。MinIO が PutBucketCors に未対応のため、
    # docker-compose.yml の MINIO_API_CORS_ALLOW_ORIGIN で代替している。
    # 本番では template.yaml の MomentSrcBucket.CorsConfiguration が担う。

    ddb create-table \
        --table-name "$TABLE" \
        --attribute-definitions AttributeName=pk,AttributeType=S \
        --key-schema AttributeName=pk,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 &&
        echo "created: $TABLE" || echo "exists : $TABLE"

    echo
    echo "準備完了。次に別ターミナルで:"
    echo "  ./tools/moment_local.sh api"
    echo "  pnpm dev:web"
    echo "  ./tools/moment_local.sh watch"
    ;;

api)
    # sam local はホスト側の資格情報を解決してコンテナへ注入する。
    # SSO が切れていると解決に失敗し、リクエストごとに 502 になる。
    # ローカル完結の確認に実 AWS は不要なので、ダミーを与えて起動する。
    #
    # テンプレートを変更した場合は sam build を先に済ませておくこと
    # (sam local はソースではなく .aws-sam/build を見る)。
    if [ ! -d .aws-sam/build ]; then
        echo "警告: .aws-sam/build がありません。先に 'sam build' を実行してください。" >&2
    fi
    # 追加の引数(-p 3001 など)はそのまま渡す
    exec sam local start-api --env-vars env.json --docker-network wisaw_default "${@:2}"
    ;;

watch)
    echo "upload/ を監視中... (Ctrl-C で終了)"
    while true; do
        keys="$(s3_ ls "s3://${SRC_BUCKET}/upload/" 2>/dev/null | awk '{print $4}' || true)"
        for k in $keys; do
            [ -n "$k" ] || continue
            echo "--- 処理: upload/$k"
            # 本番の S3 イベントと同じ形の払い出しを作って処理関数へ渡す。
            # sam local invoke を使わないのは、sharp のレイヤーを Docker へ
            # 持ち込む手間を避けるため(ロジックは同一のものが動く)。
            S3_ENDPOINT="$S3" \
                DYNAMODB_ENDPOINT="$DDB" \
                MOMENT_TABLE_NAME="$TABLE" \
                MOMENT_SRC_BUCKET="$SRC_BUCKET" \
                MOMENT_PUB_BUCKET="$PUB_BUCKET" \
                AWS_REGION=ap-northeast-1 \
                node -e "
                    const { handler } = require('./apps/api/dist/moment-process.js');
                    handler({ Records: [{ s3: { object: { key: 'upload/${k}' } } }] })
                        .catch((e) => { console.error(e); process.exit(1); });
                "
        done
        sleep 2
    done
    ;;

status)
    echo "--- src バケット ---"
    s3_ ls "s3://${SRC_BUCKET}/" --recursive 2>/dev/null || echo "(なし)"
    echo
    echo "--- pub バケット ---"
    s3_ ls "s3://${PUB_BUCKET}/" --recursive 2>/dev/null || echo "(なし)"
    echo
    echo "--- manifest ---"
    s3_ cp "s3://${PUB_BUCKET}/moments/manifest.json" - 2>/dev/null | head -c 800 || echo "(なし)"
    echo
    ;;

reset)
    read -r -p "ローカルの MomentShare データを全部消します。よいですか? [y/N] " ans
    [ "$ans" = "y" ] || { echo "中止しました"; exit 1; }
    s3_ rm "s3://${SRC_BUCKET}/" --recursive >/dev/null 2>&1 || true
    s3_ rm "s3://${PUB_BUCKET}/" --recursive >/dev/null 2>&1 || true
    ddb delete-table --table-name "$TABLE" >/dev/null 2>&1 || true
    echo "消しました。setup をやり直してください。"
    ;;

*)
    sed -n '4,23p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
