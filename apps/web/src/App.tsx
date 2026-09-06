import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
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
import {
    X,
    Home as HomeIcon,
    Mail,
    Controller,
    Image,
    Camera,
} from "@mynaui/icons-react";
import type { ComponentType, SVGAttributes } from "react";
import { TapPetals } from "@/components/TapPetals";

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

type ContentKey = "home" | "rsvp" | "gallery" | "moment" | "dinosaur-game";

type MynaIcon = ComponentType<SVGAttributes<SVGElement>>;

const allContentItems: { key: ContentKey; label: string; icon: MynaIcon }[] = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "rsvp", label: "RSVP", icon: Mail },
    { key: "gallery", label: "Gallery", icon: Image },
    { key: "moment", label: "Moment Share", icon: Camera },
    { key: "dinosaur-game", label: "Dinosaur Game", icon: Controller },
];

const MOMENT_UNLOCK_KEY = "wisaw.moment.unlocked";

/**
 * Moment Share の導線を出すかどうか。
 *
 * `?moment=1` を付けて開いた端末にだけメニュー項目を見せる。本番へ先に
 * デプロイして実地で確かめつつ、それまでゲストが偶然たどり着かないようにする
 * ための仕切りである。
 *
 * **これは濫用対策ではない。** API は期間内なら誰の要求でも受けるし、
 * manifest.json は公開バケットにあって誰でも読める。ドメイン自体が
 * Certificate Transparency ログに載っている以上、URL の秘匿を防御と見なせない
 * ことは moment-share.md に書いたとおり。ここで隠しているのは導線だけである。
 *
 * 一度開けたら localStorage に覚えさせる。式当日に配る QR をこの URL にしておけば、
 * 読み取った端末はその後パラメータ無しで開いても導線が残る。公開に際して
 * web を再デプロイする必要も無い。
 */
function isMomentUnlocked(): boolean {
    const inQuery =
        new URLSearchParams(window.location.search).get("moment") === "1";
    try {
        if (inQuery) localStorage.setItem(MOMENT_UNLOCK_KEY, "1");
        return inQuery || localStorage.getItem(MOMENT_UNLOCK_KEY) === "1";
    } catch {
        // プライベートブラウズ等で localStorage が使えない場合は
        // そのアクセスのクエリだけで判断する
        return inQuery;
    }
}

// URL は SPA の生存中に変わらない(ルータを持たない)ので、読み取りは一度でよい。
const contentItems = isMomentUnlocked()
    ? allContentItems
    : allContentItems.filter((item) => item.key !== "moment");

const App = () => {
    const [activeContent, setActiveContent] = useState<ContentKey>("home");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleSelect = (key: ContentKey) => {
        setActiveContent(key);
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
                        {contentItems.map((item) => (
                            <Button
                                key={item.key}
                                variant={
                                    activeContent === item.key
                                        ? "secondary"
                                        : "ghost"
                                }
                                className="justify-start gap-2"
                                onClick={() => handleSelect(item.key)}
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
                            <div
                                key={activeContent}
                                className="animate-fade-in"
                            >
                                {activeContent === "home" && (
                                    <HomePage
                                        onNavigate={(target) =>
                                            setActiveContent(
                                                target as ContentKey,
                                            )
                                        }
                                    />
                                )}
                                {activeContent === "rsvp" && <Rsvp />}
                                {activeContent === "gallery" && <Gallery />}
                                {activeContent === "moment" && <MomentShare />}
                                {activeContent === "dinosaur-game" && (
                                    <DinosaurGame
                                        onNavigateHome={() =>
                                            setActiveContent("home")
                                        }
                                    />
                                )}
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
