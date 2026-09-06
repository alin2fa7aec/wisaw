#!/usr/bin/env bash
set -euo pipefail

# MomentShare の運用ツール。専用の管理 UI は作らず、開発マシンの CLI から対応する。
#
#   ./tools/moment_admin.sh list              一覧(隠したものも含む)
#   ./tools/moment_admin.sh hide <id>         一覧から隠す(ソフト削除。元に戻せる)
#   ./tools/moment_admin.sh unhide <id>       隠したものを戻す
#   ./tools/moment_admin.sh rebuild           manifest.json を組み直す
#   ./tools/moment_admin.sh download <dir>    オリジナルを一括ダウンロード
#   ./tools/moment_admin.sh purge <id>        実体を完全に削除(戻せない)
#   ./tools/moment_admin.sh usage             使用量
#
# 式当日の対応は想定していない(SSO の再ログインが要るため)。
# まず hide で一覧から外し、実体の削除は後から落ち着いて行うこと。

PROFILE="${AWS_PROFILE:-wisaw}"
REGION="${AWS_REGION:-ap-northeast-1}"
TABLE="wisaw-moments"
DOMAIN="${DOMAIN_NAME:-wisaw.click}"
SRC_BUCKET="${DOMAIN}-moments-src"
PUB_BUCKET="${DOMAIN}-moments"
REBUILD_FN="wisaw-moment-rebuild"

aws_() { aws --profile "$PROFILE" --region "$REGION" "$@"; }

# 隠した後は必ず manifest を組み直す。DynamoDB を触っただけでは一覧に反映されない。
rebuild() {
    echo "manifest を再構築中..."
    local out
    out="$(mktemp)"
    aws_ lambda invoke --function-name "$REBUILD_FN" --payload '{}' "$out" >/dev/null
    cat "$out"
    echo
    rm -f "$out"
}

cmd="${1:-}"
case "$cmd" in
list)
    aws_ dynamodb scan \
        --table-name "$TABLE" \
        --filter-expression "begins_with(pk, :p)" \
        --expression-attribute-values '{":p":{"S":"photo#"}}' \
        --output json |
        node -e '
            let s = "";
            process.stdin.on("data", (d) => (s += d));
            process.stdin.on("end", () => {
                const items = JSON.parse(s).Items ?? [];
                items.sort((a, b) => Number(b.uploadedAt.N) - Number(a.uploadedAt.N));
                if (items.length === 0) return console.log("(写真なし)");
                for (const it of items) {
                    const at = new Date(Number(it.uploadedAt.N)).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
                    const hidden = it.hidden ? " [非表示]" : "";
                    const kb = Math.round(Number(it.bytes.N) / 1024);
                    console.log(`${it.id.S}  ${at}  ${it.w.N}x${it.h.N}  ${kb}KB  ${it.detected?.S ?? "-"}${hidden}`);
                }
                console.log(`\n${items.length} 件`);
            });
        '
    ;;

hide | unhide)
    id="${2:?id を指定してください}"
    if [ "$cmd" = "hide" ]; then
        aws_ dynamodb update-item \
            --table-name "$TABLE" \
            --key "{\"pk\":{\"S\":\"photo#${id}\"}}" \
            --update-expression "SET #h = :t" \
            --expression-attribute-names '{"#h":"hidden"}' \
            --expression-attribute-values '{":t":{"BOOL":true}}' >/dev/null
        echo "隠しました: $id"
    else
        aws_ dynamodb update-item \
            --table-name "$TABLE" \
            --key "{\"pk\":{\"S\":\"photo#${id}\"}}" \
            --update-expression "REMOVE #h" \
            --expression-attribute-names '{"#h":"hidden"}' >/dev/null
        echo "戻しました: $id"
    fi
    rebuild
    ;;

rebuild)
    rebuild
    ;;

