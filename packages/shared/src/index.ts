import { z } from "zod";

export const SubmitSchema = z.object({
    email: z.string().email(),
    answers: z.record(z.string(), z.string().max(2000)),
});

export type Submit = z.infer<typeof SubmitSchema>;

/**
 * メールアドレスのバリデーション関数
 * Zodと同じバリデーションロジックを使用
 */
export function isValidEmail(email: string): boolean {
    const result = z.string().email().safeParse(email);
    return result.success;
}

const KANA_REGEX = /^[぀-ゟ゠-ヿー]+$/;

export function isValidKana(value: string): boolean {
    return KANA_REGEX.test(value);
}

const ALPHA_REGEX = /^[A-Za-z\s-]+$/;

export function isValidAlpha(value: string): boolean {
    return ALPHA_REGEX.test(value);
}

/* ------------------------------------------------------------------ *
 * MomentShare — ゲストによる写真共有
 * ------------------------------------------------------------------ */

/** 1ファイルの上限。濫用の天井であり、実写真の大きさを縛る意図はない。 */
export const MOMENT_MAX_FILE_BYTES = 50 * 1024 * 1024;

/** 全体の上限。超えたら Presigned URL の発行を止める。 */
export const MOMENT_MAX_TOTAL_BYTES = 512 * 1024 * 1024 * 1024;

/** 端末単位のゆるい上限。localStorage ベースなので防御ではなく事故防止。 */
export const MOMENT_MAX_PER_DEVICE = 256;

/** 全体のレート上限(1分あたりの Presigned URL 発行数)。 */
export const MOMENT_MAX_ISSUE_PER_MINUTE = 120;

/** 受け付ける MIME タイプ。実体の検証は別途 Sharp のデコードで行う。 */
export const MOMENT_ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
] as const;

export const MomentPresignRequestSchema = z.object({
    /** 端末識別子。localStorage に保持する UUID。 */
    deviceId: z.string().uuid(),
    contentType: z.enum(MOMENT_ALLOWED_CONTENT_TYPES),
    /** クライアント申告のサイズ。実際の強制は S3 の content-length-range で行う。 */
    size: z.number().int().positive().max(MOMENT_MAX_FILE_BYTES),
});

export type MomentPresignRequest = z.infer<typeof MomentPresignRequestSchema>;

export const MomentPresignResponseSchema = z.object({
    url: z.string().url(),
    fields: z.record(z.string(), z.string()),
    key: z.string(),
});

export type MomentPresignResponse = z.infer<typeof MomentPresignResponseSchema>;

/**
 * 自己削除の要求。
 *
 * deviceId は自己申告だが、manifest.json には含めていないため
 * 「他人の写真の id を見て消す」には、その端末の UUID を別途知る必要がある。
 * 防御としては弱く、事故防止の域を出ない点は枚数制限と同じ。
 */
export const MomentDeleteRequestSchema = z.object({
    deviceId: z.string().uuid(),
    id: z.string().uuid(),
});

export type MomentDeleteRequest = z.infer<typeof MomentDeleteRequestSchema>;

/** manifest.json の1エントリ。閲覧に必要な最小限だけを持つ。 */
export const MomentEntrySchema = z.object({
    id: z.string(),
    /** 長辺 1920px の閲覧用画像(CloudFront 配信パスからの相対) */
    view: z.string(),
    /** 300px のサムネイル */
    thumb: z.string(),
    /** 回転適用後の寸法。Masonry のレイアウト計算に使う。 */
    w: z.number().int().positive(),
    h: z.number().int().positive(),
    uploadedAt: z.number().int(),
});

export type MomentEntry = z.infer<typeof MomentEntrySchema>;

export const MomentManifestSchema = z.object({
    updatedAt: z.number().int(),
    /**
     * 受付期間(epoch ミリ秒)。
     *
     * 受付期間は CloudFormation のパラメータが正本で、API 側の Lambda だけが
     * 知っている。フロントが「受付前/受付後はアップロードの導線を出さない」を
     * 判断できるよう、manifest に載せて配る。読み取り API を足さずに済ませる
     * ための経路であり、polling するファイルに相乗りさせている。
     *
     * 古い manifest には存在しないため optional。欠けている場合フロントは
     * 導線を出す(判断できないことを理由に塞がない)。実際の可否は
     * presign 側のガードが決める。
     */
    openAt: z.number().int().optional(),
    closeAt: z.number().int().optional(),
    entries: z.array(MomentEntrySchema),
});

export type MomentManifest = z.infer<typeof MomentManifestSchema>;

/** アップロード受付期間内かどうか。境界は含む。 */
export function isWithinMomentWindow(
    now: number,
    openAt: number,
    closeAt: number,
): boolean {
    return now >= openAt && now <= closeAt;
}
