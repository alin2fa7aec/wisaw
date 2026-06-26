import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const IMG = "/images/dinasaur";

type CharacterKey = "akira" | "saki";
type Obstacle = { x: number; w: number; h: number };

const WORLD_W = 360;
const GROUND_Y = 280;

const PLAYER_W = 24;
const PLAYER_H = 32;

const SPRITE_H = 42;

const GRAVITY = 2700;
const JUMP_V = 700;

const INPUT_COOLDOWN_MS = 250;
const RUN_FRAME_INTERVAL = 1 / 8;

const GOAL_SCORE = 700;
const WINNING_RUN_DURATION = 2.0;

const STATIONS = [
    { name: "浜松", score: 0 },
    { name: "掛川", score: 79 },
    { name: "静岡", score: 201 },
    { name: "小田原", score: 452 },
    { name: "新横浜", score: 610 },
    { name: "東京", score: GOAL_SCORE },
];

const CHARACTER_DEFS: Record<
    CharacterKey,
    { label: string; urls: string[]; aspect: number }
> = {
    akira: {
        label: "Akira",
        urls: [
            `${IMG}/akira-01.png`,
            `${IMG}/akira-02.png`,
            `${IMG}/akira-03.png`,
        ],
        aspect: 238 / 367,
    },
    saki: {
        label: "Saki",
        urls: [
            `${IMG}/saki-01.png`,
            `${IMG}/saki-02.png`,
            `${IMG}/saki-03.png`,
        ],
        aspect: 279 / 318,
    },
};

export const DinosaurGame = () => {
    const [characterKey, setCharacterKey] = useState<CharacterKey | null>(null);

    if (!characterKey) {
        return <CharacterSelect onSelect={setCharacterKey} />;
    }

    return (
        <GameCanvas
            characterKey={characterKey}
            onBack={() => setCharacterKey(null)}
        />
    );
};

