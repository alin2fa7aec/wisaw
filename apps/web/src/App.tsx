import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { MenuIcon } from "lucide-react";
import { X } from "@mynaui/icons-react";
import { TapPetals } from "@/components/TapPetals";
import { CONTENT_ROUTES, MOMENT_PATH, isMomentUnlocked } from "@/routes";

const HomePage = lazy(() =>
    import("./Home").then((m) => ({ default: m.Home })),
);
const Rsvp = lazy(() => import("./Rsvp").then((m) => ({ default: m.Rsvp })));
const Gallery = lazy(() =>
    import("./Gallery").then((m) => ({ default: m.Gallery })),
);
const MomentShare = lazy(() =>
    import("./MomentShare").then((m) => ({ default: m.MomentShare })),
);
import { DinosaurGame } from "./DinosaurGame";

const App = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // 解錠の判定は初回描画時の URL で行う。`/moment` を直接開いた場合も含めて
    // localStorage に控えるので、以後 Home から入ってもメニューに残る。
    const [momentUnlocked] = useState(() =>
        isMomentUnlocked(window.location.pathname, window.location.search),
    );

    const items = momentUnlocked
        ? CONTENT_ROUTES
        : CONTENT_ROUTES.filter((item) => item.path !== MOMENT_PATH);

    const handleSelect = (path: string) => {
        navigate(path);
        setDrawerOpen(false);
    };

    return (
        <TapPetals>
        <div className="bg-background">
            {!drawerOpen &&
                createPortal(
                    <Button
                        variant="ghost"
                        size="icon"
                        className="fixed top-4 right-4 z-[60]"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <MenuIcon className="size-6" />
                    </Button>,
                    document.body,
                )}

            <Drawer
                direction="right"
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
            >
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>コンテンツ</DrawerTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4"
                            onClick={() => setDrawerOpen(false)}
                        >
                            <X className="size-5" />
                        </Button>
                    </DrawerHeader>
                    <nav className="flex flex-col gap-1 p-4">
                        {items.map((item) => (
                            <Button
                                key={item.path}
                                variant={
                                    location.pathname === item.path
                                        ? "secondary"
                                        : "ghost"
                                }
                                className="justify-start gap-2"
                                onClick={() => handleSelect(item.path)}
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>
                </DrawerContent>
            </Drawer>

            <div className="flex flex-col h-1/2 bg-transparent">
                <Card className="shadow-none border-none bg-transparent">
                    <CardContent className="pt-6">
                        <Suspense
                            fallback={
                                <div className="flex justify-center py-12">
                                    <Spinner />
                                </div>
                            }
                        >
                            {/* key で遷移のたびにフェードインをやり直す */}
                            <div
                                key={location.pathname}
                                className="animate-fade-in"
                            >
                                <Routes>
                                    <Route
                                        path="/"
                                        element={
                                            <HomePage
                                                onNavigate={(target) =>
                                                    navigate(target)
                                                }
                                            />
                                        }
                                    />
                                    <Route path="/rsvp" element={<Rsvp />} />
                                    <Route path="/gallery" element={<Gallery />} />
                                    <Route path={MOMENT_PATH} element={<MomentShare />} />
                                    <Route
                                        path="/dinosaur-game"
                                        element={
                                            <DinosaurGame
                                                onNavigateHome={() => navigate("/")}
                                            />
                                        }
                                    />
                                    {/* 知らない URL は Home へ。CloudFront が
                                        404 を index.html に落とすため、打ち間違いも
                                        ここへ来る。 */}
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </div>
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
        </TapPetals>
    );
};

export default App;
