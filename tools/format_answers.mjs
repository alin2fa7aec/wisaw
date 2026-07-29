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

import {
    loadAnswers,
    ANSWER_FIELDS,
    META_FIELDS,
    toJst,
    width,
    pad,
    fullName,
    csvCell,
} from "./lib/answers.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const inputPath = args.find((a) => !a.startsWith("--"));

const format = flags.has("--csv")
    ? "csv"
    : flags.has("--json")
      ? "json"
      : "text";
const showEmpty = flags.has("--all");

const { submissions, suppressed } = loadAnswers(inputPath);

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
        console.error(
            `注記: 送信抑制リスト ${suppressed.length} 件は CSV に含めない`,
        );
    }
    // Excel が UTF-8 と判定できるよう BOM を付ける
    return (
        "﻿" +
        [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") +
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
