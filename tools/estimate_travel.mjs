/**
 * 回答の住所から出発地の最寄り駅・空港を特定し、会場までの交通費を概算するスクリプト
 *
 * 使い方:
 *   node tools/estimate_travel.mjs answers.json          # 一覧表示 (既定)
 *   node tools/estimate_travel.mjs answers.json --csv > travel.csv
 *   node tools/estimate_travel.mjs answers.json --json
 *
 * オプション:
 *   --csv / --json / --text   出力形式 (既定は --text)
 *   --half                    交通費を折半 (半額負担) して計算する
 *   --round=N                 お車代の丸め単位 (既定 1000, 0 で丸めなし)
 *   --include-absent          ご欠席の回答も一覧に含める
 *
 * 金額の前提:
 *   - 運賃表は tools/lib/fares.mjs にある。古くなったらそこを直す
 *   - 大人 1 名 / 通常期 / 普通車指定席の正規運賃。割引きっぷは考慮しない
 *   - 自宅から出発駅・空港までの費用は含まない
 */

import {
    loadAnswers,
    fullName,
    width,
    pad,
    padStart,
    csvCell,
} from "./lib/answers.mjs";
import {
    VENUE,
    STATIONS,
    PREF_DEFAULT,
    CITY_OVERRIDE,
    oneWayFare,
} from "./lib/fares.mjs";

// ---------------------------------------------------------------- 入力

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const has = (f) => flags.includes(f);
const inputPath = args.find((a) => !a.startsWith("--"));

const format = has("--csv") ? "csv" : has("--json") ? "json" : "text";
const half = has("--half");
const includeAbsent = has("--include-absent");
const roundUnit = Number(
    flags.find((f) => f.startsWith("--round="))?.slice("--round=".length) ?? 1000,
);

const { submissions } = loadAnswers(inputPath);

// ---------------------------------------------------------------- 住所の突き合わせ

// "神奈川" のように接尾辞を省いて書かれることがあるため、
// 都/道/府/県 を落とした形をキーにした索引を作っておく。
const PREF_BY_SHORT = new Map(
    Object.keys(PREF_DEFAULT).map((p) => [p.replace(/[都道府県]$/, ""), p]),
);

function normalizePref(raw) {
    const value = String(raw ?? "").trim();
    if (!value) return null;
    if (PREF_DEFAULT[value]) return value;
    return PREF_BY_SHORT.get(value.replace(/[都道府県]$/, "")) ?? null;
}

/**
 * 住所から出発地を決める。
 * 市区町村の上書きを前方一致で探し、当たらなければ都道府県の既定を使う。
 */
function resolveOrigin(answers) {
    const pref = normalizePref(answers.Prefecture);
    if (!pref) {
        return { pref: null, station: null, matchedBy: "判定不可" };
    }

    const city = String(answers.Municipalities ?? "").trim();
    const overrides = CITY_OVERRIDE[pref] ?? {};
    for (const [key, station] of Object.entries(overrides)) {
        if (city.startsWith(key)) {
            return { pref, station, matchedBy: "市区町村" };
        }
    }
    return { pref, station: PREF_DEFAULT[pref], matchedBy: "都道府県" };
}

/** 丸め単位に切り上げる。お車代はキリのいい額にするのが通例 */
function roundUp(amount) {
    if (!roundUnit || roundUnit <= 0) return amount;
    return Math.ceil(amount / roundUnit) * roundUnit;
}

const rows = submissions
    .filter((s) => includeAbsent || s.answers.Attendance !== "ご欠席")
    .map((s) => {
        const origin = resolveOrigin(s.answers);
        const info = origin.station ? STATIONS[origin.station] : null;
        const one = origin.station ? oneWayFare(origin.station) : null;
        const round = one === null ? null : one * 2;
        const burden = round === null ? null : roundUp(half ? round / 2 : round);

        return {
            name: fullName(s.answers),
            attendance: s.answers.Attendance ?? "",
            host: s.answers.Host ?? "",
            pref: origin.pref ?? String(s.answers.Prefecture ?? ""),
            city: String(s.answers.Municipalities ?? ""),
            station: origin.station ?? "",
            mode: info?.mode ?? "",
            via: info?.via ?? "",
            matchedBy: origin.matchedBy,
            verified: info?.verified ?? false,
            oneWay: one,
            roundTrip: round,
            burden,
        };
    });

