import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";

// ここは後で packages/shared に移す前提でもいい
const SubmitSchema = z.object({
	email: z.string().email(),
	answers: z.record(z.string(), z.string().max(2000)),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
	try {
		if (!event.body) {
			return json(400, { ok: false, error: "missing body" });
		}

		const raw = event.isBase64Encoded
			? Buffer.from(event.body, "base64").toString("utf-8")
			: event.body;

		const parsedJson = JSON.parse(raw);
		const data = SubmitSchema.parse(parsedJson);

		// TODO: 保存（DynamoDB等）とメール送信（SES）
		// いまは疎通確認として受け取った内容を返すだけ
		return json(200, { ok: true, received: data });
	} catch (err) {
		// 詳細はクライアントに返すな。ログに出せ。
		console.error(err);
		return json(400, { ok: false });
	}
};

function json(statusCode: number, body: unknown) {
	return {
		statusCode,
		headers: {
			"content-type": "application/json; charset=utf-8",
			// API Gateway 側でCORS設定するならここは不要。直書きするなら最低限こう。
			"access-control-allow-origin": "*",
		},
		body: JSON.stringify(body),
	};
}
