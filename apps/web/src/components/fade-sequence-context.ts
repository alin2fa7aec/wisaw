import { createContext, useContext } from "react";

/**
 * FadeSequence の内部 API。
 *
 * コンポーネント本体(`FadeSequence.tsx`)から切り出してある。
 * コンポーネントと一緒に export すると、そのファイルの Fast Refresh が
 * 効かなくなるため(react-refresh/only-export-components)。
 */
export type SequenceApi = {
    /** インスタンスごとに一度だけ呼び、登場順の index を確定する */
    register: () => number;
    /** その index の要素が登場した(可視になった)ことを通知する */
    reportShown: (index: number) => void;
    /** その index が登場を許可されているか(直前の要素が登場済みか) */
    isReleased: (index: number) => boolean;
};

export const SequenceContext = createContext<SequenceApi | null>(null);

/** <FadeSequence> の外側では null を返す。FadeIn は単独でも動く。 */
export const useFadeSequence = () => useContext(SequenceContext);
