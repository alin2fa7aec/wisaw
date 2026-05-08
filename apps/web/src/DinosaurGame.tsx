import { useEffect, useMemo, useRef, useState } from "react";

type Obstacle = { x: number; w: number; h: number };

const WORLD_W = 360;
const GROUND_Y = 280;

const PLAYER_W = 24;
const PLAYER_H = 32;

const GRAVITY = 2200; // world px / s^2
const JUMP_V = 780; // world px / s

const GO_INPUT_COOLDOWN_MS = 250;

export const DinosaurGame = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // 画面が横向きならブロック (「縦固定」を無理やり強制はできない) 
    const [isLandscape, setIsLandscape] = useState(false);

    // ゲーム状態はすべてrefに閉じ込める (React stateで毎フレーム更新とか論外) 
    const game = useRef({
        dpr: 1,
        scale: 1,

        running: false,
        gameOver: false,
        waitingToStart: true,

        // B) 1タップで停止表示、次でリスタート
        // 0:通常 / 1:GO表示(次タップで「再開待ち」へ) / 2:再開待ち
        gameOverTapStage: 0 as 0 | 1 | 2,

        inputLockUntil: 0,

        lastT: 0,
        tAlive: 0,

        speed: 260,
        spawnTimer: 0,

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
        const onChange = () => {
            const land = mql.matches;
            setIsLandscape(land);
        };
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

        const resize = () => {
            const cssW = window.innerWidth;
            const cssH = window.innerHeight;

            // DPR対応 (ここをサボるとボケる/当たり判定感が崩れる) 
            g.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
            canvas.width = Math.floor(cssW * g.dpr);
            canvas.height = Math.floor(cssH * g.dpr);

            // world -> device pixel
            g.scale = (cssW * g.dpr) / WORLD_W;

            // 以後は world座標で描けるように変換
            ctx.setTransform(g.scale, 0, 0, g.scale, 0, 0);
            ctx.imageSmoothingEnabled = false;
        };

        const reset = () => {
            g.tAlive = 0;
            g.speed = 260;
            g.spawnTimer = 0;
            g.obstacles = [];

            g.player.y = GROUND_Y - PLAYER_H;
            g.player.vy = 0;
            g.player.onGround = true;

            g.gameOver = false;
            g.running = false;
            g.waitingToStart = true;

            g.gameOverTapStage = 0;
            g.inputLockUntil = 0;
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

            // 横向き中は入力を無視 (縦固定前提) 
            if (isLandscape) return;

            // 待機中→ゲーム開始
            if (g.waitingToStart) {
                g.waitingToStart = false;
                g.running = true;
                g.lastT = 0;
                return;
            }

            if (!g.running && g.gameOver) {
                // 1タップ目：GO表示を確定→「再開待ち」に移行
                if (g.gameOverTapStage === 1) {
                    g.gameOverTapStage = 2;
                    return;
                }
                // 2タップ目：リスタート
                if (g.gameOverTapStage === 2) {
                    reset();
                    return;
                }
                // 状態が壊れてたら強制リセット (甘えない) 
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

        // iOSでの謎スクロール/拡大対策：passive:falseでpreventDefault可能にする
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

            // player physics
            g.player.vy += GRAVITY * dt;
            g.player.y += g.player.vy * dt;

            if (g.player.y >= GROUND_Y - PLAYER_H) {
                g.player.y = GROUND_Y - PLAYER_H;
                g.player.vy = 0;
                g.player.onGround = true;
            }

            // spawn obstacles
            g.spawnTimer -= dt;
            if (g.spawnTimer <= 0) {
                const h = 18 + Math.random() * 28;
                const w = 14 + Math.random() * 18;
                g.obstacles.push({ x: WORLD_W + 40, w, h });

                const base = 0.9 - Math.min(0.35, g.tAlive * 0.01);
                g.spawnTimer = Math.max(0.45, base + Math.random() * 0.35);
            }

            // move + collision
            const px = g.player.x;
            const py = g.player.y;

            for (const ob of g.obstacles) {
                ob.x -= g.speed * dt;

                // 当たり判定は少し甘く (スマホでストレスを増やすな) 
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

                    g.gameOverTapStage = 1;
                    g.inputLockUntil = performance.now() + GO_INPUT_COOLDOWN_MS;
                    break;
                }
            }

            // cleanup
            g.obstacles = g.obstacles.filter((o) => o.x + o.w > -40);
        };

        const render = () => {
            // clear in device space (transformの影響を受けないように)
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            // background (white)
            // ctxはすでに world->device transform が入ってる前提

            // ground
            ctx.fillStyle = "#111";
            ctx.fillRect(0, GROUND_Y, WORLD_W, 3);

            // player
            ctx.fillRect(g.player.x, g.player.y, PLAYER_W, PLAYER_H);

            // obstacles
            for (const ob of g.obstacles) {
                ctx.fillRect(ob.x, GROUND_Y - ob.h, ob.w, ob.h);
            }

            // UI text (world座標で描く。端末が変わっても相対サイズは一定) 
            ctx.fillStyle = "#111";
            ctx.font = "14px system-ui";
            ctx.fillText(`SCORE ${Math.floor(g.tAlive * 10)}`, 10, 18);

            if (g.waitingToStart) {
                ctx.fillText("TAP TO START", 95, 150);
            } else if (g.gameOver) {
                const msg =
                    g.gameOverTapStage === 1
                        ? "GAME OVER"
                        : g.gameOverTapStage === 2
                          ? "TAP TO RESTART"
                          : "GAME OVER";
                ctx.fillText(msg, 95, 150);
            }
        };

        const loop = (ts: number) => {
            if (!g.lastT) g.lastT = ts;
            let dt = (ts - g.lastT) / 1000;
            g.lastT = ts;

            // タブ復帰や負荷でdtが巨大化→ワープ防止
            dt = Math.min(dt, 1 / 30);

            // 横向きなら進行停止 (描画だけはする) 
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
    }, [isLandscape]);

    return (
        <div className="w-full">
            <div
                className="inset-0 overflow-hidden overscroll-none touch-none select-none"
                // 追加で保険 (Tailwindのtouch-noneと同等だが明示) 
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                    // ここでpreventDefaultしないと端末によっては変な挙動が混ざる
                    e.preventDefault();

                    // jump処理はeffect内関数なので、ここでは「keydownと同様に」したいところだが、
                    // React経由で直接呼ぶより windowイベントに寄せる方が事故りにくい。
                    // なので bodyへ投げない。代わりにカスタムイベントで通知。
                    window.dispatchEvent(new Event("app-jump"));
                }}
            >
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    className="block h-screen w-screen"
                    // 念のためここにも
                    style={{ touchAction: "none" }}
                />

                {/* 横向きブロック */}
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

                {/* Reactのpointerdownからゲームへ通知する受け口 (イベントで接続)  */}
                <JumpBridge />
            </div>
        </div>
    );
};

/**
 * App本体のeffectスコープ外にあるpointerdownから、ゲームロジックに安全に渡すためのブリッジ。
 *  (Reactの再レンダでハンドラ参照が壊れる系の事故を避ける) 
 */
function JumpBridge() {
    useEffect(() => {
        const handler = () => {
            // keydownと同じ経路に寄せるため、ArrowUpの疑似イベントを投げるのは雑。
            // ここは “直接呼べない” ので、素直にkeydown経路を使わず、別で処理するのが本筋。
            // だが今回は最小で済ませるため、スペースキーイベントを発火させて既存処理に乗せる。
            const ev = new KeyboardEvent("keydown", { code: "Space" });
            window.dispatchEvent(ev);
        };
        window.addEventListener("app-jump", handler);
        return () => window.removeEventListener("app-jump", handler);
    }, []);
    return null;
}
