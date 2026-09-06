import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ZodError } from "zod";
import { UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { MomentDeleteRequestSchema } from "@wisaw/shared";
import { ddb, TABLE_NAME, rebuildManifest } from "./moment-manifest";

/**
 * ゲストによる自己削除。
 *
 * 式中は運営側が対応できないと割り切っているため(SSO セッションが切れていれば
 * 式場で消すのは現実的でない)、「間違えて上げた」をゲスト自身で解決できる口を
 * 用意する。moment-share.md の「端末単位の自己削除」に対応する。
 *
 * ソフト削除である。hidden を立てて manifest から外すだけで、S3 の実体には
 * 触らない。誤操作を戻せるようにするため、および式後の一括退避でオリジナルを
 * 失わないため。実体の削除は tools/moment_admin.sh purge で式後に行う。
 *
 * 受付期間の判定はしない。presign の期間ガードは匿名の書き込みが storage を
 * 作り続けるのを止めるためのもので、削除は何も作らない。むしろ受付終了後に
 * 気づいたゲストこそ消したいはずなので、期間で塞ぐ理由がない。
 */

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        if (!event.body) return json(400, { ok: false, error: "missing body" });
        const raw = event.isBase64Encoded
            ? Buffer.from(event.body, "base64").toString("utf-8")
            : event.body;
        if (raw.length > 10_000) return json(413, { ok: false });

        const req = MomentDeleteRequestSchema.parse(JSON.parse(raw));
        const key = marshall({ pk: `photo#${req.id}` });

        // 所有確認と hidden の付与を1回の条件付き更新で行う。
        // 先に GetItem で確かめてから更新すると、その隙間で状態が変わりうる。
        //
        // attribute_not_exists(#hidden) を条件に含めているのは冪等性のためだけでなく、
        // 同じ写真への削除要求を繰り返しても下の Scan が走らないようにするため。
        // 認証を持たない口なので、重い処理は必ず条件の後ろに置く。
        try {
            await ddb.send(
                new UpdateItemCommand({
                    TableName: TABLE_NAME,
                    Key: key,
                    UpdateExpression: "SET #hidden = :t",
                    ConditionExpression:
                        "attribute_exists(pk) AND #device = :d AND attribute_not_exists(#hidden)",
                    // hidden は DynamoDB の予約語。#device は予約語ではないが、
                    // 同じ理由で足元をすくわれないよう揃えて別名にしておく。
                    ExpressionAttributeNames: {
                        "#hidden": "hidden",
                        "#device": "deviceId",
                    },
                    ExpressionAttributeValues: marshall({
                        ":t": true,
                        ":d": req.deviceId,
                    }),
                }),
            );
        } catch (err: unknown) {
            const errName = (err as { name?: string } | null)?.name;
            if (errName !== "ConditionalCheckFailedException") throw err;

            // 条件に落ちた理由は3通りある。「既に消してある」だけは成功として返す。
            // 通信が切れた後の再送で失敗扱いになると、消えているのに消せないと
            // 見える。残る2つ(存在しない / 他端末の写真)は区別せず 404 にする。
            if (await isAlreadyHiddenBy(key, req.deviceId)) {
                return json(200, { ok: true, alreadyDeleted: true });
            }
            return json(404, { ok: false, error: "not_found" });
        }

        const total = await rebuildManifest();
        console.log(
            `[self-delete] id=${req.id} device=${req.deviceId} manifest=${total}`,
        );

        return json(200, { ok: true });
    } catch (e) {
        if (e instanceof ZodError) {
            return json(400, { ok: false, error: "invalid_request" });
        }
        console.error(e);
        return json(500, { ok: false, error: "internal" });
    }
};

/** 条件付き更新に失敗した後、その原因が「自分が既に消したもの」かを見る。 */
async function isAlreadyHiddenBy(
    key: Record<string, unknown>,
    deviceId: string,
): Promise<boolean> {
    const res = await ddb.send(
        new GetItemCommand({ TableName: TABLE_NAME, Key: key as never }),
    );
    if (!res.Item) return false;
    const item = unmarshall(res.Item);
    return item.deviceId === deviceId && item.hidden === true;
}

function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}
