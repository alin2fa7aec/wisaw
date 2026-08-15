import { useState, useCallback, useEffect } from "react";
import { FadeIn } from "@/components/FadeIn";
import { Spinner } from "@/components/ui/spinner";
import { Lightbox } from "@/components/Lightbox";

const IMG_BASE = "/images/gallery";

type GalleryImage = { file: string; w: number; h: number };

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
                    images={images.map((img) => ({
                        key: img.file,
                        src: `${IMG_BASE}/${img.file}`,
                    }))}
                    index={lightboxIndex}
                    onClose={closeLightbox}
                    onChange={setLightboxIndex}
                />
            )}
        </div>
    );
};
