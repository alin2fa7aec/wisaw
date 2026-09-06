import type { ComponentType, SVGAttributes } from "react";
import {
    Home as HomeIcon,
    Mail,
    Controller,
    Image,
    Camera,
} from "@mynaui/icons-react";

type MynaIcon = ComponentType<SVGAttributes<SVGElement>>;

/**
 * ハンバーガーメニューに並べるコンテンツと、その URL。
 *
 * コンポーネントを export しないファイルに分けてある。App.tsx へ置くと
 * Fast Refresh が効かなくなるため(react-refresh/only-export-components)。
 */
export const CONTENT_ROUTES: {
    path: string;
    label: string;
    icon: MynaIcon;
}[] = [
    { path: "/", label: "Home", icon: HomeIcon },
    { path: "/rsvp", label: "RSVP", icon: Mail },
    { path: "/gallery", label: "Gallery", icon: Image },
    { path: "/moment", label: "Moment Share", icon: Camera },
    { path: "/dinosaur-game", label: "Dinosaur Game", icon: Controller },
];

export const MOMENT_PATH = "/moment";
