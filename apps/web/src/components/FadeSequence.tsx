import {
    createContext,
    useCallback,
    useContext,
    useReducer,
    useRef,
    type ReactNode,
} from "react";

/**
 * FadeIn を「前の要素が現れてから次が現れる」依存チェーンとして連動させる仕組み。
 *
 * <FadeSequence> の内側にある FadeIn は自動で登場順(DOM 順)の index を受け取り、
 * ひとつ前の index が登場するまで自身のフェードインを保留する。
 * これにより画像の読み込み速度に関係なく、常に上から順に現れることが保証される。
 * delay の秒数で見た目を調整するのではなく、純粋な依存関係で順序を決める。
 */
type SequenceApi = {
    /** インスタンスごとに一度だけ呼び、登場順の index を確定する */
    register: () => number;
    /** その index の要素が登場した(可視になった)ことを通知する */
    reportShown: (index: number) => void;
    /** その index が登場を許可されているか(直前の要素が登場済みか) */
    isReleased: (index: number) => boolean;
};

const SequenceContext = createContext<SequenceApi | null>(null);

export const useFadeSequence = () => useContext(SequenceContext);

export const FadeSequence = ({ children }: { children: ReactNode }) => {
    const nextIndex = useRef(0);
    const shown = useRef<Set<number>>(new Set());
    const [, bump] = useReducer((n: number) => n + 1, 0);

    const register = useCallback(() => nextIndex.current++, []);

    const reportShown = useCallback((index: number) => {
        if (shown.current.has(index)) return;
        shown.current.add(index);
        bump(); // 後続の isReleased を再評価させる
    }, []);

    const isReleased = useCallback(
        (index: number) => index === 0 || shown.current.has(index - 1),
        [],
    );

    // 毎レンダーで value を作り直し、bump のたびに全 FadeIn を再評価させる
    return (
        <SequenceContext.Provider value={{ register, reportShown, isReleased }}>
            {children}
        </SequenceContext.Provider>
    );
};