function CharacterSelect({
    onSelect,
}: {
    onSelect: (key: CharacterKey) => void;
}) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-10 px-6">
            <p className="text-muted-foreground text-base tracking-wide">
                キャラクターを選んでください
            </p>
            <div className="flex gap-4 py-10">
                {(
                    Object.entries(CHARACTER_DEFS) as [
                        CharacterKey,
                        (typeof CHARACTER_DEFS)[CharacterKey],
                    ][]
                ).map(([key, def]) => (
                    <Button
                        key={key}
                        size="lg"
                        variant="ghost"
                        className="px-4 text-xs tracking-wider mb-6 hover:bg-transparent"
                        onClick={() => onSelect(key)}
                    >
                        <div>
                            <img
                                src={def.urls[0]}
                                alt={def.label}
                                className="h-28 w-auto"
                                style={{ imageRendering: "pixelated" }}
                            />
                            <span className="text-foreground/70 text-sm font-medium">
                                {def.label}
                            </span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

function GameCanvas({
    characterKey,
    onBack,
}: {
    characterKey: CharacterKey;
    onBack: () => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isLandscape, setIsLandscape] = useState(false);
    const [waitingToStart, setWaitingToStart] = useState(true);

    const charDef = CHARACTER_DEFS[characterKey];
    const spriteW = Math.round(SPRITE_H * charDef.aspect);

    const game = useRef({
        dpr: 1,
        scale: 1,
        viewCenterX: WORLD_W / 2,
        viewRight: WORLD_W,

        running: false,
        gameOver: false,
        cleared: false,
        winningRun: false,
        winRunTimer: 0,
        waitingToStart: true,

        inputLockUntil: 0,

        lastT: 0,
        tAlive: 0,

        speed: 260,
        spawnTimer: 0,

        animTimer: 0,
        animFrame: 0,
        spriteFrames: [] as HTMLImageElement[],

        player: {
            x: 60,
            y: GROUND_Y - PLAYER_H,
            vy: 0,
            onGround: true,
        },

        obstacles: [] as Obstacle[],
    });

    const mql = useMemo(() => {
        if (typeof window === "undefined") return null;
        return window.matchMedia?.("(orientation: landscape)") ?? null;
    }, []);

    useEffect(() => {
        if (!mql) return;
        const onChange = () => setIsLandscape(mql.matches);
        onChange();
        mql.addEventListener?.("change", onChange);
        return () => mql.removeEventListener?.("change", onChange);
    }, [mql]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const g = game.current;

        // Preload sprite images
        g.spriteFrames = charDef.urls.map((url) => {
            const img = new Image();
            img.src = url;
            return img;
        });

        const resize = () => {
            const cssW = window.innerWidth;
            const cssH = window.innerHeight;

            g.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
            canvas.width = Math.floor(cssW * g.dpr);
            canvas.height = Math.floor(cssH * g.dpr);

            g.scale = (cssW * g.dpr) / WORLD_W;

            g.viewCenterX = WORLD_W / 2;
            g.viewRight = WORLD_W;

            ctx.setTransform(g.scale, 0, 0, g.scale, 0, 0);
            ctx.imageSmoothingEnabled = false;
        };

        const reset = () => {
            g.tAlive = 0;
            g.speed = 260;
            g.spawnTimer = 0;
            g.obstacles = [];
            g.animTimer = 0;
            g.animFrame = 0;

            g.player.y = GROUND_Y - PLAYER_H;
            g.player.vy = 0;
            g.player.onGround = true;

            g.gameOver = false;
            g.cleared = false;
            g.winningRun = false;
            g.winRunTimer = 0;
            g.running = false;
            g.waitingToStart = true;

            g.inputLockUntil = 0;

            setWaitingToStart(true);
        };

        const aabb = (
            ax: number,
            ay: number,
            aw: number,
            ah: number,
            bx: number,
            by: number,
            bw: number,
            bh: number,
        ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

        const jumpOrHandleGameOver = () => {
            const now = performance.now();
            if (now < g.inputLockUntil) return;
            if (isLandscape) return;
            if (g.winningRun) return;

            if (g.waitingToStart) {
                g.waitingToStart = false;
                g.running = true;
                g.lastT = 0;
                setWaitingToStart(false);
                return;
            }

            if (!g.running && (g.gameOver || g.cleared)) {
                reset();
                return;
            }

            if (!g.running) return;

            if (g.player.onGround) {
                g.player.vy = -JUMP_V;
                g.player.onGround = false;
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" || e.code === "ArrowUp") {
                e.preventDefault();
                jumpOrHandleGameOver();
            }
        };

        const onTouchMove = (e: TouchEvent) => e.preventDefault();

        window.addEventListener("resize", resize, { passive: true });
        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("touchmove", onTouchMove, { passive: false });

        resize();
        reset();

        let raf = 0;

        const update = (dt: number) => {
            if (!g.running || g.gameOver || g.cleared) return;

            if (g.winningRun) {
                g.winRunTimer += dt;

                if (g.player.onGround) {
                    g.animTimer += dt;
                    if (g.animTimer >= RUN_FRAME_INTERVAL) {
                        g.animTimer -= RUN_FRAME_INTERVAL;
                        g.animFrame = (g.animFrame + 1) % 3;
                    }
                }

                g.player.vy += GRAVITY * dt;
                g.player.y += g.player.vy * dt;
                if (g.player.y >= GROUND_Y - PLAYER_H) {
                    g.player.y = GROUND_Y - PLAYER_H;
                    g.player.vy = 0;
                    g.player.onGround = true;
                }

                g.speed = Math.max(60, g.speed - 300 * dt);

                for (const ob of g.obstacles) {
                    ob.x -= g.speed * dt;
                }
                g.obstacles = g.obstacles.filter((o) => o.x + o.w > -40);

                if (g.winRunTimer >= WINNING_RUN_DURATION) {
                    g.cleared = true;
                    g.running = false;
                    g.inputLockUntil = performance.now() + INPUT_COOLDOWN_MS;
                }
                return;
            }

            g.tAlive += dt;

            const score = Math.floor(g.tAlive * 10);
            if (score >= GOAL_SCORE) {
                g.winningRun = true;
                g.winRunTimer = 0;
                return;
            }

            g.speed = 260 + Math.min(240, g.tAlive * 18);

            if (g.player.onGround) {
                g.animTimer += dt;
                if (g.animTimer >= RUN_FRAME_INTERVAL) {
                    g.animTimer -= RUN_FRAME_INTERVAL;
                    g.animFrame = (g.animFrame + 1) % 3;
                }
            }

            g.player.vy += GRAVITY * dt;
            g.player.y += g.player.vy * dt;

            if (g.player.y >= GROUND_Y - PLAYER_H) {
                g.player.y = GROUND_Y - PLAYER_H;
                g.player.vy = 0;
                g.player.onGround = true;
            }

            g.spawnTimer -= dt;
            if (g.spawnTimer <= 0 && score < GOAL_SCORE - 20) {
                const h = 18 + Math.random() * 28;
                const w = 14 + Math.random() * 18;
                g.obstacles.push({ x: WORLD_W + 40, w, h });

                const base = 0.9 - Math.min(0.35, g.tAlive * 0.01);
                g.spawnTimer = Math.max(0.45, base + Math.random() * 0.35);
            }

            const px = g.player.x;
            const py = g.player.y;

            for (const ob of g.obstacles) {
                ob.x -= g.speed * dt;

                const pad = 3;
                const hit = aabb(
                    px + pad,
                    py + pad,
                    PLAYER_W - pad * 2,
                    PLAYER_H - pad * 2,
                    ob.x,
                    GROUND_Y - ob.h,
                    ob.w,
                    ob.h,
                );

                if (hit) {
                    g.gameOver = true;
                    g.running = false;
                    g.inputLockUntil = performance.now() + INPUT_COOLDOWN_MS;
                    break;
                }
            }

            g.obstacles = g.obstacles.filter((o) => o.x + o.w > -40);
        };

        const render = () => {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Ground line
            ctx.fillStyle = "#111";
            ctx.fillRect(0, GROUND_Y, WORLD_W, 3);

            // Player — sprite or fallback rect
            const frameIdx = g.player.onGround ? g.animFrame : 1;
            const sprite = g.spriteFrames[frameIdx];

            if (sprite?.complete && sprite.naturalWidth > 0) {
                const drawX = g.player.x + (PLAYER_W - spriteW) / 2;
                const drawY = g.player.y + PLAYER_H - SPRITE_H;
                ctx.drawImage(sprite, drawX, drawY, spriteW, SPRITE_H);
            } else {
                ctx.fillRect(g.player.x, g.player.y, PLAYER_W, PLAYER_H);
            }

            // Obstacles
            ctx.fillStyle = "#111";
            for (const ob of g.obstacles) {
                ctx.fillRect(ob.x, GROUND_Y - ob.h, ob.w, ob.h);
            }

            // Progress bar
            const score = Math.min(GOAL_SCORE, Math.floor(g.tAlive * 10));
            const progress = score / GOAL_SCORE;

            const barL = 28;
            const barR = g.viewRight - 28;
            const barW = barR - barL;
            const barY = 9;
            const barH = 3;

            ctx.fillStyle = "#d8d2cb";
            ctx.fillRect(barL, barY, barW, barH);
            ctx.fillStyle = "#e8b4b8";
            ctx.fillRect(barL, barY, barW * progress, barH);

            for (const st of STATIONS) {
                const sx = barL + barW * (st.score / GOAL_SCORE);
                ctx.fillStyle = "#999";
                ctx.fillRect(sx - 0.5, barY - 2, 1, barH + 4);
            }

            ctx.fillStyle = "#111";
            ctx.font = "8px system-ui";
            ctx.fillText("浜松", 4, 8);
            ctx.textAlign = "end";
            ctx.fillText("東京", g.viewRight - 4, 8);
            ctx.textAlign = "start";

            let currentStation = STATIONS[0].name;
            for (const st of STATIONS) {
                if (score >= st.score) currentStation = st.name;
            }
            ctx.font = "11px system-ui";
            ctx.fillText(`${currentStation}  ${score} / ${GOAL_SCORE}`, 4, 26);

            // Center messages
            ctx.font = "14px system-ui";
            if (g.waitingToStart) {
                ctx.textAlign = "center";
                ctx.fillText("TAP TO START", g.viewCenterX, 150);
                ctx.textAlign = "start";
            } else if (g.winningRun) {
                ctx.save();
                ctx.textAlign = "center";
                const alpha = 0.6 + 0.4 * Math.sin(g.winRunTimer * 10);
                ctx.globalAlpha = alpha;
                ctx.font = "16px system-ui";
                ctx.fillText("🔔 GOAL! 🔔", g.viewCenterX, 150);
                ctx.globalAlpha = 1;
                ctx.restore();
            } else if (g.cleared) {
                ctx.textAlign = "center";
                ctx.fillText("東京駅到着！", g.viewCenterX, 140);
                ctx.font = "11px system-ui";
                ctx.fillText(
                    `TIME ${g.tAlive.toFixed(1)}s`,
                    g.viewCenterX,
                    160,
                );
                ctx.textAlign = "start";
            } else if (g.gameOver) {
                ctx.textAlign = "center";
                ctx.fillText("GAME OVER", g.viewCenterX, 150);
                ctx.textAlign = "start";
            }
        };

        const loop = (ts: number) => {
            if (!g.lastT) g.lastT = ts;
            let dt = (ts - g.lastT) / 1000;
            g.lastT = ts;

            dt = Math.min(dt, 1 / 30);

            if (!isLandscape) update(dt);
            render();

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("touchmove", onTouchMove);
        };
    }, [isLandscape, charDef.urls, spriteW]);

    return createPortal(
        <div className="bg-background fixed inset-0 z-50 overflow-hidden">
            <canvas
                ref={canvasRef}
                className="block h-full w-full"
                style={{ touchAction: "none" }}
            />

            <div
                className="absolute inset-0 z-10 touch-none select-none"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new Event("app-jump"));
                }}
            />

            <Button
                size="lg"
                className={`absolute bottom-24 left-1/2 z-20 -translate-x-1/2 px-8 text-xs tracking-wider transition-opacity ${waitingToStart ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onBack();
                }}
            >
                キャラ変更
            </Button>

            {isLandscape && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-black/85 px-6 text-center text-white">
                    <div className="space-y-2">
                        <div className="text-base font-semibold">
                            縦画面に戻せ
                        </div>
                        <div className="text-sm opacity-80">
                            横向きでは遊ばせない。
                        </div>
                    </div>
                </div>
            )}

            <JumpBridge />
        </div>,
        document.body,
    );
}

function JumpBridge() {
    useEffect(() => {
        const handler = () => {
            const ev = new KeyboardEvent("keydown", { code: "Space" });
            window.dispatchEvent(ev);
        };
        window.addEventListener("app-jump", handler);
        return () => window.removeEventListener("app-jump", handler);
    }, []);
    return null;
}
