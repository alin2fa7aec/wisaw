import type { S3Handler } from "aws-lambda";
import {
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import sharp from "sharp";
import {
    ddb,
    s3,
    TABLE_NAME,
    PUB_BUCKET,
    rebuildManifest,
} from "./moment-manifest";

const SRC_BUCKET = process.env.MOMENT_SRC_BUCKET!;

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
