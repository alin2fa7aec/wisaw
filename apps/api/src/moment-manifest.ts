import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { MomentEntry } from "@wisaw/shared";

/**
 * manifest.json の再構築。
 *
 * 呼び出し元が3つある(アップロード完了時の moment-process、ゲストの自己削除の
 * moment-delete、CLI から叩く rebuildHandler)。Scan の条件を写経して回ると
 * hidden の扱いが1箇所ずれた瞬間に「消したのに一覧に残る」が起きるため、
 * ここ1本に閉じ込める。
 *
 * sharp を読み込まないモジュールとして独立させてある。これにより
 * 再構築だけを行う関数に Lambda レイヤーを付ける必要がなくなる。
 */

const region = process.env.AWS_REGION ?? "ap-northeast-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

export const ddb = endpoint
    ? new DynamoDBClient({ region, endpoint })
    : new DynamoDBClient({ region });

// ローカルでは MinIO を S3 の代わりに使う(DYNAMODB_ENDPOINT と同じ流儀)。
const s3Endpoint = process.env.S3_ENDPOINT;
export const s3 = s3Endpoint
    ? new S3Client({ region, endpoint: s3Endpoint, forcePathStyle: true })
    : new S3Client({ region });

export const TABLE_NAME = process.env.MOMENT_TABLE_NAME!;
export const PUB_BUCKET = process.env.MOMENT_PUB_BUCKET!;

// 受付期間。manifest に載せてフロントへ配る(導線の出し分けに使う)。
// 判定の正本は presign 側のガードで、こちらは表示のためだけのもの。
const OPEN_AT = Date.parse(process.env.MOMENT_OPEN_AT ?? "");
const CLOSE_AT = Date.parse(process.env.MOMENT_CLOSE_AT ?? "");

/**
 * DynamoDB を正本として manifest.json を組み直し、公開バケットへ書く。
 *
 * 読み取り API を用意せずフロントにこの静的ファイルを polling させることで、
 * API を write only に保ったまま、閲覧のたびに Lambda が起動するのを避ける。
 */
export async function rebuildManifest(): Promise<number> {
    const entries: MomentEntry[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE_NAME,
                // hidden は DynamoDB の予約語なので名前を差し替える必要がある
                FilterExpression:
                    "begins_with(pk, :p) AND attribute_not_exists(#hidden)",
                ExpressionAttributeNames: { "#hidden": "hidden" },
                ExpressionAttributeValues: marshall({ ":p": "photo#" }),
                ExclusiveStartKey: lastKey as never,
            }),
        );
        for (const raw of res.Items ?? []) {
            const item = unmarshall(raw);
            entries.push({
                id: item.id,
                view: item.view,
                thumb: item.thumb,
                w: Number(item.w),
                h: Number(item.h),
                uploadedAt: Number(item.uploadedAt),
            });
        }
        lastKey = res.LastEvaluatedKey as never;
    } while (lastKey);

    // 新しいものが先頭。式当日に増えていく様子が見えるようにする。
    entries.sort((a, b) => b.uploadedAt - a.uploadedAt);

    await s3.send(
        new PutObjectCommand({
            Bucket: PUB_BUCKET,
            Key: "moments/manifest.json",
            Body: JSON.stringify({
                updatedAt: Date.now(),
                // 未設定なら載せない。フロントは欠けていれば導線を出す。
                openAt: Number.isFinite(OPEN_AT) ? OPEN_AT : undefined,
                closeAt: Number.isFinite(CLOSE_AT) ? CLOSE_AT : undefined,
                entries,
            }),
            ContentType: "application/json",
            // polling で拾えるよう短命にする。
            CacheControl: "max-age=5",
        }),
    );

    return entries.length;
}

/**
 * manifest.json を組み直すだけのハンドラ。
 *
 * 写真を隠したあとに一覧へ反映させるために CLI から呼ぶ。
 * 受付期間が終わると新規アップロードが無くなり manifest が更新されなくなるため、
 * 再構築の口が別に要る。ロジックを bash 側へ写経しないための入口。
 */
export const rebuildHandler = async () => {
    const total = await rebuildManifest();
    console.log(`[rebuild] manifest=${total}`);
    return { ok: true, entries: total };
};
