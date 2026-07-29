/**
 * DynamoDB の scan 結果 (回答データ) を読み込む共通処理
 *
 * tools/format_answers.mjs と tools/estimate_travel.mjs が使う。
 */

import fs from "fs";

// 表示順とラベル。apps/api/src/mail-content.ts の ANSWER_LABELS が原本で、
// 送信フォーム apps/web/src/Rsvp.tsx の answers と同じ並びに揃えてある。
export const ANSWER_FIELDS = [
    ["Attendance", "ご出欠"],
    ["Host", "どちら側のゲスト"],
    ["FamilyNameKanji", "姓"],
    ["FirstNameKanji", "名"],
    ["FamilyNameKana", "セイ"],
    ["FirstNameKana", "メイ"],
    ["FamilyNameEn", "Family Name"],
    ["FirstNameEn", "First Name"],
    ["Tel", "電話番号"],
    ["PostCode", "郵便番号"],
    ["Prefecture", "都道府県"],
    ["Municipalities", "市区町村"],
    ["Block", "番地"],
    ["BuildingAndRoom", "建物名・部屋番号"],
    ["AllergyHas", "アレルギー"],
    ["AllergyItems", "特定原材料"],
    ["AllergyOther", "その他アレルギー"],
    ["Message", "メッセージ"],
];

export const META_FIELDS = [
    ["createdAt", "回答日時"],
    ["email", "メールアドレス"],
    ["emailStatus", "送信状態"],
    ["id", "ID"],
];

/**
 * まず素直に JSON.parse し、失敗したときだけ末尾カンマを取り除いて再挑戦する。
 * 手で一部を削った scan 結果でも読めるようにするための保険。
 */
function parseLoosely(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const repaired = text.replace(/,(\s*[\]}])/g, "$1");
        try {
            const parsed = JSON.parse(repaired);
            console.error("警告: 末尾カンマを除去して読み込んだ");
            return parsed;
        } catch {
            console.error(`JSON として読めない: ${e.message}`);
            process.exit(1);
        }
    }
}

/** DynamoDB の属性値 ({"S": "..."} 等) を素の JS の値へ落とす */
function unwrap(attr) {
    if (attr === null || typeof attr !== "object") return attr;
    const [type, value] = Object.entries(attr)[0] ?? [];
    switch (type) {
        case "S":
            return value;
        case "N":
            return Number(value);
        case "BOOL":
            return value;
        case "NULL":
            return null;
        case "L":
            return value.map(unwrap);
        case "SS":
        case "NS":
            return value;
        case "M":
            return Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, unwrap(v)]),
            );
        default:
            return value;
    }
}

/**
 * 入力を読んで回答 (submissions) と送信抑制リスト (suppressed) に分ける。
 * path を省略すると標準入力から読む。
 */
export function loadAnswers(path) {
    const raw = path ? fs.readFileSync(path, "utf8") : fs.readFileSync(0, "utf8");
    const scanned = parseLoosely(raw);
    const items = Array.isArray(scanned) ? scanned : (scanned.Items ?? []);

    const records = items.map((item) =>
        Object.fromEntries(Object.entries(item).map(([k, v]) => [k, unwrap(v)])),
    );

    // pk の接頭辞で振り分ける。
    // suppressed 側は pk が伏せられていることもあるので suppressedAt の有無でも判定する。
    const submissions = [];
    const suppressed = [];
    for (const r of records) {
        const pk = String(r.pk ?? "");
        if (pk.startsWith("submission#") || r.answers) {
            submissions.push({
                id: pk.replace(/^submission#/, ""),
                createdAt: r.createdAt ?? "",
                email: r.email ?? "",
                emailStatus: r.emailStatus ?? "",
                answers: r.answers ?? {},
            });
        } else if (pk.startsWith("suppressed#") || r.suppressedAt) {
            suppressed.push({
                email: pk.replace(/^suppressed#/, ""),
                reason: r.reason ?? "",
                suppressedAt: r.suppressedAt ?? "",
            });
        }
    }

    // 回答日時の昇順。届いた順に読めるほうが追いやすい
    submissions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    suppressed.sort((a, b) => a.suppressedAt.localeCompare(b.suppressedAt));

    return { submissions, suppressed };
}

/** ISO8601 (UTC) を JST の "YYYY/MM/DD HH:mm" にする */
export function toJst(iso) {
    if (!iso) return "";
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return iso;
    const d = new Date(t + 9 * 60 * 60 * 1000);
    const p = (n) => String(n).padStart(2, "0");
    return (
        `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}` +
        ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
    );
}

/** 全角文字を 2 桁として数えた表示幅。桁揃えに使う */
export function width(s) {
    let w = 0;
    for (const ch of String(s)) {
        const c = ch.codePointAt(0);
        w +=
            (c >= 0x1100 && c <= 0x115f) ||
            (c >= 0x2e80 && c <= 0xa4cf) ||
            (c >= 0xac00 && c <= 0xd7a3) ||
            (c >= 0xf900 && c <= 0xfaff) ||
            (c >= 0xfe30 && c <= 0xfe6f) ||
            (c >= 0xff00 && c <= 0xff60) ||
            (c >= 0xffe0 && c <= 0xffe6)
                ? 2
                : 1;
    }
    return w;
}

/** 右側に空白を足して表示幅を target に揃える */
export function pad(s, target) {
    return String(s) + " ".repeat(Math.max(0, target - width(s)));
}

/** 左側に空白を足して表示幅を target に揃える (数値の右揃え用) */
export function padStart(s, target) {
    return " ".repeat(Math.max(0, target - width(s))) + String(s);
}

/** 漢字とカナから表示用の氏名を作る */
export function fullName(answers) {
    const kanji = [answers.FamilyNameKanji, answers.FirstNameKanji]
        .filter(Boolean)
        .join(" ");
    const kana = [answers.FamilyNameKana, answers.FirstNameKana]
        .filter(Boolean)
        .join(" ");
    if (kanji && kana) return `${kanji} (${kana})`;
    return kanji || kana || "(氏名なし)";
}

/** CSV の 1 セルを引用符で囲む */
export function csvCell(v) {
    return `"${String(v ?? "").replaceAll('"', '""')}"`;
}
