import { useEffect, useRef, useState, type ReactNode } from "react";

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
}: {
    children: ReactNode;
    variant?: FadeVariant;
    delay?: number;
    className?: string;
    waitForImage?: boolean;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    const [imgReady, setImgReady] = useState(!waitForImage);

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

    const visible = inView && imgReady;

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
