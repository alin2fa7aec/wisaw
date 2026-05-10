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
