import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z, ZodError } from "zod";
import {
	DynamoDBClient,
	PutItemCommand,
	GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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

const SubmitSchema = z.object({
	idempotencyKey: z.string().uuid(), // ←これが肝
	email: z.string().email(),
	answers: z.record(z.string(), z.string().max(2000)),
});

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

		// 1) まず保存（冪等：同じpkが既にあれば弾く）
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
					const item = unmarshall(got.Item);
					return json(200, {
						ok: true,
						id: data.idempotencyKey,
						status: item.emailStatus,
					});
				}
				// ここに来たら整合が壊れてる。500で良い。
			}
			safeLogError(err);
			return json(500, { ok: false });
		}

		// 2) ここに SES 送信を足す（今は保存だけ）
		return json(200, { ok: true, id: data.idempotencyKey });
	} catch (err) {
		safeLogError(err);
		return json(500, { ok: false });
	}
};

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
