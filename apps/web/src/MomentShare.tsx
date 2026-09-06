import { useState, useCallback, useEffect, useRef } from "react";
import { Camera, Upload, Trash } from "@mynaui/icons-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Spinner } from "@/components/ui/spinner";
import { Lightbox } from "@/components/Lightbox";
import {
    MOMENT_MAX_FILE_BYTES,
    MOMENT_MAX_PER_DEVICE,
    isWithinMomentWindow,
    type MomentEntry,
    type MomentManifest,
} from "@wisaw/shared";

const MANIFEST_URL = "/moments/manifest.json";
const POLL_INTERVAL_MS = 5000;
const DEVICE_ID_KEY = "wisaw.moment.deviceId";
const MY_PHOTOS_KEY = "wisaw.moment.myPhotos";

/** 端末識別子。防御ではなく「自分が上げた写真」を見分けるためのもの。 */
function getDeviceId(): string {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}

/**
 * この端末から上げた写真の id。削除ボタンを出す対象を決めるために持つ。
 *
 * manifest.json は id と寸法しか持たず、誰が上げたかを載せていない。
 * 載せてしまうと他人の写真を消す材料を配ることになるため、
 * 「自分のもの」の判断はサーバに問い合わせず手元の記録だけで行う。
 */
function readMyPhotoIds(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem(MY_PHOTOS_KEY) ?? "[]");
        return Array.isArray(raw) ? raw.filter((v) => typeof v === "string") : [];
    } catch {
        // 壊れていたら諦めて空から作り直す。消せなくなるだけで実害は無い。
        return [];
    }
}

function writeMyPhotoIds(ids: string[]): void {
    localStorage.setItem(MY_PHOTOS_KEY, JSON.stringify(ids));
}

type UploadState = {
    total: number;
    done: number;
    errors: string[];
};

/** 受付期間に対する現在地。manifest に期間が無ければ判断しない。 */
type WindowState = "unknown" | "before" | "open" | "after";

function windowStateOf(manifest: MomentManifest | null): WindowState {
    if (!manifest?.openAt || !manifest.closeAt) return "unknown";
    const now = Date.now();
    if (isWithinMomentWindow(now, manifest.openAt, manifest.closeAt)) return "open";
    return now < manifest.openAt ? "before" : "after";
}

const DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
});

const ERROR_MESSAGES: Record<string, string> = {
    closed: "写真の受付期間は終了しました。ありがとうございました。",
    rate_limited: "混み合っています。少し時間をおいてからお試しください。",
    device_limit: `1台からアップロードできるのは${MOMENT_MAX_PER_DEVICE}枚までです。`,
    storage_full: "保存容量の上限に達しました。申し訳ありません。",
    not_configured: "ただいま準備中です。",
    not_found: "この写真は見つかりませんでした。すでに消えているかもしれません。",
};

export const MomentShare = () => {
    const [entries, setEntries] = useState<MomentEntry[]>([]);
    const [manifest, setManifest] = useState<MomentManifest | null>(null);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [upload, setUpload] = useState<UploadState | null>(null);
    const [myIds, setMyIds] = useState<Set<string>>(() => new Set(readMyPhotoIds()));
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
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
                const loaded: MomentManifest = await res.json();
                if (cancelled) return;
                setManifest(loaded);
                setEntries(loaded.entries ?? []);
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

        const { url, fields, key } = await res.json();

        // S3 へ直接 POST する。Lambda を経由しないので大きな写真でも詰まらない。
        const form = new FormData();
        for (const [k, v] of Object.entries(fields as Record<string, string>)) {
            form.append(k, v);
        }
        form.append("file", file);

        const put = await fetch(url, { method: "POST", body: form });
        if (!put.ok) return `${file.name}: 送信に失敗しました`;

        // key は upload/<id>。この id が manifest に載るのを待たずに控えておく。
        const id = String(key).slice("upload/".length);
        writeMyPhotoIds([...readMyPhotoIds(), id]);
        setMyIds((prev) => new Set(prev).add(id));
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

    /**
     * 自分が上げた写真を消す。
     *
     * サーバ側はソフト削除なので実体は残っており、後から戻せる。
     * 一覧からは即座に消したいので、polling を待たず手元の entries からも外す。
     */
    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("この写真を削除します。よろしいですか？")) return;

        setDeleteError(null);
        setDeletingId(id);
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || "";
            const res = await fetch(`${apiBase}/moment/delete`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ deviceId: getDeviceId(), id }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setDeleteError(
                    ERROR_MESSAGES[body?.error] ?? "削除できませんでした",
                );
                return;
            }

            setEntries((prev) => prev.filter((e) => e.id !== id));
            setLightboxIndex(null);
            writeMyPhotoIds(readMyPhotoIds().filter((v) => v !== id));
            setMyIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch {
            setDeleteError("削除できませんでした");
        } finally {
            setDeletingId(null);
        }
    }, []);

    const closeLightbox = useCallback(() => setLightboxIndex(null), []);

    // 受付期間外なら、そもそもアップロードの導線を出さない。
    // manifest に期間が載っていない場合("unknown")は出す。判断できないことを
    // 理由に塞ぐと、載せる前の manifest が残っているだけで投稿できなくなる。
    // 実際の可否は presign 側のガードが決める。
    const windowState = windowStateOf(manifest);
    const canUpload = windowState === "open" || windowState === "unknown";

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <FadeIn>
                <h1 className="text-2xl text-center mb-3">Moment Share</h1>
                <p className="text-center text-sm text-muted-foreground mb-8">
                    {windowState === "after"
                        ? "お写真の受付は終了しました。ありがとうございました"
                        : "お撮りいただいたお写真をぜひご共有ください"}
                </p>
            </FadeIn>

            <FadeIn variant="bounce" delay={200}>
                <div className="flex justify-center mb-10">
                    {canUpload ? (
                        <>
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
                        </>
                    ) : windowState === "before" ? (
                        <p className="text-sm text-muted-foreground">
                            お写真の受付は
                            {DATE_FORMAT.format(new Date(manifest!.openAt!))}
                            からです
                        </p>
                    ) : null}
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

            {deleteError && (
                <p className="mb-6 text-center text-sm text-destructive">
                    {deleteError}
                </p>
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
                            <div className="relative">
                                <img
                                    src={`/${entry.thumb}`}
                                    alt=""
                                    loading="lazy"
                                    style={{ aspectRatio: `${entry.w}/${entry.h}` }}
                                    className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxIndex(index)}
                                />
                                {myIds.has(entry.id) && (
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        aria-label="この写真を削除する"
                                        className="absolute top-2 right-2 rounded-full opacity-80"
                                        disabled={deletingId !== null}
                                        onClick={() => handleDelete(entry.id)}
                                    >
                                        {deletingId === entry.id ? (
                                            <Spinner className="size-4" />
                                        ) : (
                                            <Trash className="size-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
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
