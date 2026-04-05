import { useEffect, useRef, useState, type ReactNode } from "react";

const imageModules = import.meta.glob<{ default: string }>(
    "../assets/images/*.{jpg,jpeg,png,webp,avif}",
    { eager: true },
);

const IMAGES = Object.entries(imageModules).map(([path, mod]) => ({
    src: mod.default,
    alt: path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "",
}));

const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className="aspect-4/3 overflow-hidden rounded-lg bg-muted"
        >
            {visible && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className="h-full w-full object-cover animate-fade-in"
                />
            )}
        </div>
    );
};

const FadeInBlock = ({ children }: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "50px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
            {children}
        </div>
    );
};

/** 画像配列を指定サイズごとに分割する */
const chunk = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
};

const TEXT_SECTIONS = [
    {
        title: "ごあいさつ",
        body: "このたび 私たちは結婚式を挙げることとなりました\nおいそがしいなか恐縮ではございますが\nぜひご出席いただけますと幸いです",
    },
    {
        body: "皆さまに見守られながら\nふたりの新しい門出を迎えられることを\n心より楽しみにしております",
    },
    {
        body: "ささやかではございますが\n感謝の気持ちを込めて 小宴を催したく存じます\nどうぞお気軽にお越しくださいませ",
    },
    {
        body: "当日 皆さまにお会いできることを\nふたりで心待ちにしております",
    },
];

export const Greeting = () => {
    const imageGroups = chunk(IMAGES, 3);

    return (
        <div className="flex flex-col gap-10">
            {imageGroups.map((group, gi) => (
                <div key={gi} className="flex flex-col gap-8">
                    {/* テキストセクション */}
                    {gi < TEXT_SECTIONS.length && (
                        <FadeInBlock>
                            <div className="text-center space-y-2 py-2">
                                {TEXT_SECTIONS[gi].title && (
                                    <h2 className="text-2xl font-bold">
                                        {TEXT_SECTIONS[gi].title}
                                    </h2>
                                )}
                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                    {TEXT_SECTIONS[gi].body}
                                </p>
                            </div>
                        </FadeInBlock>
                    )}

                    {/* 画像グリッド */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {group.map((img) => (
                            <LazyImage
                                key={img.src}
                                src={img.src}
                                alt={img.alt}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* 末尾テキスト（画像グループより多いぶん） */}
            {TEXT_SECTIONS.length > imageGroups.length &&
                TEXT_SECTIONS.slice(imageGroups.length).map((sec, i) => (
                    <FadeInBlock key={i}>
                        <div className="text-center space-y-2 py-2">
                            {sec.title && (
                                <h2 className="text-2xl font-bold">
                                    {sec.title}
                                </h2>
                            )}
                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                {sec.body}
                            </p>
                        </div>
                    </FadeInBlock>
                ))}
        </div>
    );
};
