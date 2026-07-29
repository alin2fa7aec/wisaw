/**
 * 交通費の概算に使う駅と運賃の表
 *
 * 金額は「大人 1 名 / 片道 / 通常期 / 普通車指定席」の正規運賃 (乗車券 + 特急料金)。
 * verified: true は 2026-07 時点で実額を確認したもの。false は近隣区間からの推定値。
 * 航空は割引運賃の実勢に幅があるため、すべて推定 (verified: false) 扱いとする。
 *
 * 金額が古くなったらこのファイルだけ直せばよい。
 */

export const VENUE = {
    name: "ブラスブルー東京",
    address: "東京都豊島区目白2-39-1",
    station: "目白",
};

// 乗換拠点から会場最寄りの目白駅までの片道
const HUB_TO_VENUE = {
    東京: 170, // JR山手線 東京 -> 目白
    羽田: 660, // 東京モノレール + JR山手線 羽田空港 -> 目白
    なし: 0, // 起点そのものが目白までの運賃 (在来線圏)
};

/**
 * 出発地の代表駅・空港。
 * fare は「その駅 -> via の拠点」の片道。via が "なし" の場合は目白までの直通運賃。
 */
export const STATIONS = {
    // ---- 北海道・東北 (東北/北海道/秋田/山形新幹線) ----
    新千歳空港: { mode: "飛行機", via: "羽田", fare: 18000, verified: false },
    新函館北斗: { mode: "新幹線", via: "東京", fare: 23430, verified: true },
    新青森: { mode: "新幹線", via: "東京", fare: 17670, verified: true },
    盛岡: { mode: "新幹線", via: "東京", fare: 15010, verified: true },
    秋田: { mode: "新幹線", via: "東京", fare: 18020, verified: true },
    仙台: { mode: "新幹線", via: "東京", fare: 11630, verified: true },
    山形: { mode: "新幹線", via: "東京", fare: 11450, verified: true },
    福島: { mode: "新幹線", via: "東京", fare: 9290, verified: false },
    郡山: { mode: "新幹線", via: "東京", fare: 8340, verified: false },
    いわき: { mode: "在来線特急", via: "東京", fare: 6500, verified: false },

    // ---- 関東 (在来線圏) ----
    東京都内: { mode: "在来線", via: "なし", fare: 300, verified: false },
    横浜: { mode: "在来線", via: "なし", fare: 580, verified: false },
    小田原: { mode: "在来線", via: "なし", fare: 1690, verified: false },
    大宮: { mode: "在来線", via: "なし", fare: 660, verified: false },
    千葉: { mode: "在来線", via: "なし", fare: 830, verified: false },
    水戸: { mode: "在来線", via: "なし", fare: 2310, verified: false },
    宇都宮: { mode: "在来線", via: "なし", fare: 2310, verified: false },
    高崎: { mode: "在来線", via: "なし", fare: 1980, verified: false },
    甲府: { mode: "在来線特急", via: "なし", fare: 4130, verified: false },

    // ---- 中部・北陸 (東海道/上越/北陸新幹線) ----
    越後湯沢: { mode: "新幹線", via: "東京", fare: 6790, verified: false },
    長岡: { mode: "新幹線", via: "東京", fare: 9490, verified: false },
    新潟: { mode: "新幹線", via: "東京", fare: 10980, verified: true },
    上越妙高: { mode: "新幹線", via: "東京", fare: 9900, verified: false },
    長野: { mode: "新幹線", via: "東京", fare: 8340, verified: true },
    富山: { mode: "新幹線", via: "東京", fare: 12960, verified: true },
    金沢: { mode: "新幹線", via: "東京", fare: 14600, verified: true },
    福井: { mode: "新幹線", via: "東京", fare: 16030, verified: true },
    三島: { mode: "新幹線", via: "東京", fare: 4850, verified: false },
    静岡: { mode: "新幹線", via: "東京", fare: 6470, verified: true },
    浜松: { mode: "新幹線", via: "東京", fare: 8440, verified: true },
    名古屋: { mode: "新幹線", via: "東京", fare: 11300, verified: true },
    岐阜羽島: { mode: "新幹線", via: "東京", fare: 11800, verified: false },
    米原: { mode: "新幹線", via: "東京", fare: 12800, verified: false },

    // ---- 近畿・中国・四国 (東海道/山陽新幹線) ----
    京都: { mode: "新幹線", via: "東京", fare: 14170, verified: true },
    新大阪: { mode: "新幹線", via: "東京", fare: 14720, verified: true },
    新神戸: { mode: "新幹線", via: "東京", fare: 15390, verified: false },
    姫路: { mode: "新幹線", via: "東京", fare: 16720, verified: false },
    岡山: { mode: "新幹線", via: "東京", fare: 17770, verified: true },
    広島: { mode: "新幹線", via: "東京", fare: 21540, verified: true },
    新山口: { mode: "新幹線", via: "東京", fare: 22890, verified: false },
    鳥取空港: { mode: "飛行機", via: "羽田", fare: 20000, verified: false },
    出雲空港: { mode: "飛行機", via: "羽田", fare: 22000, verified: false },
    高松空港: { mode: "飛行機", via: "羽田", fare: 20000, verified: false },
    徳島空港: { mode: "飛行機", via: "羽田", fare: 20000, verified: false },
    松山空港: { mode: "飛行機", via: "羽田", fare: 22000, verified: false },
    高知空港: { mode: "飛行機", via: "羽田", fare: 22000, verified: false },

    // ---- 九州・沖縄 ----
    小倉: { mode: "新幹線", via: "東京", fare: 22730, verified: false },
    博多: { mode: "新幹線", via: "東京", fare: 23810, verified: true },
    熊本: { mode: "新幹線", via: "東京", fare: 28660, verified: true },
    鹿児島空港: { mode: "飛行機", via: "羽田", fare: 26000, verified: false },
    長崎空港: { mode: "飛行機", via: "羽田", fare: 25000, verified: false },
    大分空港: { mode: "飛行機", via: "羽田", fare: 24000, verified: false },
    宮崎空港: { mode: "飛行機", via: "羽田", fare: 26000, verified: false },
    那覇空港: { mode: "飛行機", via: "羽田", fare: 28000, verified: false },
};

