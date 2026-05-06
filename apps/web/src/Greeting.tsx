import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ── 画像 ── */
const IMG_BASE = "/images";
const HERO_IMAGE = {
    src: `${IMG_BASE}/that_pedestrian_crossing_photo.jpg`,
    alt: "that_pedestrian_crossing_photo",
};
const PROFILE_IMAGE = { src: `${IMG_BASE}/cafe.jpg`, alt: "cafe" };
const MESSAGE_BG_IMAGE = {
    src: `${IMG_BASE}/that_pedestrian_crossing_painting.png`,
    alt: "that_pedestrian_crossing_painting",
};

const VERTICAL_RL: React.CSSProperties = {
    writingMode: "vertical-rl",
    textOrientation: "upright",
};

/* ── FadeIn ── */
const FadeIn = ({ children }: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setVisible(true);
                    obs.disconnect();
                }
            },
            { rootMargin: "50px" },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
            {children}
        </div>
    );
};

/* ── セクションタイトル ── */
const SectionTitle = ({
    children,
    align = "center",
}: {
    children: ReactNode;
    align?: "center" | "right" | "left";
}) => {
    const cls =
        align === "center"
            ? "text-center"
            : align === "right"
              ? "text-right"
              : "text-left";
    return <h2 className={`text-2xl mb-8 px-5 ${cls}`}>{children}</h2>;
};

/* ══════════════════════════════════════════════
   Greeting
   ══════════════════════════════════════════════ */
