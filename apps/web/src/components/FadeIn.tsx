import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFadeSequence } from "@/components/FadeSequence";

const FADE_VARIANTS = {
    "slide-up": "animate-fade-in",
    scale: "animate-fade-scale",
    "scale-slow": "animate-fade-scale-slow",
    bounce: "animate-fade-bounce",
} as const;

type FadeVariant = keyof typeof FADE_VARIANTS;

export const FadeIn = ({
    children,
    variant = "slide-up",
    delay = 0,
    className = "",
    waitForImage = false,
    gate = true,
}: {
    children: ReactNode;
    variant?: FadeVariant;
    delay?: number;
    className?: string;
    waitForImage?: boolean;
    // 外部条件が満たされるまでフェードインを保留する (表示順の制御に使う)
    gate?: boolean;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    const [imgReady, setImgReady] = useState(!waitForImage);

    // <FadeSequence> の内側なら、登場順の index を確定して依存チェーンに参加する。
    const sequence = useFadeSequence();
    const indexRef = useRef(-1);
    if (sequence && indexRef.current < 0) indexRef.current = sequence.register();
    const released = sequence ? sequence.isReleased(indexRef.current) : true;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setInView(true);
                    obs.disconnect();
                }
            },
            { rootMargin: "50px" },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!waitForImage || !inView) return;
        const el = ref.current;
        if (!el) return;
        const img = el.querySelector("img");
        if (!img) { setImgReady(true); return; }
        if (img.complete) { setImgReady(true); return; }
        const onLoad = () => setImgReady(true);
        img.addEventListener("load", onLoad);
        return () => img.removeEventListener("load", onLoad);
    }, [waitForImage, inView]);

    const visible = inView && imgReady && gate && released;

    // 自分が登場したらチェーンの次の要素を解放する。
    useEffect(() => {
        if (visible) sequence?.reportShown(indexRef.current);
    }, [visible, sequence]);

    return (
        <div
            ref={ref}
            className={`${visible ? FADE_VARIANTS[variant] : "opacity-0"} ${className}`}
            style={delay ? ({ "--fade-delay": `${delay}ms` } as React.CSSProperties) : undefined}
        >
            {children}
        </div>
    );
};
