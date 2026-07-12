import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@mynaui/icons-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Spinner } from "@/components/ui/spinner";

const IMG_BASE = "/images/gallery";

type GalleryImage = { file: string; w: number; h: number };

const SWIPE_THRESHOLD = 50;

const Lightbox = ({
    images,
    index,
    onClose,
    onChange,
}: {
    images: GalleryImage[];
    index: number;
    onClose: () => void;
    onChange: (i: number) => void;
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const touchRef = useRef<{
        startX: number;
        startY: number;
        axis: "x" | "y" | null;
        dx: number;
        dy: number;
    } | null>(null);

    const wrap = (i: number) => ((i % images.length) + images.length) % images.length;

    useEffect(() => {
        for (let d = -2; d <= 2; d++) {
            const img = new Image();
            img.src = `${IMG_BASE}/${images[wrap(index + d)]!.file}`;
        }
    }, [index, images]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onChange(wrap(index - 1));
            if (e.key === "ArrowRight") onChange(wrap(index + 1));
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose, onChange, index, images.length]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const applyTranslate = (dx: number, animate: boolean) => {
        const track = trackRef.current;
        if (!track) return;
        track.style.transition = animate ? "transform 250ms ease-out" : "none";
        track.style.transform = `translateX(${dx}px)`;
    };

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;

        const onStart = (e: TouchEvent) => {
            el.style.transition = "none";
            touchRef.current = {
                startX: e.touches[0]!.clientX,
                startY: e.touches[0]!.clientY,
                axis: null,
                dx: 0,
                dy: 0,
            };
        };

        const onMove = (e: TouchEvent) => {
            const t = touchRef.current;
            if (!t) return;
            const dx = e.touches[0]!.clientX - t.startX;
            const dy = e.touches[0]!.clientY - t.startY;
            if (t.axis === null) {
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
                t.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
            }
            if (t.axis === "x") {
                e.preventDefault();
                t.dx = dx;
                el.style.transform = `translateX(${dx}px)`;
            } else {
                e.preventDefault();
                t.dy = dy;
                el.style.transform = `translateY(${dy}px)`;
                const opacity = Math.max(0, 1 - Math.abs(dy) / 300);
                if (backdropRef.current) backdropRef.current.style.opacity = `${opacity}`;
            }
        };

        const onEnd = () => {
            const t = touchRef.current;
            touchRef.current = null;
            if (!t || !t.axis) {
                applyTranslate(0, false);
                return;
            }
            if (t.axis === "y") {
                if (Math.abs(t.dy) > 100) {
                    onClose();
                } else {
                    el.style.transition = "transform 250ms ease-out";
                    el.style.transform = "translateY(0)";
                    if (backdropRef.current) {
                        backdropRef.current.style.transition = "opacity 250ms ease-out";
                        backdropRef.current.style.opacity = "1";
                    }
                }
                return;
            }
            if (Math.abs(t.dx) > SWIPE_THRESHOLD) {
                const dir = t.dx > 0 ? 1 : -1;
                applyTranslate(dir * window.innerWidth, true);
                const onDone = () => {
                    el.removeEventListener("transitionend", onDone);
                    onChange(wrap(index - dir));
                };
                el.addEventListener("transitionend", onDone);
            } else {
                applyTranslate(0, true);
            }
        };

        el.addEventListener("touchstart", onStart, { passive: true });
        el.addEventListener("touchmove", onMove, { passive: false });
        el.addEventListener("touchend", onEnd);
        return () => {
            el.removeEventListener("touchstart", onStart);
            el.removeEventListener("touchmove", onMove);
            el.removeEventListener("touchend", onEnd);
        };
    }, [index, images.length, onChange]);

    useEffect(() => {
        applyTranslate(0, false);
    }, [index]);

    const slides = [-2, -1, 0, 1, 2].map((offset) => ({
        img: images[wrap(index + offset)]!,
        offset,
    }));

    return createPortal(
        <div
            ref={backdropRef}
            className="fixed inset-0 z-50 bg-black/80"
            onClick={onClose}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 z-10 text-white hover:bg-white/20"
                onClick={onClose}
            >
                <X className="size-6" />
            </Button>

            <button
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white text-3xl px-3 py-6 hover:bg-white/10 rounded-lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(wrap(index - 1));
                }}
            >
                &#8249;
            </button>
            <button
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white text-3xl px-3 py-6 hover:bg-white/10 rounded-lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(wrap(index + 1));
                }}
            >
                &#8250;
            </button>

            <div className="absolute inset-0 overflow-hidden">
                <div
                    ref={trackRef}
                    className="h-full will-change-transform"
                >
                    {slides.map(({ img, offset }) => (
                        <div
                            key={`${index}-${offset}`}
                            className="absolute top-0 flex items-center justify-center"
                            style={{
                                left: `${offset * 100}vw`,
                                width: "100vw",
                                height: "100%",
                            }}
                        >
                            <img
                                src={`${IMG_BASE}/${img.file}`}
                                alt={img.file}
                                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                                draggable={false}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};

export const Gallery = () => {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        fetch(`${IMG_BASE}/manifest.json`)
            .then((res) => res.json())
            .then((entries: GalleryImage[]) => setImages(entries))
            .finally(() => setLoading(false));
    }, []);

    const closeLightbox = useCallback(() => setLightboxIndex(null), []);

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Spinner />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
                <p>まだ写真がありません</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <FadeIn>
                <h1 className="text-2xl text-center mb-10">Gallery</h1>
            </FadeIn>

            <div className="columns-2 sm:columns-3 md:columns-4 gap-3">
                {images.map((img, index) => (
                    <FadeIn
                        key={img.file}
                        variant="scale"
                        delay={Math.min(index * 60, 1200)}
                        waitForImage
                        className="mb-3 break-inside-avoid"
                    >
                        <img
                            src={`${IMG_BASE}/thumbs/${img.file}`}
                            alt={img.file}
                            loading="lazy"
                            style={{ aspectRatio: `${img.w}/${img.h}` }}
                            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxIndex(index)}
                        />
                    </FadeIn>
                ))}
            </div>

            {lightboxIndex !== null && (
                <Lightbox
                    images={images}
                    index={lightboxIndex}
                    onClose={closeLightbox}
                    onChange={setLightboxIndex}
                />
            )}
        </div>
    );
};
