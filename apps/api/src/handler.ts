import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z, ZodError } from "zod";

type Submit = z.infer<typeof SubmitSchema>;
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

		// TODO: 保存・メール送信はここに追加
		return json(200, { ok: true, received: data });
	} catch (err) {
		safeLogError(err);

		if (err instanceof ZodError) {
			return json(400, { ok: false, error: "invalid input" });
		}

		// ここに来るのは “想定外”＝サーバ側の問題
		return json(500, { ok: false });
	}
};

function json(statusCode: number, body: unknown) {
	return {
		statusCode,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
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
