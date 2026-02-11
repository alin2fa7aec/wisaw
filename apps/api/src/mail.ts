/**
 * メール送信モジュール
 *
 * USE_SES=1 のとき AWS SES を使い、それ以外はコンソールログで代替する。
 */

export interface MailParams {
	to: string;
	subject: string;
	bodyText: string;
}

export interface MailResult {
	success: boolean;
	messageId?: string | undefined;
}

// ---------------------------------------------------------------------------
// Stub（ローカル開発用）
// ---------------------------------------------------------------------------

async function sendViaStub(params: MailParams): Promise<MailResult> {
	console.log("──── [mail/stub] sendEmail ────");
	console.log(`  To:      ${params.to}`);
	console.log(`  Subject: ${params.subject}`);
	console.log(`  Body:\n${params.bodyText}`);
	console.log("──── [mail/stub] done ─────────");

	return { success: true, messageId: `stub-${Date.now()}` };
}

// ---------------------------------------------------------------------------
// SES（本番用 – まだ呼ばれない）
// ---------------------------------------------------------------------------

// SES クライアントは USE_SES=1 のときだけ import される。
// esbuild は top-level await 非対応なので lazy init で逃げる。
let sesSend: ((params: MailParams) => Promise<MailResult>) | undefined;

async function getSESSender() {
	if (sesSend) return sesSend;

	const { SESv2Client, SendEmailCommand } =
		await import("@aws-sdk/client-sesv2");
	const ses = new SESv2Client({});
	const from = process.env.SES_FROM_ADDRESS ?? "noreply@example.com";

	sesSend = async (params: MailParams): Promise<MailResult> => {
		const res = await ses.send(
			new SendEmailCommand({
				FromEmailAddress: from,
				Destination: { ToAddresses: [params.to] },
				Content: {
					Simple: {
						Subject: { Data: params.subject },
						Body: { Text: { Data: params.bodyText } },
					},
				},
			}),
		);
		return { success: true, messageId: res.MessageId };
	};

	return sesSend;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendEmail(params: MailParams): Promise<MailResult> {
	if (process.env.USE_SES === "1") {
		const send = await getSESSender();
		return send(params);
	}
	return sendViaStub(params);
}
