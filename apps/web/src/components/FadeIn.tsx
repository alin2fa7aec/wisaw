import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFadeSequence } from "@/components/fade-sequence-context";

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
    //
    // 登録は render 中ではなく mount 後に行う。render 中に ref を読み書きすると
    // React Compiler が前提を崩しうるため(react-hooks/refs)。
    // 兄弟の effect は mount 順 = DOM 順に走るので、確定する index の並びは変わらない。
    //
    // sequence は provider が毎レンダー value を作り直すため識別子が変わる。
    // 依存に入れると effect が何度も走るので、ref で二重登録を止める。
    const sequence = useFadeSequence();
    const indexRef = useRef(-1);
    const [index, setIndex] = useState(-1);

    useEffect(() => {
        if (!sequence || indexRef.current >= 0) return;
        indexRef.current = sequence.register();
        setIndex(indexRef.current);
    }, [sequence]);

    // index が確定するまでは保留する(1レンダーだけ)。
    const released = sequence ? index >= 0 && sequence.isReleased(index) : true;

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

        // 画像が無い、もしくは既に読み込み済みなら、次のフレームで解放する。
        // effect の中で同期的に setState するとカスケードレンダーになるため
        // (react-hooks/set-state-in-effect)、load を待つ経路と同じく
        // コールバック越しの通知に揃える。遅れは1フレームで、フェードインの
        // 見た目には出ない。
        if (!img || img.complete) {
            const id = requestAnimationFrame(() => setImgReady(true));
            return () => cancelAnimationFrame(id);
        }

        const onLoad = () => setImgReady(true);
        img.addEventListener("load", onLoad);
        return () => img.removeEventListener("load", onLoad);
    }, [waitForImage, inView]);

    const visible = inView && imgReady && gate && released;

    // 自分が登場したらチェーンの次の要素を解放する。
    useEffect(() => {
        if (visible && index >= 0) sequence?.reportShown(index);
    }, [visible, sequence, index]);

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