// 遠方 (高額) から並べる。お車代の判断は金額の大きい人から見るほうが早い
rows.sort((a, b) => (b.roundTrip ?? -1) - (a.roundTrip ?? -1));

// ---------------------------------------------------------------- 出力

const yen = (n) => (n === null ? "-" : `${n.toLocaleString("ja-JP")}円`);

function renderText() {
    const lines = [];
    const label = half ? "お車代 (折半)" : "お車代";

    const cols = [
        ["氏名", (r) => r.name, "left"],
        ["住所", (r) => `${r.pref}${r.city}`, "left"],
        ["出発地", (r) => r.station || "(不明)", "left"],
        ["手段", (r) => r.mode, "left"],
        ["片道", (r) => yen(r.oneWay), "right"],
        ["往復", (r) => yen(r.roundTrip), "right"],
        [label, (r) => yen(r.burden), "right"],
        [
            "確度",
            (r) =>
                !r.station ? r.matchedBy : `${r.matchedBy}${r.verified ? "" : "/推定"}`,
            "left",
        ],
    ];

    const table = rows.map((r) => cols.map(([, get]) => get(r)));
    const widths = cols.map(([head], i) =>
        Math.max(width(head), ...table.map((t) => width(t[i])), 0),
    );
    const fit = (text, i) =>
        cols[i][2] === "right" ? padStart(text, widths[i]) : pad(text, widths[i]);

    lines.push(`会場: ${VENUE.name} (${VENUE.address}) 最寄り ${VENUE.station}駅`);
    lines.push(`対象 ${rows.length} 名${includeAbsent ? "" : " (ご欠席を除く)"}`);
    lines.push("");
    lines.push(cols.map(([head], i) => fit(head, i)).join("  "));
    lines.push(widths.map((w) => "-".repeat(w)).join("  "));
    for (const t of table) {
        lines.push(t.map(fit).join("  "));
    }

    const known = rows.filter((r) => r.burden !== null);
    const total = known.reduce((sum, r) => sum + r.burden, 0);
    lines.push("");
    lines.push(`${label} 合計: ${yen(total)} (${known.length} 名)`);
    if (known.length < rows.length) {
        lines.push(`※ 住所から出発地を特定できなかった ${rows.length - known.length} 名は合計に含まない`);
    }
    lines.push("");
    lines.push("※ 大人 1 名 / 通常期 / 普通車指定席の正規運賃による概算。割引きっぷは考慮しない");
    lines.push("※ 自宅から出発駅・空港までの費用は含まない");
    lines.push(`※ 「推定」印の区間は実額未確認。運賃表は tools/lib/fares.mjs で直せる`);
    if (roundUnit > 0) {
        lines.push(`※ お車代は ${roundUnit.toLocaleString("ja-JP")} 円単位で切り上げ`);
    }

    return lines.join("\n") + "\n";
}

function renderCsv() {
    const header = [
        "氏名",
        "ご出欠",
        "どちら側のゲスト",
        "都道府県",
        "市区町村",
        "出発地",
        "手段",
        "経由",
        "片道",
        "往復",
        half ? "お車代(折半)" : "お車代",
        "判定",
        "運賃確度",
    ];
    const body = rows.map((r) => [
        r.name,
        r.attendance,
        r.host,
        r.pref,
        r.city,
        r.station,
        r.mode,
        r.via,
        r.oneWay ?? "",
        r.roundTrip ?? "",
        r.burden ?? "",
        r.matchedBy,
        r.verified ? "実額" : "推定",
    ]);
    // Excel が UTF-8 と判定できるよう BOM を付ける
    return (
        "﻿" +
        [header, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n") +
        "\r\n"
    );
}

function renderJson() {
    const known = rows.filter((r) => r.burden !== null);
    return (
        JSON.stringify(
            {
                venue: VENUE,
                options: { half, roundUnit, includeAbsent },
                total: known.reduce((sum, r) => sum + r.burden, 0),
                unresolved: rows.length - known.length,
                guests: rows,
            },
            null,
            2,
        ) + "\n"
    );
}

const output =
    format === "csv" ? renderCsv() : format === "json" ? renderJson() : renderText();
process.stdout.write(output);
