import type { S3Handler } from "aws-lambda";
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import sharp from "sharp";
import type { MomentEntry } from "@wisaw/shared";

const region = process.env.AWS_REGION ?? "ap-northeast-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

const ddb = endpoint
    ? new DynamoDBClient({ region, endpoint })
    : new DynamoDBClient({ region });

// ローカルでは MinIO を S3 の代わりに使う(DYNAMODB_ENDPOINT と同じ流儀)。
const s3Endpoint = process.env.S3_ENDPOINT;
const s3 = s3Endpoint
    ? new S3Client({ region, endpoint: s3Endpoint, forcePathStyle: true })
    : new S3Client({ region });

const TABLE_NAME = process.env.MOMENT_TABLE_NAME!;
const SRC_BUCKET = process.env.MOMENT_SRC_BUCKET!;
const PUB_BUCKET = process.env.MOMENT_PUB_BUCKET!;

const VIEW_MAX = 1920;
const THUMB_MAX = 300;
const QUALITY = 85;

/**
 * 先頭バイトから実フォーマットを判定する。
 * Content-Type は自己申告なので信用しない。
 *
 * 2026-08-15 の実機検証では iOS が HEIC を JPEG に変換して送ってくることを
 * 確認済みだが、これは恒久的な保証ではない。デコードに失敗したときに
 * 「実際は何だったのか」をログに残せるようにしておく。
 * 原因不明のまま写真が消えるのが最悪のシナリオであるため。
 */
function sniff(buf: Buffer): string {
    if (buf.length < 12) return "too-short";
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
    if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG") return "png";
    if (
        buf.toString("latin1", 0, 4) === "RIFF" &&
        buf.toString("latin1", 8, 12) === "WEBP"
    )
        return "webp";
    if (buf.toString("latin1", 4, 8) === "ftyp") {
        const brand = buf.toString("latin1", 8, 12);
        if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand))
            return `heic(${brand})`;
        if (brand === "avif" || brand === "avis") return `avif(${brand})`;
        return `iso-bmff(${brand})`;
    }
    return "unknown";
}

async function toBuffer(body: unknown): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const c of body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(c));
    }
    return Buffer.concat(chunks);
}

/**
 * DynamoDB を正本として manifest.json を組み直し、公開バケットへ書く。
 *
 * 読み取り API を用意せずフロントにこの静的ファイルを polling させることで、
 * API を write only に保ったまま、閲覧のたびに Lambda が起動するのを避ける。
 */
async function rebuildManifest(): Promise<number> {
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
            Body: JSON.stringify({ updatedAt: Date.now(), entries }),
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

export const handler: S3Handler = async (event) => {
    for (const record of event.Records) {
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        if (!key.startsWith("upload/")) continue;

        const id = key.slice("upload/".length);

        const obj = await s3.send(
            new GetObjectCommand({ Bucket: SRC_BUCKET, Key: key }),
        );
        const buf = await toBuffer(obj.Body);
        const detected = sniff(buf);
        const deviceId = obj.Metadata?.device ?? "unknown";

        let view: Buffer;
        let thumb: Buffer;
        let w: number;
        let h: number;

        try {
            // .rotate() で EXIF の向きをピクセルへ焼き込む。
            // 実機検証で orientation=6 の写真が実際に届くことを確認済みで、
            // これを省くと横倒しで表示される(既存 Gallery で踏んだ罠と同じ)。
            //
            // 併せて .withMetadata() は呼ばないこと。sharp は既定で出力から
            // メタデータを落とすが、明示的に残すと GPS まで復活してしまう。
            const base = sharp(buf).rotate();

            view = await base
                .clone()
                .resize({ width: VIEW_MAX, height: VIEW_MAX, fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: QUALITY })
                .toBuffer();

            thumb = await base
                .clone()
                .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: QUALITY })
                .toBuffer();

            const meta = await sharp(view).metadata();
            w = meta.width!;
            h = meta.height!;
        } catch (e) {
            // 実画像としてデコードできないものは保存しない。
            // これにより匿名アップロード口がファイルホストとして機能しなくなる。
            console.warn(
                `[reject] key=${key} detected=${detected} declared=${obj.ContentType} size=${buf.length} device=${deviceId}: ${(e as Error).message}`,
            );
            await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: key }));
            continue;
        }

        const now = Date.now();

        await Promise.all([
            s3.send(
                new PutObjectCommand({
                    Bucket: PUB_BUCKET,
                    Key: `moments/view/${id}.jpg`,
                    Body: view,
                    ContentType: "image/jpeg",
                    // 既存 Gallery の immutable を流用してはいけない。
                    // 削除に追従できなくなるため短命にする。
                    CacheControl: "max-age=300",
                }),
            ),
            s3.send(
                new PutObjectCommand({
                    Bucket: PUB_BUCKET,
                    Key: `moments/thumb/${id}.jpg`,
                    Body: thumb,
                    ContentType: "image/jpeg",
                    CacheControl: "max-age=300",
                }),
            ),
            // オリジナルは非公開バケットに残す。EXIF(GPS を含む)がそのまま
            // 残っているため、CloudFront からは決して配信しない。
            s3.send(
                new PutObjectCommand({
                    Bucket: SRC_BUCKET,
                    Key: `original/${id}`,
                    Body: buf,
                    ContentType: obj.ContentType ?? "application/octet-stream",
                    Metadata: { device: deviceId },
                }),
            ),
        ]);

        await s3.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: key }));

        await ddb.send(
            new PutItemCommand({
                TableName: TABLE_NAME,
                Item: marshall({
                    pk: `photo#${id}`,
                    id,
                    view: `moments/view/${id}.jpg`,
                    thumb: `moments/thumb/${id}.jpg`,
                    w,
                    h,
                    bytes: buf.length,
                    deviceId,
                    detected,
                    uploadedAt: now,
                }),
            }),
        );

        await Promise.all([
            ddb.send(
                new UpdateItemCommand({
                    TableName: TABLE_NAME,
                    Key: marshall({ pk: "stat#total" }),
                    UpdateExpression: "ADD #b :b, #c :one",
                    ExpressionAttributeNames: { "#b": "bytes", "#c": "count" },
                    ExpressionAttributeValues: marshall({ ":b": buf.length, ":one": 1 }),
                }),
            ),
            ddb.send(
                new UpdateItemCommand({
                    TableName: TABLE_NAME,
                    Key: marshall({ pk: `device#${deviceId}` }),
                    UpdateExpression: "ADD #c :one",
                    ExpressionAttributeNames: { "#c": "count" },
                    ExpressionAttributeValues: marshall({ ":one": 1 }),
                }),
            ),
        ]);

        const total = await rebuildManifest();
        console.log(`[accept] id=${id} ${w}x${h} detected=${detected} manifest=${total}`);
    }
};
