import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z, ZodError } from "zod";
import {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { createHash } from "crypto";
import { sendEmail } from "./mail";

// for Real DynamoDB
// const ddb = new DynamoDBClient({});
//

// for local DynamoDB
const region = process.env.AWS_REGION ?? "ap-northeast-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

const ddb = endpoint
    ? new DynamoDBClient({ region, endpoint })
    : new DynamoDBClient({ region });

const TABLE_NAME = process.env.TABLE_NAME!;

async function isEmailSuppressed(email: string): Promise<boolean> {
    const result = await ddb.send(
        new GetItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `suppressed#${email.toLowerCase()}` }),
        }),
    );
    return !!result.Item;
}

const SubmitSchema = z.object({
    idempotencyKey: z.string().uuid(), // ←これが肝
    email: z.string().email(),
    answers: z.record(z.string(), z.string().max(2000)),
});

function canonicalJson(v: unknown): string {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",")}}`;
}

function payloadHash(email: string, answers: Record<string, string>): string {
    const h = createHash("sha256");
    h.update(email);
    h.update("\n");
    h.update(canonicalJson(answers));
    return h.digest("hex");
}

type Submit = z.infer<typeof SubmitSchema>;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        if (!event.body) return json(400, { ok: false, error: "missing body" });

        const raw = event.isBase64Encoded
            ? Buffer.from(event.body, "base64").toString("utf-8")
            : event.body;

        if (raw.length > 100_000) return json(413, { ok: false });

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return json(400, { ok: false, error: "invalid json" });
        }

        let data: Submit;
        try {
            data = SubmitSchema.parse(parsed);
        } catch (err) {
            safeLogError(err);
            return json(400, { ok: false, error: "invalid input" });
        }

        const now = new Date().toISOString();
        const pk = `submission#${data.idempotencyKey}`;
        const ph = payloadHash(data.email, data.answers);

        // 1) まず保存 (冪等：同じpkが既にあれば弾く) 
        try {
            await ddb.send(
                new PutItemCommand({
                    TableName: TABLE_NAME,
                    Item: marshall({
                        pk,
                        createdAt: now,
                        email: data.email,
                        answers: data.answers,
                        emailStatus: "PENDING",
                        payloadHash: ph,
                    }),
                    ConditionExpression: "attribute_not_exists(pk)",
                }),
            );
        } catch (err: any) {
            // 既に存在 = リトライ/二重送信の可能性 → 既存を返して idempotent にする
            if (err?.name === "ConditionalCheckFailedException") {
                const got = await ddb.send(
                    new GetItemCommand({
                        TableName: TABLE_NAME,
                        Key: marshall({ pk }),
                        ConsistentRead: true,
                    }),
                );

                if (got.Item) {
                    const item = unmarshall(got.Item) as any;
                    const existingHash = item.payloadHash as string | undefined;

                    if (existingHash && existingHash !== ph) {
                        // 同じ冪等キーで内容が違う → 409
                        return json(409, {
                            ok: false,
                            error: "idempotency conflict",
                        });
                    }

                    // 一致 (または旧データにhashが無い) → 既存を返す
                    return json(200, {
                        ok: true,
                        id: data.idempotencyKey,
                        status: item.emailStatus,
                    });
                }

                return json(500, { ok: false });
            }

            safeLogError(err);
            return json(500, { ok: false });
        }

        // 2) メール送信 (バウンス/苦情アドレスには送信しない) 
        let emailStatus = "PENDING";
        const suppressed = await isEmailSuppressed(data.email);
        if (suppressed) {
            emailStatus = "SUPPRESSED";
        } else {
            try {
                await sendEmail({
                    to: data.email,
                    subject: "【wisaw】ご回答ありがとうございます",
                    bodyText: buildMailBody(data),
                });
                emailStatus = "SENT";
            } catch (err) {
                safeLogError(err);
                emailStatus = "FAILED";
            }
        }

        // 3) emailStatus を更新
        if (emailStatus !== "PENDING") {
            try {
                await ddb.send(
                    new UpdateItemCommand({
                        TableName: TABLE_NAME,
                        Key: marshall({ pk }),
                        UpdateExpression: "SET emailStatus = :s",
                        ExpressionAttributeValues: marshall({
                            ":s": emailStatus,
                        }),
                    }),
                );
            } catch (err) {
                // ステータス更新失敗はログだけ残して握り潰す
                safeLogError(err);
            }
        }

        return json(200, { ok: true, id: data.idempotencyKey, emailStatus });
    } catch (err) {
        safeLogError(err);
        return json(500, { ok: false });
    }
};

const ANSWER_LABELS: Record<string, string> = {
    Attendance: "ご出欠",
    Host: "どちら側のゲスト",
    FamilyNameKanji: "姓",
    FirstNameKanji: "名",
    FamilyNameKana: "セイ",
    FirstNameKana: "メイ",
    FamilyNameEn: "Family Name",
    FirstNameEn: "First Name",
    Tel: "電話番号",
    PostCode: "郵便番号",
    Prefecture: "都道府県",
    Municipalities: "市区町村",
    Block: "番地",
    BuildingAndRoom: "建物名・部屋番号",
    AllergyHas: "アレルギー",
    AllergyItems: "特定原材料",
    AllergyOther: "その他アレルギー",
    Message: "メッセージ",
};

function buildMailBody(data: Submit): string {
    const lines = [
        "ご回答いただきありがとうございます。",
        "以下の内容で受け付けました。",
        "",
        "─────────────────────",
        ...Object.entries(data.answers)
            .filter(([, a]) => a.length > 0)
            .map(([q, a]) => `${ANSWER_LABELS[q] ?? q}: ${a}`),
        "─────────────────────",
        "",
        "※ このメールは自動送信です。",
    ];
    return lines.join("\n");
}

function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
    };
}

function safeLogError(err: unknown) {
    try {
        if (err instanceof ZodError) {
            console.error("ZodError issues:", err.issues);
            return;
        }
        if (err instanceof Error) {
            console.error(err.stack ?? err.message);
            return;
        }
        console.error("Unknown error:", String(err));
    } catch {
        console.error("Error while logging error");
    }
}
