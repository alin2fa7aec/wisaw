import { useCallback, useEffect, useState } from "react";

interface Petal {
    id: number;
    x: number;
    y: number;
    angle: number;
    distance: number;
    rotation: number;
    scale: number;
    delay: number;
}

let petalId = 0;

export const TapPetals = ({ children }: { children: React.ReactNode }) => {
    const [petals, setPetals] = useState<Petal[]>([]);

    const spawn = useCallback((x: number, y: number) => {
        const count = 3 + Math.floor(Math.random() * 2);
        const batch: Petal[] = Array.from({ length: count }, () => ({
            id: ++petalId,
            x,
            y,
            angle: Math.random() * 360,
            distance: 20 + Math.random() * 25,
            rotation: Math.random() * 360,
            scale: 0.7 + Math.random() * 0.5,
            delay: Math.random() * 120,
        }));
        setPetals((prev) => [...prev, ...batch]);
    }, []);

    const handleClick = useCallback(
        (e: MouseEvent | TouchEvent) => {
            const point =
                "touches" in e ? e.changedTouches[0] : (e as MouseEvent);
            spawn(point.clientX, point.clientY);
        },
        [spawn],
    );

    useEffect(() => {
        document.addEventListener("click", handleClick);
        document.addEventListener("touchstart", handleClick, { passive: true });
        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("touchstart", handleClick);
        };
    }, [handleClick]);

    const removePetal = useCallback((id: number) => {
        setPetals((prev) => prev.filter((p) => p.id !== id));
    }, []);

    return (
        <>
            {children}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {petals.map((p) => {
                    const rad = (p.angle * Math.PI) / 180;
                    const tx = Math.cos(rad) * p.distance;
                    const ty = Math.sin(rad) * p.distance;
                    return (
                        <span
                            key={p.id}
                            className="absolute animate-[petal-burst_800ms_ease-out_forwards]"
                            style={{
                                left: p.x,
                                top: p.y,
                                animationDelay: `${p.delay}ms`,
                                ["--tx" as string]: `${tx}px`,
                                ["--ty" as string]: `${ty}px`,
                                ["--rot" as string]: `${p.rotation}deg`,
                            }}
                            onAnimationEnd={() => removePetal(p.id)}
                        >
                            <span
                                className="block bg-popover/75 rounded-[50%_50%_50%_0%]"
                                style={{
                                    width: `${p.scale * 8}px`,
                                    height: `${p.scale * 12}px`,
                                    transform: `rotate(${p.rotation}deg)`,
                                }}
                            />
                        </span>
                    );
                })}
            </div>
        </>
    );
};
