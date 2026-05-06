import { lazy, Suspense, useState } from "react";
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
import { TapPetals } from "@/components/TapPetals";

const Greeting = lazy(() =>
    import("./Greeting").then((m) => ({ default: m.Greeting })),
);
const Forms = lazy(() => import("./Forms").then((m) => ({ default: m.Forms })));
import { DinosaurGame } from "./DinosaurGame";

type ContentKey = "greeting" | "forms" | "dinosaur-game";

const contentItems: { key: ContentKey; label: string }[] = [
    { key: "greeting", label: "Greeting" },
    { key: "forms", label: "Forms" },
    { key: "dinosaur-game", label: "Dinosaur Game" },
];

const App = () => {
    const [activeContent, setActiveContent] = useState<ContentKey>("greeting");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleSelect = (key: ContentKey) => {
        setActiveContent(key);
        setDrawerOpen(false);
    };

    return (
        <TapPetals>
        <div className="bg-background">
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 right-4 z-40"
                onClick={() => setDrawerOpen(true)}
            >
                <MenuIcon className="size-6" />
            </Button>

            <Drawer
                direction="right"
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
            >
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>コンテンツ</DrawerTitle>
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
                                className="justify-start"
                                onClick={() => handleSelect(item.key)}
                            >
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
                                {activeContent === "greeting" && (
                                    <Greeting
                                        onNavigate={(target) =>
                                            setActiveContent(
                                                target as ContentKey,
                                            )
                                        }
                                    />
                                )}
                                {activeContent === "forms" && <Forms />}
                                {activeContent === "dinosaur-game" && (
                                    <DinosaurGame />
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
