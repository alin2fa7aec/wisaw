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

const MOMENT_UNLOCK_KEY = "wisaw.moment.unlocked";

/**
 * Moment Share の導線を出すかどうか。
 *
 * `/moment` を開いた端末にだけメニュー項目を見せる。本番へ先にデプロイして
 * 実地で確かめつつ、それまでゲストが偶然たどり着かないようにするための仕切りである。
 *
 * **これは濫用対策ではない。** API は期間内なら誰の要求でも受けるし、
 * manifest.json は公開バケットにあって誰でも読める。ドメイン自体が
 * Certificate Transparency ログに載っている以上、URL の秘匿を防御と見なせない
 * ことは moment-share.md に書いたとおり。ここで隠しているのは導線だけである。
 *
 * 一度開けたら localStorage に覚えさせる。式当日に配る QR を `/moment` にしておけば、
 * 読み取った端末はその後 Home から入っても導線が残る。公開に際して web を
 * 再デプロイする必要も無い。
 *
 * 旧来の `?moment=1` も解錠として受け付ける。QR を配る前に共有した URL が
 * 効かなくなるのを避けるため。
 */
export function isMomentUnlocked(pathname: string, search: string): boolean {
    const opened =
        pathname === MOMENT_PATH ||
        new URLSearchParams(search).get("moment") === "1";
    try {
        if (opened) localStorage.setItem(MOMENT_UNLOCK_KEY, "1");
        return opened || localStorage.getItem(MOMENT_UNLOCK_KEY) === "1";
    } catch {
        // プライベートブラウズ等で localStorage が使えない場合は
        // そのアクセスの URL だけで判断する
        return opened;
    }
}
