import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import akira01 from "../assets/dinasaur/akira-01.png";
import akira02 from "../assets/dinasaur/akira-02.png";
import akira03 from "../assets/dinasaur/akira-03.png";
import saki01 from "../assets/dinasaur/saki-01.png";
import saki02 from "../assets/dinasaur/saki-02.png";
import saki03 from "../assets/dinasaur/saki-03.png";

type CharacterKey = "akira" | "saki";
type Obstacle = { x: number; w: number; h: number };

const WORLD_W = 360;
const GROUND_Y = 280;

const PLAYER_W = 24;
const PLAYER_H = 32;

const SPRITE_H = 42;

const GRAVITY = 2200;
const JUMP_V = 780;

const INPUT_COOLDOWN_MS = 250;
const RUN_FRAME_INTERVAL = 1 / 8;

const CHARACTER_DEFS: Record<
    CharacterKey,
    { label: string; urls: string[]; aspect: number }
> = {
    akira: {
        label: "Akira",
        urls: [akira01, akira02, akira03],
        aspect: 238 / 367,
    },
    saki: {
        label: "Saki",
        urls: [saki01, saki02, saki03],
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
            <div className="flex gap-10 py-10">
                {(
                    Object.entries(CHARACTER_DEFS) as [
                        CharacterKey,
                        (typeof CHARACTER_DEFS)[CharacterKey],
                    ][]
                ).map(([key, def]) => (
                    <Button
                        size="lg"
                        variant="ghost"
                        className="px-16 text-xs tracking-wider mb-6"
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

        running: false,
        gameOver: false,
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

            if (g.waitingToStart) {
                g.waitingToStart = false;
                g.running = true;
                g.lastT = 0;
                setWaitingToStart(false);
                return;
            }

            if (!g.running && g.gameOver) {
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
            if (!g.running || g.gameOver) return;

            g.tAlive += dt;
            g.speed = 260 + Math.min(240, g.tAlive * 18);

            // Sprite animation cycling (only while running on ground)
            if (g.player.onGround) {
                g.animTimer += dt;
                if (g.animTimer >= RUN_FRAME_INTERVAL) {
                    g.animTimer -= RUN_FRAME_INTERVAL;
                    g.animFrame = (g.animFrame + 1) % 3;
                }
            }

            // Player physics
            g.player.vy += GRAVITY * dt;
            g.player.y += g.player.vy * dt;

            if (g.player.y >= GROUND_Y - PLAYER_H) {
                g.player.y = GROUND_Y - PLAYER_H;
                g.player.vy = 0;
                g.player.onGround = true;
            }

            // Spawn obstacles
            g.spawnTimer -= dt;
            if (g.spawnTimer <= 0) {
                const h = 18 + Math.random() * 28;
                const w = 14 + Math.random() * 18;
                g.obstacles.push({ x: WORLD_W + 40, w, h });

                const base = 0.9 - Math.min(0.35, g.tAlive * 0.01);
                g.spawnTimer = Math.max(0.45, base + Math.random() * 0.35);
            }

            // Move + collision
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

            // Score
            ctx.fillStyle = "#111";
            ctx.font = "14px system-ui";
            ctx.fillText(`SCORE ${Math.floor(g.tAlive * 10)}`, 10, 18);

            if (g.waitingToStart) {
                ctx.fillText("TAP TO START", 95, 150);
            } else if (g.gameOver) {
                ctx.fillText("GAME OVER", 105, 150);
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

    return (
        <div className="w-full">
            <Button
                size="lg"
                className={`fixed bottom-24 left-1/2 z-20 -translate-x-1/2 px-16 text-xs tracking-wider transition-opacity ${waitingToStart ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={() => onBack()}
            >
                キャラ変更
            </Button>

            <div
                className="inset-0 overflow-hidden overscroll-none touch-none select-none"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new Event("app-jump"));
                }}
            >
                <canvas
                    ref={canvasRef}
                    className="block h-screen w-screen"
                    style={{ touchAction: "none" }}
                />

                {isLandscape && (
                    <div className="fixed inset-0 z-10 grid place-items-center bg-black/85 px-6 text-center text-white">
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
            </div>
        </div>
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
