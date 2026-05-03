import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "@wisaw/shared";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle } from "@mynaui/icons-react";

type SubmitState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success" }
    | { status: "error"; message: string };

const SPECIFIC_RAW_MATERIALS = [
    "えび",
    "かに",
    "くるみ",
    "小麦",
    "そば",
    "卵",
    "乳",
    "落花生",
] as const;

export const Forms = () => {
    // 出欠
    const [intentionCeremony, setIntentionCeremony] = useState("");
    const [intentionReception, setIntentionReception] = useState("");
    const [host, setHost] = useState("");

    // 名前
    const [familyNameKana, setFamilyNameKana] = useState("");
    const [firstNameKana, setFirstNameKana] = useState("");
    const [familyNameEn, setFamilyNameEn] = useState("");
    const [firstNameEn, setFirstNameEn] = useState("");

    // 連絡先
    const [email, setEmail] = useState("");
    const [tel, setTel] = useState("");

    // 住所
    const [postCode, setPostCode] = useState("");
    const [prefecture, setPrefecture] = useState("");
    const [municipalities, setMunicipalities] = useState("");
    const [block, setBlock] = useState("");
    const [buildingAndRoom, setBuildingAndRoom] = useState("");

    // アレルギー
    const [allergyHas, setAllergyHas] = useState("");
    const [allergyItems, setAllergyItems] = useState<string[]>([]);
    const [allergyOther, setAllergyOther] = useState("");

    // メッセージ
    const [message, setMessage] = useState("");

    const [submitState, setSubmitState] = useState<SubmitState>({
        status: "idle",
    });

    // --- バリデーション ---
    const isEmailInvalid =
        email.trim().length > 0 && !isValidEmail(email.trim());

    const canSubmit =
        intentionCeremony !== "" &&
        intentionReception !== "" &&
        host !== "" &&
        familyNameKana.trim().length > 0 &&
        firstNameKana.trim().length > 0 &&
        familyNameEn.trim().length > 0 &&
        firstNameEn.trim().length > 0 &&
        email.trim().length > 0 &&
        !isEmailInvalid &&
        tel.trim().length > 0 &&
        postCode.trim().length > 0 &&
        prefecture.trim().length > 0 &&
        municipalities.trim().length > 0 &&
        block.trim().length > 0 &&
        allergyHas !== "" &&
        submitState.status !== "submitting";

    const handleAllergyToggle = (item: string, checked: boolean) => {
        setAllergyItems((prev) =>
            checked ? [...prev, item] : prev.filter((i) => i !== item),
        );
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSubmitState({ status: "submitting" });

        const body = {
            idempotencyKey: crypto.randomUUID(),
            email: email.trim(),
            answers: {
                IntentionsToAttendCeremony: intentionCeremony,
                IntentionsToAttendReception: intentionReception,
                Host: host,
                FamilyNameKana: familyNameKana.trim(),
                FirstNameKana: firstNameKana.trim(),
                FamilyNameEn: familyNameEn.trim(),
                FirstNameEn: firstNameEn.trim(),
                Tel: tel.trim(),
                PostCode: postCode.trim(),
                Prefecture: prefecture.trim(),
                Municipalities: municipalities.trim(),
                Block: block.trim(),
                BuildingAndRoom: buildingAndRoom.trim(),
                AllergyHas: allergyHas,
                AllergyItems: allergyItems.join(","),
                AllergyOther: allergyOther.trim(),
                Message: message.trim(),
            },
        };

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || "";
            const res = await fetch(`${apiBase}/submit`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.ok) {
                setSubmitState({ status: "success" });
            } else {
                setSubmitState({
                    status: "error",
                    message: data.error ?? "送信に失敗しました",
                });
            }
        } catch {
            setSubmitState({
                status: "error",
                message: "通信エラーが発生しました",
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* ── 挙式の出欠 ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">挙式のご出欠</Label>
                <RadioGroup
                    value={intentionCeremony}
                    onValueChange={setIntentionCeremony}
                >
                    {["ご出席", "ご欠席", "保留"].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                            <RadioGroupItem value={v} id={`ceremony-${v}`} />
                            <Label htmlFor={`ceremony-${v}`}>{v}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </fieldset>

            {/* ── 披露宴の出欠 ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">披露宴のご出欠</Label>
                <RadioGroup
                    value={intentionReception}
                    onValueChange={setIntentionReception}
                >
                    {["ご出席", "ご欠席", "保留"].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                            <RadioGroupItem value={v} id={`reception-${v}`} />
                            <Label htmlFor={`reception-${v}`}>{v}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </fieldset>

            {/* ── どちら側のゲストか ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">
                    どちら側のゲストですか？
                </Label>
                <RadioGroup value={host} onValueChange={setHost}>
                    {["新婦", "新郎"].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                            <RadioGroupItem value={v} id={`host-${v}`} />
                            <Label htmlFor={`host-${v}`}>{v}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </fieldset>

            {/* ── お名前（カナ） ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">お名前（カナ）</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        placeholder="セイ"
                        value={familyNameKana}
                        onChange={(e) => setFamilyNameKana(e.target.value)}
                    />
                    <Input
                        placeholder="メイ"
                        value={firstNameKana}
                        onChange={(e) => setFirstNameKana(e.target.value)}
                    />
                </div>
            </fieldset>

            {/* ── お名前（英語） ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">お名前（英語）</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        placeholder="Family Name"
                        value={familyNameEn}
                        onChange={(e) => setFamilyNameEn(e.target.value)}
                    />
                    <Input
                        placeholder="First Name"
                        value={firstNameEn}
                        onChange={(e) => setFirstNameEn(e.target.value)}
                    />
                </div>
            </fieldset>

            {/* ── メールアドレス ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">メールアドレス</Label>
                <Input
                    type="email"
                    placeholder="wedding@bridal.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                {isEmailInvalid && (
                    <p className="text-xs font-medium text-destructive ml-auto">
                        メールアドレスの形式が正しくありません
                    </p>
                )}
            </fieldset>

            {/* ── 電話番号 ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">電話番号</Label>
                <Input
                    type="tel"
                    placeholder="09005070220"
                    value={tel}
                    onChange={(e) => setTel(e.target.value)}
                />
            </fieldset>

            {/* ── ご住所 ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">ご住所</Label>
                <Input
                    placeholder="郵便番号(ハイフンなし)"
                    value={postCode}
                    onChange={(e) => setPostCode(e.target.value)}
                />
                <Input
                    placeholder="都道府県"
                    value={prefecture}
                    onChange={(e) => setPrefecture(e.target.value)}
                />
                <Input
                    placeholder="市区町村"
                    value={municipalities}
                    onChange={(e) => setMunicipalities(e.target.value)}
                />
                <Input
                    placeholder="つづき"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                />
                <Input
                    placeholder="建物名・部屋番号(任意)"
                    value={buildingAndRoom}
                    onChange={(e) => setBuildingAndRoom(e.target.value)}
                />
            </fieldset>

            {/* ── アレルギー ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">アレルギー</Label>
                <RadioGroup value={allergyHas} onValueChange={setAllergyHas}>
                    {["あり", "なし"].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                            <RadioGroupItem value={v} id={`allergy-${v}`} />
                            <Label htmlFor={`allergy-${v}`}>{v}</Label>
                        </div>
                    ))}
                </RadioGroup>

                {allergyHas === "あり" && (
                    <div className="flex flex-col gap-3 mt-2 pl-2 border-l-2 border-border">
                        <Label className="text-sm text-muted-foreground">
                            特定原材料（該当するものを選択）
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {SPECIFIC_RAW_MATERIALS.map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-2"
                                >
                                    <Checkbox
                                        id={`allergy-item-${item}`}
                                        checked={allergyItems.includes(item)}
                                        onCheckedChange={(checked) =>
                                            handleAllergyToggle(
                                                item,
                                                checked === true,
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor={`allergy-item-${item}`}
                                        className="text-sm font-normal"
                                    >
                                        {item}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <Input
                            placeholder="その他のアレルギー"
                            value={allergyOther}
                            onChange={(e) => setAllergyOther(e.target.value)}
                        />
                    </div>
                )}
            </fieldset>

            {/* ── メッセージ ── */}
            <fieldset className="flex flex-col gap-2">
                <Label className="font-semibold">なにかあれば</Label>
                <Textarea
                    placeholder="本日は晴天なり"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </fieldset>

            {/* ── 送信 ── */}
            <button
                type="button"
                className="mt-4 self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                disabled={!canSubmit}
                onClick={handleSubmit}
            >
                {submitState.status === "submitting" ? (
                    <span className="flex items-center gap-2">
                        <Spinner />
                        送信中…
                    </span>
                ) : submitState.status === "success" ? (
                    <span className="flex items-center gap-2">
                        <CheckCircle className="size-4" />
                        送信完了
                    </span>
                ) : (
                    "送信"
                )}
            </button>

            {submitState.status === "success" && (
                <p className="mt-2 text-sm text-success text-center">
                    送信が完了しました
                </p>
            )}
            {submitState.status === "error" && (
                <p className="mt-2 text-sm text-destructive text-center">
                    {submitState.message}
                </p>
            )}
        </div>
    );
};