/** 都道府県ごとの既定の出発駅。市区町村で当たらなかったときに使う */
export const PREF_DEFAULT = {
    北海道: "新千歳空港",
    青森県: "新青森",
    岩手県: "盛岡",
    宮城県: "仙台",
    秋田県: "秋田",
    山形県: "山形",
    福島県: "福島",
    茨城県: "水戸",
    栃木県: "宇都宮",
    群馬県: "高崎",
    埼玉県: "大宮",
    千葉県: "千葉",
    東京都: "東京都内",
    神奈川県: "横浜",
    新潟県: "新潟",
    富山県: "富山",
    石川県: "金沢",
    福井県: "福井",
    山梨県: "甲府",
    長野県: "長野",
    岐阜県: "名古屋",
    静岡県: "静岡",
    愛知県: "名古屋",
    三重県: "名古屋",
    滋賀県: "米原",
    京都府: "京都",
    大阪府: "新大阪",
    兵庫県: "新神戸",
    奈良県: "京都",
    和歌山県: "新大阪",
    鳥取県: "鳥取空港",
    島根県: "出雲空港",
    岡山県: "岡山",
    広島県: "広島",
    山口県: "新山口",
    徳島県: "徳島空港",
    香川県: "高松空港",
    愛媛県: "松山空港",
    高知県: "高知空港",
    福岡県: "博多",
    佐賀県: "博多",
    長崎県: "長崎空港",
    熊本県: "熊本",
    大分県: "大分空港",
    宮崎県: "宮崎空港",
    鹿児島県: "鹿児島空港",
    沖縄県: "那覇空港",
};

/**
 * 都道府県の既定では実態と離れる市区町村の上書き。
 * キーは市区町村名の前方一致で判定する ("浜松市中央区" は "浜松市" に当たる)。
 */
export const CITY_OVERRIDE = {
    北海道: { 函館市: "新函館北斗", 北斗市: "新函館北斗", 七飯町: "新函館北斗" },
    福島県: { 郡山市: "郡山", いわき市: "いわき", 白河市: "郡山" },
    新潟県: { 長岡市: "長岡", 湯沢町: "越後湯沢", 上越市: "上越妙高", 妙高市: "上越妙高" },
    神奈川県: { 小田原市: "小田原", 箱根町: "小田原", 湯河原町: "小田原" },
    静岡県: {
        浜松市: "浜松",
        磐田市: "浜松",
        掛川市: "静岡",
        三島市: "三島",
        沼津市: "三島",
        熱海市: "三島",
        伊東市: "三島",
    },
    岐阜県: { 岐阜市: "岐阜羽島", 大垣市: "岐阜羽島", 羽島市: "岐阜羽島" },
    兵庫県: { 姫路市: "姫路", 赤穂市: "姫路", たつの市: "姫路" },
    福岡県: { 北九州市: "小倉", 行橋市: "小倉" },
    山口県: { 下関市: "小倉", 岩国市: "広島" },
    熊本県: { 天草市: "熊本" },
};

/** 出発地から会場までの片道概算 */
export function oneWayFare(stationName) {
    const s = STATIONS[stationName];
    if (!s) return null;
    return s.fare + (HUB_TO_VENUE[s.via] ?? 0);
}
