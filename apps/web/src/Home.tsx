import { ExternalLink } from "lucide-react";
import { Github, Instagram } from "@mynaui/icons-react";
import { Button } from "@/components/ui/button";
import { type ReactNode, useEffect, useState } from "react";
import { FadeIn } from "@/components/FadeIn";

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
const MAP_IMAGE = { src: `${IMG_BASE}/map.png`, alt: "map" };

const WEDDING_START = new Date("2026-10-18T10:00:00+09:00").getTime();
const WEDDING_END = new Date("2026-10-19T00:00:00+09:00").getTime();
const useWeddingMessage = () => {
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            if (now >= WEDDING_END) {
                setMsg("arigatou gozaimashita");
                return false;
            }
            if (now >= WEDDING_START) {
                setMsg("tadaima shiki no massaichu!");
                return false;
            }
            const diff = WEDDING_START - now;
            const d = Math.floor(diff / 86_400_000);
            const h = Math.floor((diff % 86_400_000) / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            const s = Math.floor((diff % 60_000) / 1_000);
            setMsg(
                d > 0 ? `ato ${d}d ${h}h ${m}m ${s}s` : `ato ${h}h ${m}m ${s}s`,
            );
            return true;
        };
        if (!update()) return;
        const id = setInterval(() => {
            if (!update()) clearInterval(id);
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return msg;
};

const VERTICAL_RL: React.CSSProperties = {
    writingMode: "vertical-rl",
    textOrientation: "upright",
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
   Home
   ══════════════════════════════════════════════ */
export const Home = ({
    onNavigate,
}: {
    onNavigate?: (target: string) => void;
}) => {
    const weddingMessage = useWeddingMessage();

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
                                className="h-auto object-cover shadow-image"
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
                                {weddingMessage}
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
            <section className="relative ml-12 mr-6">
                {/* 背景 */}
                <FadeIn
                    variant="scale-slow"
                    waitForImage
                    className="absolute inset-0 z-0"
                >
                    <div
                        className="w-full h-full opacity-85"
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
                </FadeIn>

                <div className="relative h-full z-10 text-center -translate-x-6 translate-y-4 bg-popover/50">
                    <FadeIn>
                        <SectionTitle>MESSAGE</SectionTitle>
                    </FadeIn>
                    <div className="flex flex-col gap-3 leading-loose text-foreground">
                        <FadeIn delay={200}>
                            <p className="text-xs">謹啓</p>
                        </FadeIn>
                        <FadeIn delay={450}>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>皆さまにおかれましては</p>
                                <p>ご清祥のこととお慶び申し上げます</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={700}>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>このたび 私たちは結婚式を</p>
                                <p>挙げることとなりました</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={950}>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>つきましては日頃お世話になっている</p>
                                <p>皆さまにお集まりいただき</p>
                                <p> ささやかな披露宴を</p>
                                <p>催したいと存じます</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={1200}>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>皆さまに見守られながら</p>
                                <p>ふたりの新しい門出を迎えられることを</p>
                                <p>心より楽しみにしております</p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={1450}>
                            <div className="flex flex-col gap-0 text-xs">
                                <p>謹白</p>
                            </div>
                        </FadeIn>
                        <div className="h-16"> {/* padding */}</div>
                    </div>
                </div>
            </section>

            {/* ═══ 3. PROFILE ═══ */}
            <section className="py-12">
                {/* 写真 */}
                <FadeIn variant="scale-slow" waitForImage>
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
                </FadeIn>

                {/* プロフィールカード */}
                <div className="grid grid-cols-2 gap-4 px-5">
                    {/* BRIDE */}
                    <FadeIn variant="scale" delay={500} className="h-full">
                        <article className="relative bg-card border border-border p-6 pl-8 h-full">
                            <header className="mb-4 pb-3 border-b border-border">
                                <p className="text-base mb-1">柴田 咲葵</p>
                                <p className="text-xs text-text-soft mb-1">
                                    SHIBATA SAKI
                                </p>
                                <p className="text-[0.7rem] text-text-mute">
                                    1998.5.7
                                    <br />
                                    Kyoto
                                </p>
                            </header>
                            <dl className="text-[0.5rem] leading-[1.8]">
                                <dt className="text-text-soft">好きなこと:</dt>
                                <dd className="mb-3">料理が好きです</dd>
                                <dt className="text-text-soft">メッセージ:</dt>
                                <dd>
                                    皆さまと和やかな時間を過ごせる一日になればと思っています
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
                    </FadeIn>

                    {/* GROOM */}
                    <FadeIn variant="scale" delay={900} className="h-full">
                        <article className="relative bg-card border border-border p-6 pr-8 h-full">
                            <header className="mb-4 pb-3 border-b border-border text-right">
                                <p className="text-base mb-1">林 晶</p>
                                <p className="text-xs text-text-soft mb-1">
                                    LIN AKIRA
                                </p>
                                <p className="text-[0.7rem] text-text-mute">
                                    1997.2.20
                                    <br />
                                    Kanagawa
                                </p>
                            </header>
                            <dl className="text-[0.5rem] leading-[1.8]">
                                <dt className="text-text-soft">好きなこと:</dt>
                                <dd className="mb-3">
                                    本を読みお茶を飲みただ歩くことを喜びとします
                                </dd>
                                <dt className="text-text-soft">メッセージ:</dt>
                                <dd>
                                    何年後にも惜しむことのない
                                    そんな日を皆さまと一緒に過ごせることを
                                    心待ちにしております
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
                    </FadeIn>
                </div>
            </section>

            {/* ═══ 4. SCHEDULE ═══ */}
            <section className="py-12 relative">
                <FadeIn>
                    <div className="flex items-center gap-3 px-5 mb-8">
                        <span className="flex-1 h-0.5 bg-border" />
                        <span className="text-2xl">SCHEDULE</span>
                    </div>
                </FadeIn>

                <ol className="px-5 relative">
                    {[
                        {
                            time: "10:00",
                            title: "ウェルカムパーティ(受付開始)",
                            text: "ゲストの皆さまとの時間を少しでも長く楽しみたいと思い\n新郎新婦のふたりが受付にて皆さまをお待ちしております\n朝早くではございますが ぜひ10時からお越しください",
                            accent: true,
                        },
                        {
                            time: "10:45",
                            title: "受付締切",
                            text: "スムーズな進行のため10時45分までに\n受付をお済ませくださいますようお願いいたします",
                            highlight: true,
                        },
                        {
                            time: "11:00",
                            title: "披露宴",
                            text: "お食事とご歓談をお楽しみいただきながら\n新郎新婦より皆さまへご挨拶をさせていただきます\nお料理もたくさんご用意しておりますので\nどうぞ ごゆっくりお過ごしください",
                            illust: true,
                        },
                        {
                            time: "13:20",
                            title: "挙式",
                            text: "結婚にあたり 大切な皆さまの前で誓いを立てます\n温かく見守っていただけますと幸いです",
                        },
                        {
                            time: "13:30",
                            title: "お見送り",
                            text: "新郎新婦より感謝の気持ちを込めてお見送りいたします",
                        },
                    ].map((item, i, arr) => (
                        <FadeIn
                            key={item.time + item.title}
                            delay={300 + i * 250}
                        >
                            <li className="grid grid-cols-[auto_14px_1fr] gap-x-3 relative pb-2">
                                {/* 時刻 */}
                                <div className="flex items-center h-[1.2em]">
                                    <span
                                        className={`text-[0.85rem] leading-none ${item.highlight ? "font-semibold text-primary" : ""}`}
                                    >
                                        {item.time}
                                    </span>
                                </div>

                                {/* ドット + 縦線 */}
                                <div className="relative flex flex-col items-center">
                                    <div className="flex items-center h-[1.2em]">
                                        <span
                                            className={`shrink-0 rounded-full z-10 ${item.highlight ? "w-3.5 h-3.5 bg-primary border-2 border-background shadow-[0_0_0_2px_var(--primary),0_0_8px_var(--primary)]" : "w-2.5 h-2.5 bg-primary border-2 border-background shadow-[0_0_0_1px_var(--primary)]"}`}
                                        />
                                    </div>
                                    {i < arr.length - 1 && (
                                        <span className="absolute top-3 -bottom-3 left-1/2 -translate-x-1/2 w-px bg-border" />
                                    )}
                                </div>

                                {/* コンテンツ */}
                                <div>
                                    <h3
                                        className={`text-[0.85rem] mb-2 ${item.highlight ? "font-semibold" : ""}`}
                                    >
                                        {item.title}
                                        <span className="block w-75/100 h-px bg-border" />
                                    </h3>
                                    <p
                                        className={`text-[0.5rem] leading-[1.8] whitespace-pre-line text-text-soft`}
                                    >
                                        {item.text}
                                    </p>
                                </div>

                                {/* アクセントバー */}
                                {item.accent && (
                                    <span className="absolute -top-5 right-0 w-2 h-40 bg-primary" />
                                )}
                            </li>
                        </FadeIn>
                    ))}
                </ol>
            </section>

            {/* ═══ 5. INFORMATION ═══ */}
            <section className="relative">
                <div className="relative">
                    {/* 左端アクセントバー */}
                    <span className="absolute top-0 left-0 w-2 h-full bg-primary" />
                    <FadeIn>
                        <div className="flex items-center gap-3 px-5 mb-8">
                            <span className="text-2xl">INFORMATION</span>
                        </div>
                    </FadeIn>
                    <div className="px-7 flex flex-col gap-4 leading-[1.9] text-text-soft text-[0.6rem]">
                        <FadeIn delay={250}>
                            <p>
                                ゲスト更衣室をご用意しております
                                <br />
                                10時から11時のあいだと14時以降の時間帯にご利用いただけます
                            </p>
                        </FadeIn>
                        <FadeIn delay={550}>
                            <p>
                                会場内には喫煙室もございますが
                                <br />
                                諸に勝手ながら全室禁煙とさせていただきます
                                <br />
                                ゲストの皆さまにはご不便おかけしますがご協力お願い申し上げます
                            </p>
                        </FadeIn>
                        <FadeIn delay={850}>
                            <p>
                                お車でお越しの際は近隣のパーキングをご利用ください
                                <br />
                                会場専用の駐車スペースはございません
                            </p>
                        </FadeIn>
                        <div className="h-7">{/* padding */}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5">
                    <span className="w-2/5" />
                    <span className="flex-1 h-0.5 bg-border" />
                </div>
            </section>

            {/* ═══ 6. ACCESS ═══ */}
            <section className="py-5 mt-12 bg-surface-alt">
                <FadeIn>
                    <SectionTitle>ACCESS</SectionTitle>
                </FadeIn>

                {/* 情報 */}
                <FadeIn delay={350}>
                    <div className="flex flex-col gap-3 items-center">
                        <h3 className="text-base mb-1">ブラスブルー東京</h3>
                        <div className="flex flex-col gap-2 text-center text-text-soft">
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
                                className="inline-flex items-end-safe  justify-center gap-1 border-b"
                            >
                                BRASS BLEU TOKYO
                                <ExternalLink className="w-3" />
                            </a>
                        </div>
                        <p className="mt-3 text-foreground leading-relaxed">
                            式場専用のエレベーターがございます
                            <br />
                            トラッド目白正面左手よりお入りください
                        </p>
                    </div>
                </FadeIn>

                {/* 地図 */}

                <FadeIn variant="scale" delay={350}>
                    <div className="grid grid-cols-2 gap-4 px-5 py-7">
                        <iframe
                            title="ブラスブルー東京"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3239.182933145228!2d139.707304!3d35.7217193!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188d3cac293617%3A0x93024249428b39a5!2z44OW44Op44K544OW44Or44O85p2x5Lqs!5e0!3m2!1sja!2sjp!4v1778030033050!5m2!1sja!2sjp"
                            className="w-full h-full border-0 aspect-square"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                        {MAP_IMAGE ? (
                            <img
                                src={MAP_IMAGE.src}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-accent" />
                        )}
                    </div>
                </FadeIn>
            </section>

            {/* ═══ 7. FOOTER CTA ═══ */}
            <footer className="py-12 px-5 text-center bg-background">
                <FadeIn variant="bounce">
                    <Button
                        size="lg"
                        className="px-16 text-xs tracking-wider mb-6"
                        onClick={() => onNavigate?.("rsvp")}
                    >
                        出欠のご返信はこちら
                    </Button>
                </FadeIn>
                <FadeIn delay={400}>
                    <p className="text-xs text-text-soft">
                        8月23日(日) 迄にご回答いただければ幸に存じます
                    </p>
                </FadeIn>

                <div className="flex items-center justify-center gap-8 mt-8">
                    <a
                        href="https://github.com/alin2fa7aec/wisaw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 text-text-soft hover:text-foreground transition-colors"
                    >
                        <Github className="size-5" />
                        <span className="text-[0.5rem]">WISAW</span>
                    </a>
                    <a
                        href="https://www.instagram.com/alin2fa7aec/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 text-text-soft hover:text-foreground transition-colors"
                    >
                        <Instagram className="size-5" />
                        <span className="text-[0.5rem]">AKIRA</span>
                    </a>
                    <a
                        href="https://www.instagram.com/saki_gt.oc/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 text-text-soft hover:text-foreground transition-colors"
                    >
                        <Instagram className="size-5" />
                        <span className="text-[0.5rem]">SAKI</span>
                    </a>
                </div>
            </footer>
        </div>
    );
};
