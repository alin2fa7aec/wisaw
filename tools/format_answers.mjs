/**
 * DynamoDB の scan 結果 (回答データ) を閲覧しやすい形に整形するスクリプト
 *
 * 使い方:
 *   node tools/format_answers.mjs answers.json            # テキスト表示 (既定)
 *   aws dynamodb scan --table-name xxx | node tools/...   # 標準入力からも可
 *   node tools/format_answers.mjs answers.json --csv > answers.csv
 *   node tools/format_answers.mjs answers.json --json     # 正規化した JSON
 *
 * オプション:
 *   --csv / --json / --text   出力形式 (既定は --text)
 *   --all                     テキスト表示で空欄の項目も出す
 */

import fs from "fs";

// 表示順とラベル。apps/api/src/mail-content.ts の ANSWER_LABELS が原本で、
// 送信フォーム apps/web/src/Rsvp.tsx の answers と同じ並びに揃えてある。
const ANSWER_FIELDS = [
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

const META_FIELDS = [
    ["createdAt", "回答日時"],
    ["email", "メールアドレス"],
    ["emailStatus", "送信状態"],
    ["id", "ID"],
];

// ---------------------------------------------------------------- 入力

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const inputPath = args.find((a) => !a.startsWith("--"));

const format = flags.has("--csv")
    ? "csv"
    : flags.has("--json")
      ? "json"
      : "text";
const showEmpty = flags.has("--all");

const raw = inputPath
    ? fs.readFileSync(inputPath, "utf8")
    : fs.readFileSync(0, "utf8");

const scanned = parseLoosely(raw);
const items = Array.isArray(scanned) ? scanned : (scanned.Items ?? []);

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

// ---------------------------------------------------------------- 変換

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

const records = items.map((item) =>
    Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, unwrap(v)]),
    ),
);

// pk の接頭辞で回答とバウンス抑制リストを振り分ける。
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

// ---------------------------------------------------------------- 整形

/** ISO8601 (UTC) を JST の "YYYY/MM/DD HH:mm" にする */
function toJst(iso) {
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

/** 全角文字を 2 桁として数えた表示幅。ラベルの桁揃えに使う */
function width(s) {
    let w = 0;
    for (const ch of s) {
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

function pad(s, target) {
    return s + " ".repeat(Math.max(0, target - width(s)));
}

/** 回答を [ラベル, 値] の並びに直す。定義外のキーは末尾へ回す */
function orderedAnswers(answers) {
    const rest = new Set(Object.keys(answers));
    const rows = [];
    for (const [key, label] of ANSWER_FIELDS) {
        rest.delete(key);
        rows.push([label, String(answers[key] ?? "")]);
    }
    for (const key of rest) rows.push([key, String(answers[key] ?? "")]);
    return rows;
}

function fullName(answers) {
    const kanji = [answers.FamilyNameKanji, answers.FirstNameKanji]
        .filter(Boolean)
        .join(" ");
    const kana = [answers.FamilyNameKana, answers.FirstNameKana]
        .filter(Boolean)
        .join(" ");
    if (kanji && kana) return `${kanji} (${kana})`;
    return kanji || kana || "(氏名なし)";
}

// ---------------------------------------------------------------- 出力

function renderText() {
    const lines = [];
    const count = (v) =>
        submissions.filter((s) => s.answers.Attendance === v).length;

    lines.push(`回答 ${submissions.length} 件`);
    lines.push(
        `出席 ${count("ご出席")} / 欠席 ${count("ご欠席")} / 保留 ${count("保留")}`,
    );
    lines.push("");

    submissions.forEach((s, i) => {
        const no = String(i + 1).padStart(3, " ");
        lines.push("=".repeat(60));
        lines.push(`${no}. ${fullName(s.answers)}`);

        const rows = [
            ...META_FIELDS.map(([key, label]) => [
                label,
                key === "createdAt" ? toJst(s[key]) : String(s[key] ?? ""),
            ]),
            ...orderedAnswers(s.answers),
        ].filter(([, value]) => showEmpty || value.length > 0);

        const labelWidth = Math.max(...rows.map(([label]) => width(label)));
        for (const [label, value] of rows) {
            const [head, ...tail] = value.split("\n");
            lines.push(`  ${pad(label, labelWidth)} : ${head}`);
            // メッセージなどの改行はラベル幅ぶん字下げして続ける
            for (const cont of tail) {
                lines.push(`  ${" ".repeat(labelWidth)}   ${cont}`);
            }
        }
        lines.push("");
    });

    if (suppressed.length > 0) {
        lines.push("=".repeat(60));
        lines.push(`送信抑制リスト ${suppressed.length} 件`);
        for (const s of suppressed) {
            lines.push(
                `  ${s.email}  ${s.reason}  ${toJst(s.suppressedAt)}`.trimEnd(),
            );
        }
        lines.push("");
    }

    return lines.join("\n");
}

function renderCsv() {
    const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
    const header = [
        ...META_FIELDS.map(([, label]) => label),
        ...ANSWER_FIELDS.map(([, label]) => label),
    ];
    const rows = submissions.map((s) => [
        toJst(s.createdAt),
        s.email,
        s.emailStatus,
        s.id,
        ...ANSWER_FIELDS.map(([key]) => s.answers[key] ?? ""),
    ]);
    if (suppressed.length > 0) {
        console.error(`注記: 送信抑制リスト ${suppressed.length} 件は CSV に含めない`);
    }
    // Excel が UTF-8 と判定できるよう BOM を付ける
    return (
        "﻿" +
        [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") +
        "\r\n"
    );
}

function renderJson() {
    return JSON.stringify(
        {
            submissions: submissions.map((s) => ({
                ...s,
                createdAtJst: toJst(s.createdAt),
                answers: Object.fromEntries(
                    ANSWER_FIELDS.filter(([key]) => key in s.answers).map(
                        ([key]) => [key, s.answers[key]],
                    ),
                ),
            })),
            suppressed,
        },
        null,
        2,
    );
}

const output =
    format === "csv"
        ? renderCsv()
        : format === "json"
          ? renderJson()
          : renderText();
process.stdout.write(output);
