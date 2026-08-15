import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ZodError } from "zod";
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "crypto";
import {
    MomentPresignRequestSchema,
    MOMENT_MAX_FILE_BYTES,
    MOMENT_MAX_TOTAL_BYTES,
    MOMENT_MAX_PER_DEVICE,
    MOMENT_MAX_ISSUE_PER_MINUTE,
    isWithinMomentWindow,
} from "@wisaw/shared";

const region = process.env.AWS_REGION ?? "ap-northeast-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

const ddb = endpoint
    ? new DynamoDBClient({ region, endpoint })
    : new DynamoDBClient({ region });

// ローカルでは MinIO を S3 の代わりに使う(DYNAMODB_ENDPOINT と同じ流儀)。
// 署名はローカル計算なので、ここで指定した URL がそのままブラウザの
// アップロード先になる点に注意する。
const s3Endpoint = process.env.S3_ENDPOINT;
const s3 = s3Endpoint
    ? new S3Client({ region, endpoint: s3Endpoint, forcePathStyle: true })
    : new S3Client({ region });

const TABLE_NAME = process.env.MOMENT_TABLE_NAME!;
const SRC_BUCKET = process.env.MOMENT_SRC_BUCKET!;

// 受付期間。ISO8601 で与える(例: 2026-10-18T00:00:00+09:00)。
const OPEN_AT = Date.parse(process.env.MOMENT_OPEN_AT ?? "");
const CLOSE_AT = Date.parse(process.env.MOMENT_CLOSE_AT ?? "");

const STAT_KEY = "stat#total";

/**
 * 1分ごとのバケットで発行数を数える。
 * 端末単位の制限はクライアント側の値なので当てにならず、
 * 全体レートの天井だけがスクリプトに対して実効性を持つ。
 */
async function bumpRateAndCheck(now: number): Promise<boolean> {
    const bucket = Math.floor(now / 60_000);
    const res = await ddb.send(
        new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `rate#${bucket}` }),
            UpdateExpression: "ADD #c :one SET #ttl = :ttl",
            ExpressionAttributeNames: { "#c": "count", "#ttl": "ttl" },
            ExpressionAttributeValues: marshall({
                ":one": 1,
                // 1時間で自動的に消えるようにしておく
                ":ttl": Math.floor(now / 1000) + 3600,
            }),
            ReturnValues: "UPDATED_NEW",
        }),
    );
    const count = Number(unmarshall(res.Attributes ?? {}).count ?? 0);
    return count <= MOMENT_MAX_ISSUE_PER_MINUTE;
}

/** 累積バイト数。S3 にバケット容量上限が無いため自前で持つ。 */
async function getTotalBytes(): Promise<number> {
    const res = await ddb.send(
        new GetItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: STAT_KEY }),
        }),
    );
    if (!res.Item) return 0;
    return Number(unmarshall(res.Item).bytes ?? 0);
}

/** 端末ごとの枚数。deviceId は自己申告なので防御ではなく事故防止。 */
async function getDeviceCount(deviceId: string): Promise<number> {
    const res = await ddb.send(
        new GetItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `device#${deviceId}` }),
        }),
    );
    if (!res.Item) return 0;
    return Number(unmarshall(res.Item).count ?? 0);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const now = Date.now();

        // 1. 受付期間の外なら何も発行しない。露出を有限にする最も効く防御。
        if (!Number.isFinite(OPEN_AT) || !Number.isFinite(CLOSE_AT)) {
            console.error("MOMENT_OPEN_AT / MOMENT_CLOSE_AT が未設定");
            return json(503, { ok: false, error: "not_configured" });
        }
        if (!isWithinMomentWindow(now, OPEN_AT, CLOSE_AT)) {
            return json(403, { ok: false, error: "closed" });
        }

        if (!event.body) return json(400, { ok: false, error: "missing body" });
        const raw = event.isBase64Encoded
            ? Buffer.from(event.body, "base64").toString("utf-8")
            : event.body;
        if (raw.length > 10_000) return json(413, { ok: false });

        const req = MomentPresignRequestSchema.parse(JSON.parse(raw));

        // 2. 全体レート上限
        if (!(await bumpRateAndCheck(now))) {
            return json(429, { ok: false, error: "rate_limited" });
        }

        // 3. 全体の容量上限
        if ((await getTotalBytes()) + req.size > MOMENT_MAX_TOTAL_BYTES) {
            return json(507, { ok: false, error: "storage_full" });
        }

        // 4. 端末ごとの枚数(ゆるい上限)
        if ((await getDeviceCount(req.deviceId)) >= MOMENT_MAX_PER_DEVICE) {
            return json(429, { ok: false, error: "device_limit" });
        }

        const id = randomUUID();
        const key = `upload/${id}`;

        // 5. content-length-range を条件に含めることで、S3 自身に上限を強制させる。
        //    これが無いと 1 リクエストで最大 5GB の PUT が通ってしまう。
        const presigned = await createPresignedPost(s3, {
            Bucket: SRC_BUCKET,
            Key: key,
            Conditions: [
                ["content-length-range", 1, MOMENT_MAX_FILE_BYTES],
                ["eq", "$Content-Type", req.contentType],
                ["eq", "$x-amz-meta-device", req.deviceId],
            ],
            Fields: {
                "Content-Type": req.contentType,
                "x-amz-meta-device": req.deviceId,
            },
            Expires: 300,
        });

        return json(200, {
            ok: true,
            url: presigned.url,
            fields: presigned.fields,
            key,
        });
    } catch (e) {
        if (e instanceof ZodError) {
            return json(400, { ok: false, error: "invalid_request" });
        }
        console.error(e);
        return json(500, { ok: false, error: "internal" });
    }
};

function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}
