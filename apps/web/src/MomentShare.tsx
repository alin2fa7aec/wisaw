import { useState, useCallback, useEffect, useRef } from "react";
import { Camera, Upload } from "@mynaui/icons-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Spinner } from "@/components/ui/spinner";
import { Lightbox } from "@/components/Lightbox";
import {
    MOMENT_MAX_FILE_BYTES,
    MOMENT_MAX_PER_DEVICE,
    type MomentEntry,
    type MomentManifest,
} from "@wisaw/shared";

const MANIFEST_URL = "/moments/manifest.json";
const POLL_INTERVAL_MS = 5000;
const DEVICE_ID_KEY = "wisaw.moment.deviceId";

/** 端末識別子。防御ではなく「自分が上げた写真」を見分けるためのもの。 */
function getDeviceId(): string {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}

type UploadState = {
    total: number;
    done: number;
    errors: string[];
};

const ERROR_MESSAGES: Record<string, string> = {
    closed: "写真の受付期間は終了しました。ありがとうございました。",
    rate_limited: "混み合っています。少し時間をおいてからお試しください。",
    device_limit: `1台からアップロードできるのは${MOMENT_MAX_PER_DEVICE}枚までです。`,
    storage_full: "保存容量の上限に達しました。申し訳ありません。",
    not_configured: "ただいま準備中です。",
};

export const MomentShare = () => {
    const [entries, setEntries] = useState<MomentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [upload, setUpload] = useState<UploadState | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // manifest.json を polling する。読み取り API を持たないことで
    // API を write only に保ちつつ、閲覧では Lambda を起動させない。
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            // 裏に回っているタブでまで叩き続けない
            if (document.hidden) return;
            try {
                const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
                if (!res.ok) return;
                const manifest: MomentManifest = await res.json();
                if (!cancelled) setEntries(manifest.entries ?? []);
            } catch {
                // 未デプロイ・オフラインなどは黙って無視し、次の周期に任せる
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        const timer = setInterval(load, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const uploadOne = useCallback(async (file: File): Promise<string | null> => {
        if (file.size > MOMENT_MAX_FILE_BYTES) {
            return `${file.name}: ファイルが大きすぎます`;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL || "";
        const res = await fetch(`${apiBase}/moment/presign`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                deviceId: getDeviceId(),
                contentType: file.type,
                size: file.size,
            }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return ERROR_MESSAGES[body?.error] ?? "アップロードできませんでした";
        }

        const { url, fields } = await res.json();

        // S3 へ直接 POST する。Lambda を経由しないので大きな写真でも詰まらない。
        const form = new FormData();
        for (const [k, v] of Object.entries(fields as Record<string, string>)) {
            form.append(k, v);
        }
        form.append("file", file);

        const put = await fetch(url, { method: "POST", body: form });
        if (!put.ok) return `${file.name}: 送信に失敗しました`;
        return null;
    }, []);

    const handleFiles = useCallback(
        async (files: FileList) => {
            const list = Array.from(files);
            setUpload({ total: list.length, done: 0, errors: [] });

            const errors: string[] = [];
            for (const file of list) {
                const err = await uploadOne(file);
                if (err) errors.push(err);
                setUpload((prev) =>
                    prev ? { ...prev, done: prev.done + 1, errors: [...errors] } : prev,
                );
            }

            // エラーが無ければ少し見せてから消す
            if (errors.length === 0) {
                setTimeout(() => setUpload(null), 2000);
            }
        },
        [uploadOne],
    );

    const closeLightbox = useCallback(() => setLightboxIndex(null), []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <FadeIn>
                <h1 className="text-2xl text-center mb-3">Moment Share</h1>
                <p className="text-center text-sm text-muted-foreground mb-8">
                    お撮りいただいたお写真をぜひご共有ください
                </p>
            </FadeIn>

            <FadeIn variant="bounce" delay={200}>
                <div className="flex justify-center mb-10">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />
                    <Button
                        onClick={() => inputRef.current?.click()}
                        disabled={upload !== null && upload.done < upload.total}
                    >
                        <Camera className="size-5 mr-2" />
                        写真を追加する
                    </Button>
                </div>
            </FadeIn>

            {upload && (
                <div className="mb-8 text-center text-sm">
                    {upload.done < upload.total ? (
                        <p className="text-muted-foreground">
                            <Upload className="inline size-4 mr-1" />
                            送信中… {upload.done} / {upload.total}
                        </p>
                    ) : upload.errors.length === 0 ? (
                        <p className="text-muted-foreground">
                            ありがとうございます。まもなく表示されます。
                        </p>
                    ) : null}

                    {upload.errors.map((e, i) => (
                        <p key={i} className="text-destructive mt-1">
                            {e}
                        </p>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Spinner />
                </div>
            ) : entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                    まだ写真がありません
                </p>
            ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-3">
                    {entries.map((entry, index) => (
                        <FadeIn
                            key={entry.id}
                            variant="scale"
                            delay={Math.min(index * 60, 1200)}
                            waitForImage
                            className="mb-3 break-inside-avoid"
                        >
                            <img
                                src={`/${entry.thumb}`}
                                alt=""
                                loading="lazy"
                                style={{ aspectRatio: `${entry.w}/${entry.h}` }}
                                className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxIndex(index)}
                            />
                        </FadeIn>
                    ))}
                </div>
            )}

            {lightboxIndex !== null && (
                <Lightbox
                    images={entries.map((e) => ({ key: e.id, src: `/${e.view}` }))}
                    index={lightboxIndex}
                    onClose={closeLightbox}
                    onChange={setLightboxIndex}
                />
            )}
        </div>
    );
};