export const Greeting = ({
    onNavigate,
}: {
    onNavigate?: (target: string) => void;
}) => {
    return (
        <div className="bg-background overflow-hidden">
            {/* ═══ 1. HERO ═══ */}
            <header className="pt-12 pb-12">
                <div className="flex justify-center">
                    <div className="relative w-85/109">
                        <span className="absolute -top-1 right-0 w-1/2 h-2 bg-primary z-10 translate-x-8" />
                        {HERO_IMAGE ? (
                            <img
                                src={HERO_IMAGE.src}
                                alt={HERO_IMAGE.alt}
                                className="h-auto object-cover shadow--image"
                            />
                        ) : (
                            <div className="w-full h-full bg-linear-to-br from-muted to-text-mute" />
                        )}
                        <div className="relative">
                            <span className="absolute left-0 -top-1 w-1/2 h-2 bg-primary z-10" />
                        </div>
                        <h1 className="text-xl mt-3">WEDDING INVITATION</h1>
                        <div className="flex flex-col justify-center items-end pr-[38%]">
                            <p className="text-xs text-text-soft">
                                BRASS BLEU TOKYO
                            </p>
                            <p className="text-xs text-text-soft">
                                2026.10.18 Sun
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="flex-4 h-0.5 bg-border" />
                            <span className="text-[0.5rem] text-text-soft shrink-0">
                                mejiro no ekimae toho 1min
                            </span>
                            <span className="flex-1 h-0.5 bg-border" />
                        </div>

                        {/* 縦書き名前 — 画像の外側 */}
                        <span
                            className="absolute top-4 -right-9 z-20 text-foreground"
                            style={VERTICAL_RL}
                        >
                            AKIRA
                        </span>
                        <span
                            className="absolute top-17 -right-6 z-20 text-foreground"
                            style={VERTICAL_RL}
                        >
                            SAKI
                        </span>
                    </div>
                </div>
            </header>

            {/* ═══ 2. MESSAGE ═══ */}
            <FadeIn>
                <section className="relative mx-9">
                    {/* 背景 */}
                    <div
                        className="absolute inset-0 z-0 opacity-85"
                        aria-hidden="true"
                    >
                        {MESSAGE_BG_IMAGE ? (
                            <img
                                src={MESSAGE_BG_IMAGE.src}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-accent" />
                        )}
                    </div>

                    <div className="relative h-full z-10 text-center -translate-x-6 translate-y-4 bg-popover/50">
                        <SectionTitle>MESSAGE</SectionTitle>
                        <div className="flex flex-col gap-3 leading-loose text-foreground">
                            <p className="text-xs">謹啓</p>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>皆さまにおかれましては</p>
                                <p>ご清祥のこととお慶び申し上げます</p>
                            </div>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>このたび 私たちは結婚式を</p>
                                <p>挙げることとなりました</p>
                            </div>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>
                                    つきましては日頃お世話になっている皆さまに
                                </p>
                                <p>お集まりいただきささやかな披露宴を</p>
                                <p>催したいと存じます</p>
                            </div>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>おいそがしいなか恐縮ではございますが</p>
                                <p>ぜひご出席いただけますと幸いです</p>
                            </div>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>皆さまに見守られながら</p>
                                <p>ふたりの新しい門出を迎えられることを</p>
                                <p>心より楽しみにしております</p>
                            </div>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>謹白</p>
                            </div>
                            <div className="h-16"> {/* padding */}</div>
                        </div>
                    </div>
                </section>
            </FadeIn>

            {/* ═══ 3. PROFILE ═══ */}
            <FadeIn>
                <section className="py-12">
                    {/* 写真 */}
                    <div className="relative mx-5 mb-10 aspect-1">
                        {PROFILE_IMAGE ? (
                            <img
                                src={PROFILE_IMAGE.src}
                                alt={PROFILE_IMAGE.alt}
                                className="w-full h-full object-cover shadow-image"
                            />
                        ) : (
                            <div className="w-full h-full bg-linear-to-br from-text-mute to-muted-foreground" />
                        )}
                        <span className="absolute -top-1 right-0 w-6/10 h-3 bg-primary z-10 translate-x-8" />
                        <span
                            className="absolute top-4 -right-7 z-20 text-lg text-foreground"
                            style={VERTICAL_RL}
                        >
                            PROFILE
                        </span>
                    </div>

                    {/* プロフィールカード */}
                    <div className="grid grid-cols-2 gap-4 px-5">
                        {/* BRIDE */}
                        <article className="relative bg-card border border-border p-6 pl-8">
                            <header className="mb-4 pb-3 border-b border-border">
                                <p className="text-base mb-1">柴田 咲葵</p>
                                <p className="text-xs text-text-soft mb-1">
                                    SHIBATA SAKI
                                </p>
                                <p className="text-[0.7rem] text-text-mute">
                                    1998.5.7 Kyoto
                                </p>
                            </header>
                            <dl className="text-xs leading-[1.8]">
                                <dt className="text-text-soft">好きなもの:</dt>
                                <dd className="mb-3">
                                    料理やお菓子作りが好きです
                                    <br />
                                    週末はキッチンで過ごす時間が
                                </dd>
                                <dt className="text-text-soft">メッセージ:</dt>
                                <dd>
                                    みなさまにお会いできることを
                                    <br />
                                    楽しみにしています!
                                </dd>
                            </dl>
                            <span className="absolute top-3 -right-1 w-3 h-2/5 bg-accent">
                                <div
                                    className="flex w-full h-full px-5 items-center text-text-soft"
                                    style={VERTICAL_RL}
                                >
                                    BRIDE
                                </div>
                            </span>
                        </article>

                        {/* GROOM */}
                        <article className="relative bg-card border border-border p-6 pr-8">
                            <header className="mb-4 pb-3 border-b border-border text-right">
                                <p className="text-base mb-1">林 晶</p>
                                <p className="text-xs text-text-soft mb-1">
                                    LIN AKIRA
                                </p>
                                <p className="text-[0.7rem] text-text-mute">
                                    1997.2.20 Kanagawa
                                </p>
                            </header>
                            <dl className="text-xs leading-[1.8]">
                                <dt className="text-text-soft">メッセージ:</dt>
                                <dd>
                                    みなさまにお会いできることを
                                    <br />
                                    楽しみにしています!
                                </dd>
                            </dl>
                            <span className="absolute top-32 -left-1 w-3 h-2/5 bg-accent">
                                <div
                                    className="flex w-full h-full px-5 items-center text-text-soft"
                                    style={VERTICAL_RL}
                                >
                                    GROOM
                                </div>
                            </span>
                        </article>
                    </div>
                </section>
            </FadeIn>

            {/* ═══ 4. SCHEDULE ═══ */}
            <FadeIn>
                <section className="py-12 relative">
                    <div className="flex items-center gap-3 px-5 mb-8">
                        <span className="flex-1 h-0.5 bg-border" />
                        <span className="text-2xl">SCHEDULE</span>
                    </div>

                    <ol className="px-5 relative">
                        {[
                            {
                                time: "10:00",
                                title: "ウェルカムパーティ(受付開始)",
                                text: "ゲストの皆さまとの時間を少しでも長く楽しみたいと思い\n新郎新婦のふたりが受付付近にて皆さまをお待ちしております\n朝早くではございますが ぜひ10時からお越しください",
                                accent: true,
                            },
                            {
                                time: "11:00",
                                title: "披露宴",
                                text: "ゲストの皆さまとの時間を少しでも長く楽しみたいと思い\n新郎新婦のふたりが受付付近にて皆さまをお待ちしております\n朝早くなりますが ぜひ10時からお越しください",
                                illust: true,
                            },
                            {
                                time: "13:50",
                                title: "挙式",
                                text: "紙婚にあたり 大切な皆さまの前で誓いを立てます\n温かく見守っていただけますと幸いです",
                            },
                            {
                                time: "14:00",
                                title: "お見送り",
                                text: "結婚にあたり 大切な皆さまの前で誓いを立てます\n温かく見守っていただけますと幸いです",
                            },
                        ].map((item, i, arr) => (
                            <li
                                key={item.time + item.title}
                                className="grid grid-cols-[auto_10px_1fr] gap-x-3 relative pb-2"
                            >
                                {/* 時刻 */}
                                <div className="flex items-center h-[1.2em]">
                                    <span className="text-[0.85rem leading-none">
                                        {item.time}
                                    </span>
                                </div>

                                {/* ドット + 縦線 */}
                                <div className="relative flex flex-col items-center">
                                    <div className="flex items-center h-[1.2em]">
                                        <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-primary border-2 border-background shadow-[0_0_0_1px_var(--primary)] z-10" />
                                    </div>
                                    {i < arr.length - 1 && (
                                        <span className="absolute top-3 -bottom-3 left-1/2 -translate-x-1/2 w-px bg-border" />
                                    )}
                                </div>

                                {/* コンテンツ */}
                                <div>
                                    <h3 className="text-[0.85rem] mb-2">
                                        {item.title}
                                        <span className="block w-75/100 h-px bg-border" />
                                    </h3>
                                    <p className="text-[0.5rem] leading-[1.8] text-text-soft whitespace-pre-line">
                                        {item.text}
                                    </p>
                                    {item.illust && (
                                        <div className="mt-3 p-4 bg-surface-alt text-center text-xs text-text-soft rounded-sm">
                                            いい感じのイラスト
                                        </div>
                                    )}
                                </div>

                                {/* アクセントバー */}
                                {item.accent && (
                                    <span className="absolute -top-5 right-0 w-2 h-40 bg-primary" />
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            </FadeIn>

            {/* ═══ 5. INFORMATION ═══ */}
            <FadeIn>
                <section className="relative">
                    <div className="relative">
                        {/* 左端アクセントバー */}
                        <span className="absolute top-0 left-0 w-2 h-full bg-primary" />
                        <div className="flex items-center gap-3 px-5 mb-8">
                            <span className="text-2xl">INFORMATION</span>
                        </div>
                        <div className="px-7 flex flex-col gap-4 leading-[1.9] text-text-soft text-[0.6rem]">
                            <p>
                                ゲスト更衣室が3室ございます
                                <br />
                                10時から11時のあいだと14時以降の時間帯にご利用いただけます
                            </p>
                            <p>
                                会場内には喫煙室もございますが
                                <br />
                                諸に勝手ながら全室禁煙とさせていただきます
                                <br />
                                ゲストの皆さまにはご不便おかけしますがご協力お願い申し上げます
                            </p>
                            <p>
                                お車でお越しの際は近隣のパーキングをご利用ください
                                <br />
                                会場専用の駐車スペースはございません
                            </p>
                            <div className="h-7">{/* padding */}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5">
                        <span className="w-2/5" />
                        <span className="flex-1 h-0.5 bg-border" />
                    </div>
                </section>
            </FadeIn>

            {/* ═══ 6. ACCESS ═══ */}
            <FadeIn>
                <section className="py-5 mt-12 bg-surface-alt">
                    <SectionTitle>ACCESS</SectionTitle>

                    <div className="grid grid-cols-[2fr_1fr] gap-4 px-5">
                        {/* 地図 */}
                        <iframe
                            title="ブラスブルー東京"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3239.182933145228!2d139.707304!3d35.7217193!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188d3cac293617%3A0x93024249428b39a5!2z44OW44Op44K544OW44Or44O85p2x5Lqs!5e0!3m2!1sja!2sjp!4v1778030033050!5m2!1sja!2sjp"
                            className="w-full h-full border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />

                        {/* 情報 */}
                        <div className="flex flex-col gap-2">
                            <h3 className="text-base mb-1">ブラスブルー東京</h3>
                            <div className="flex flex-col gap-2 text-[0.5rem] text-text-soft">
                                <p>
                                    〒171-0031 <br />
                                    東京都豊島区目白2-39-1 <br />
                                    トラッド目白 3階/4階
                                </p>
                                <p>☏ 03-5950-7025</p>
                                <a
                                    href="https://www.brassbleu-tokyo.brass.ne.jp/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 border-b"
                                >
                                    BRASS BLEU TOKYO
                                    <ExternalLink className="w-2 h-auto" />
                                </a>
                            </div>
                            <p className="mt-3 text-[0.5rem] text-foreground leading-relaxed">
                                ご不明点ございましたら
                                <br />
                                新郎新婦までお尋ねください
                            </p>
                        </div>
                    </div>
                </section>
            </FadeIn>

            {/* ═══ 7. FOOTER CTA ═══ */}
            <footer className="py-12 px-5 text-center bg-background">
                <button
                    type="button"
                    className="inline-block px-16 py-3 bg-card border border-border text-xs text-foreground mb-6 hover:bg-accent hover:border-primary transition-colors"
                    onClick={() => onNavigate?.("forms")}
                >
                    ご回答のほどお願いします
                </button>
                <p className="text-xs text-text-soft">
                    99月99日(極) 迄にご回答いただければ幸に存じます
                </p>
            </footer>
        </div>
    );
};
