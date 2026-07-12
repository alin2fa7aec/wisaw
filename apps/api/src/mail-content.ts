/**
 * RSVP 回答受付メールの件名・本文を組み立てるモジュール
 *
 * 送信処理(SES/スタブ)は mail.ts が担う。ここは文面だけを扱う。
 */

export const RSVP_MAIL_SUBJECT = "結婚式ご出欠のお返事、ありがとうございます";

const ANSWER_LABELS: Record<string, string> = {
    Attendance: "ご出欠",
    Host: "どちら側のゲスト",
    FamilyNameKanji: "姓",
    FirstNameKanji: "名",
    FamilyNameKana: "セイ",
    FirstNameKana: "メイ",
    FamilyNameEn: "Family Name",
    FirstNameEn: "First Name",
    Tel: "電話番号",
    PostCode: "郵便番号",
    Prefecture: "都道府県",
    Municipalities: "市区町村",
    Block: "番地",
    BuildingAndRoom: "建物名・部屋番号",
    AllergyHas: "アレルギー",
    AllergyItems: "特定原材料",
    AllergyOther: "その他アレルギー",
    Message: "メッセージ",
};

export function buildRsvpMailBody(answers: Record<string, string>): string {
    const fullName = [answers.FamilyNameKanji, answers.FirstNameKanji]
        .filter((v) => v && v.length > 0)
        .join(" ");
    const greeting = fullName ? `${fullName} 様` : "ご回答者さま";

    // 出欠に応じて挨拶と結びの言葉を変える
    let lead: string[];
    let closing: string[];
    switch (answers.Attendance) {
        case "ご出席":
            lead = [
                "このたびはご出席のお返事をいただき、ありがとうございます。",
                "当日、皆さまにお会いできることを心より楽しみにしております。",
            ];
            closing = [
                "2026年10月18日(日)、お会いできますことを楽しみにしております。",
            ];
            break;
        case "ご欠席":
            lead = [
                "このたびはお返事をいただき、ありがとうございます。",
                "ご一緒できないのは残念ですが、お気持ちだけでも大変うれしく思います。",
            ];
            closing = [];
            break;
        case "保留":
            lead = [
                "このたびはお返事をいただき、ありがとうございます。",
                "ご予定が決まりましたら、改めてお知らせいただけますと幸いです。",
            ];
            closing = [
                "2026年10月18日(日) にお会いできますことを楽しみにしております。",
            ];
            break;
        default:
            lead = ["このたびはご回答いただき、ありがとうございます。"];
            closing = [];
    }

    const details = Object.entries(answers)
        .filter(([, a]) => a.length > 0)
        .map(([q, a]) => `${ANSWER_LABELS[q] ?? q}: ${a}`);

    const lines = [
        greeting,
        "",
        ...lead,
        "",
        "いただいた内容は以下のとおりです。",
        "─────────────────────",
        ...details,
        "─────────────────────",
        "",
        ...closing,
        ...(closing.length > 0 ? [""] : []),
        "柴田 咲葵 ・ 林 晶",
        "",
        "※ このメールは自動送信です。このアドレスへは返信できませんので、ご不明な点は新郎新婦へ直接お問い合わせください。",
    ];
    return lines.join("\n");
}
