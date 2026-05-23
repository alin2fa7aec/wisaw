import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@mynaui/icons-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Spinner } from "@/components/ui/spinner";

const IMG_BASE = "/images/gallery";

type GalleryImage = { file: string; w: number; h: number };

const Lightbox = ({
    image,
    onClose,
    onPrev,
    onNext,
}: {
    image: GalleryImage;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) => {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onPrev();
            if (e.key === "ArrowRight") onNext();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose, onPrev, onNext]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={onClose}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={onClose}
            >
                <X className="size-6" />
            </Button>

            <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 py-6 hover:bg-white/10 rounded-lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onPrev();
                }}
            >
                &#8249;
            </button>

            <img
                src={`${IMG_BASE}/${image.file}`}
                alt={image.file}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />

            <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 py-6 hover:bg-white/10 rounded-lg"
                onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                }}
            >
                &#8250;
            </button>
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
    const showPrev = useCallback(
        () =>
            setLightboxIndex((i) =>
                i !== null ? (i - 1 + images.length) % images.length : null,
            ),
        [images.length],
    );
    const showNext = useCallback(
        () =>
            setLightboxIndex((i) =>
                i !== null ? (i + 1) % images.length : null,
            ),
        [images.length],
    );

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
                            src={`${IMG_BASE}/${img.file}`}
                            alt={img.file}
                            style={{ aspectRatio: `${img.w}/${img.h}` }}
                            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxIndex(index)}
                        />
                    </FadeIn>
                ))}
            </div>

            {lightboxIndex !== null && (
                <Lightbox
                    image={images[lightboxIndex]!}
                    onClose={closeLightbox}
                    onPrev={showPrev}
                    onNext={showNext}
                />
            )}
        </div>
    );
};