download)
    dir="${2:?保存先ディレクトリを指定してください}"
    mkdir -p "$dir"
    echo "オリジナルを $dir へ同期します..."
    aws_ s3 sync "s3://${SRC_BUCKET}/original/" "$dir"

    # S3 のキーは original/<uuid> で拡張子を持たない。そのままでは写真アプリが
    # 開けないため、落とした後に中身を見て付ける。
    #
    # 判定は先頭バイトから行う。Content-Type は自己申告で信用できないため
    # (apps/api/src/moment-process.ts の sniff() と同じ理由・同じ判定)、
    # メタデータではなく実体を見る。
    echo "拡張子を付けています..."
    node -e '
        const fs = require("fs");
        const path = require("path");

        const dir = process.argv[1];

        // apps/api/src/moment-process.ts の sniff() と対応させること。
        const extensionOf = (buf) => {
            if (buf.length < 12) return null;
            if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
            if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG") return ".png";
            if (
                buf.toString("latin1", 0, 4) === "RIFF" &&
                buf.toString("latin1", 8, 12) === "WEBP"
            )
                return ".webp";
            if (buf.toString("latin1", 4, 8) === "ftyp") {
                const brand = buf.toString("latin1", 8, 12);
                if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand))
                    return ".heic";
                if (brand === "avif" || brand === "avis") return ".avif";
            }
            return null;
        };

        let renamed = 0;
        let skipped = 0;

        for (const name of fs.readdirSync(dir)) {
            const from = path.join(dir, name);
            if (!fs.statSync(from).isFile()) continue;
            if (path.extname(name)) continue;

            const fd = fs.openSync(from, "r");
            const head = Buffer.alloc(12);
            fs.readSync(fd, head, 0, 12, 0);
            fs.closeSync(fd);

            const ext = extensionOf(head);
            if (!ext) {
                // 判定できないものは触らない。消さずに残して人が見る。
                console.log(`  判定できず: ${name}`);
                skipped++;
                continue;
            }

            const to = path.join(dir, name + ext);
            if (fs.existsSync(to)) {
                console.log(`  既にある: ${name + ext}`);
                skipped++;
                continue;
            }
            fs.renameSync(from, to);
            renamed++;
        }

        console.log(`  ${renamed} 件に拡張子を付けました` + (skipped ? ` (${skipped} 件は据え置き)` : ""));
    ' "$dir"

    echo
    echo "完了。実体を削除する前に、必ず中身を確認すること。"
    echo "オリジナルには GPS を含む EXIF が残っている点にも留意する。"
    ;;

purge)
    id="${2:?id を指定してください}"
    echo "以下を完全に削除します(戻せません):"
    echo "  s3://${SRC_BUCKET}/original/${id}"
    echo "  s3://${PUB_BUCKET}/moments/view/${id}.jpg"
    echo "  s3://${PUB_BUCKET}/moments/thumb/${id}.jpg"
    echo "  DynamoDB photo#${id}"
    read -r -p "続行しますか? [y/N] " ans
    [ "$ans" = "y" ] || { echo "中止しました"; exit 1; }

    aws_ s3 rm "s3://${SRC_BUCKET}/original/${id}" || true
    aws_ s3 rm "s3://${PUB_BUCKET}/moments/view/${id}.jpg" || true
    aws_ s3 rm "s3://${PUB_BUCKET}/moments/thumb/${id}.jpg" || true
    aws_ dynamodb delete-item \
        --table-name "$TABLE" \
        --key "{\"pk\":{\"S\":\"photo#${id}\"}}" >/dev/null
    rebuild

    # 派生物は max-age=300 で配信しているため、待てばエッジからも消える。
    # 急ぐ場合のみ invalidation を打つ(月1,000パスまで無料)。
    echo "エッジキャッシュは最大5分残る。急ぐ場合は CloudFront invalidation を実行すること。"
    ;;

usage)
    aws_ dynamodb get-item \
        --table-name "$TABLE" \
        --key '{"pk":{"S":"stat#total"}}' \
        --output json |
        node -e '
            let s = "";
            process.stdin.on("data", (d) => (s += d));
            process.stdin.on("end", () => {
                const it = JSON.parse(s || "{}").Item;
                if (!it) return console.log("まだアップロードがありません");
                const bytes = Number(it.bytes.N);
                const cap = 512 * 1024 ** 3;
                const gb = (bytes / 1024 ** 3).toFixed(2);
                console.log(`${it.count.N} 枚 / ${gb} GB (上限 512GB の ${((bytes / cap) * 100).toFixed(3)}%)`);
            });
        '
    ;;

*)
    sed -n '4,15p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
