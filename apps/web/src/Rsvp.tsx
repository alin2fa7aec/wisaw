import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isValidEmail, isValidKana, isValidAlpha } from "@wisaw/shared";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { CheckCircle, Send } from "@mynaui/icons-react";
import KenAll from "ken-all";

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

const RadioButton = ({
    value,
    id,
    selected,
}: {
    value: string;
    id: string;
    selected: boolean;
}) => (
    <label
        htmlFor={id}
        className={`relative py-3 text-center text-sm tracking-widest cursor-pointer transition-all ${
            selected ? "text-foreground" : "text-text-mute hover:text-text-soft"
        }`}
    >
        <RadioGroupItem value={value} id={id} className="sr-only" />
        <span
            className={`absolute -top-1 -right-2.5 text-primary text-xs transition-all ${
                selected ? "opacity-100 scale-144" : "opacity-0"
            }`}
        >
            󰛓
        </span>
        {value}
        <span
            className={`absolute left-1/2 -translate-x-1/2 bottom-2 h-px bg-primary transition-all ${
                selected ? "w-full" : "w-0"
            }`}
        />
    </label>
);

const SectionHeader = ({
    number,
    title,
}: {
    number: string;
    title: string;
}) => (
    <div className="flex items-center gap-3 mb-6">
        <span className="text-primary text-lg">{number}</span>
        <span className="flex-1 h-px bg-border" />
        <span className="text-sm text-foreground">{title}</span>
    </div>
);

const FieldLabel = ({
    children,
    required,
}: {
    children: React.ReactNode;
    required?: boolean;
}) => (
    <Label className="text-xs text-text-soft flex items-center gap-1">
        {children}
        {required && (
            <span className="text-primary text-base leading-none">*</span>
        )}
    </Label>
);

export const Rsvp = () => {
    const idempotencyKeyRef = useRef(crypto.randomUUID());
    const submittingRef = useRef(false);

    const [attendance, setAttendance] = useState("");
    const [nameFieldTouched, setNameFieldTouched] = useState(false);
    const [host, setHost] = useState("");

    const [familyNameKanji, setFamilyNameKanji] = useState("");
    const [firstNameKanji, setFirstNameKanji] = useState("");
    const [familyNameKana, setFamilyNameKana] = useState("");
    const [firstNameKana, setFirstNameKana] = useState("");
    const [familyNameEn, setFamilyNameEn] = useState("");
    const [firstNameEn, setFirstNameEn] = useState("");

    const [email, setEmail] = useState("");
    const [tel, setTel] = useState("");

    const [postCode, setPostCode] = useState("");
    const [prefecture, setPrefecture] = useState("");
    const [municipalities, setMunicipalities] = useState("");
    const [block, setBlock] = useState("");
    const [buildingAndRoom, setBuildingAndRoom] = useState("");

    const [allergyHas, setAllergyHas] = useState("");
    const [allergyItems, setAllergyItems] = useState<string[]>([]);
    const [allergyOther, setAllergyOther] = useState("");

    const [message, setMessage] = useState("");

    const [submitState, setSubmitState] = useState<SubmitState>({
        status: "idle",
    });

    const [addressLookupError, setAddressLookupError] = useState("");
    const lookupAddress = async () => {
        setAddressLookupError("");
        const code = postCode.trim().replace(/-/g, "");
        if (!/^\d{7}$/.test(code)) {
            setAddressLookupError("7桁の数字で入力してください");
            return;
        }
        const results = await KenAll(code);
        if (results.length === 0) {
            setAddressLookupError("該当する住所が見つかりませんでした");
            return;
        }
        const [pref, city, town] = results[0];
        setPrefecture(pref);
        setMunicipalities(city + town);
    };

    const isEmailInvalid =
        email.trim().length > 0 && !isValidEmail(email.trim());

    const isKanaInvalid = (v: string) =>
        v.trim().length > 0 && !isValidKana(v.trim());
    const isAlphaInvalid = (v: string) =>
        v.trim().length > 0 && !isValidAlpha(v.trim());

    const hasKanaError =
        isKanaInvalid(familyNameKana) || isKanaInvalid(firstNameKana);
    const hasAlphaError =
        isAlphaInvalid(familyNameEn) || isAlphaInvalid(firstNameEn);

    const canSubmit =
        attendance !== "" &&
        host !== "" &&
        familyNameKanji.trim().length > 0 &&
        firstNameKanji.trim().length > 0 &&
        familyNameKana.trim().length > 0 &&
        firstNameKana.trim().length > 0 &&
        !hasKanaError &&
        familyNameEn.trim().length > 0 &&
        firstNameEn.trim().length > 0 &&
        !hasAlphaError &&
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
        if (!canSubmit || submittingRef.current) return;
        submittingRef.current = true;

        setSubmitState({ status: "submitting" });

        const body = {
            idempotencyKey: idempotencyKeyRef.current,
            email: email.trim(),
            answers: {
                Attendance: attendance,
                Host: host,
                FamilyNameKanji: familyNameKanji.trim(),
                FirstNameKanji: firstNameKanji.trim(),
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
                idempotencyKeyRef.current = crypto.randomUUID();
                setSubmitState({ status: "success" });
            } else {
                submittingRef.current = false;
                setSubmitState({
                    status: "error",
                    message: data.error ?? "送信に失敗しました",
                });
            }
        } catch {
            submittingRef.current = false;
            setSubmitState({
                status: "error",
                message: "通信エラーが発生しました",
            });
        }
    };

    if (submitState.status === "success") {
        return (
            <div className="bg-background overflow-hidden">
                <div className="flex flex-col items-center justify-center py-24 px-5 text-center">
                    <FadeIn variant="scale">
                        <span className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                            <CheckCircle className="size-6 text-primary" />
                        </span>
                    </FadeIn>
                    <FadeIn delay={400}>
                        <h2 className="text-2xl mb-4">ありがとうございます</h2>
                    </FadeIn>
                    <FadeIn delay={800}>
                        <p className="text-xs text-text-soft leading-relaxed">
                            ご回答を受け付けました
                            <br />
                            当日お会いできることを楽しみにしております
                        </p>
                    </FadeIn>
                    <FadeIn delay={1200}>
                        <span className="block w-2/5 h-px bg-border mt-8" />
                    </FadeIn>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background overflow-hidden">
            {/* ── ヘッダー ── */}
            <header className="pt-10 pb-8 px-5 text-center">
                <FadeIn>
                    <h1 className="text-2xl mb-3">RSVP</h1>
                </FadeIn>
                <FadeIn delay={300}>
                    <p className="text-xs text-text-soft leading-relaxed">
                        おいそがしいなか恐れ入りますが
                        <br />
                        以下のフォームにご回答ください
                    </p>
                </FadeIn>
            </header>

            <div className="px-5 pb-12 flex flex-col gap-10">
                <p className="text-[0.65rem] text-text-mute text-right">
                    99月99日(極) 迄にご回答ください
                    <br />
                    <span className="text-primary">*</span> は必須項目です
                </p>

                {/* ═══ 1. 出欠 ═══ */}
                <FadeIn>
                    <section>
                        <SectionHeader number="01" title="ご出欠" />

                        <div className="flex flex-col gap-6">
                            <fieldset className="flex flex-col gap-3">
                                <FieldLabel required>ご出欠</FieldLabel>
                                <RadioGroup
                                    value={attendance}
                                    onValueChange={setAttendance}
                                    className="flex justify-center gap-8"
                                >
                                    {["ご出席", "ご欠席", "保留"].map((v) => (
                                        <RadioButton
                                            key={v}
                                            value={v}
                                            id={`attendance-${v}`}
                                            selected={attendance === v}
                                        />
                                    ))}
                                </RadioGroup>
                            </fieldset>

                            <fieldset className="flex flex-col gap-3">
                                <FieldLabel required>
                                    どちら側のゲストですか？
                                </FieldLabel>
                                <RadioGroup
                                    value={host}
                                    onValueChange={setHost}
                                    className="flex justify-center gap-8"
                                >
                                    {["新婦", "新郎"].map((v) => (
                                        <RadioButton
                                            key={v}
                                            value={v}
                                            id={`host-${v}`}
                                            selected={host === v}
                                        />
                                    ))}
                                </RadioGroup>
                            </fieldset>
                        </div>
                    </section>
                </FadeIn>

                {/* ═══ 2. ご芳名 ═══ */}
                <FadeIn>
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-primary text-lg">02</span>
                            <span className="flex-1 h-px bg-border" />
                            <span
                                className="text-sm text-foreground inline-block overflow-hidden whitespace-nowrap transition-all duration-700"
                                style={{
                                    width: nameFieldTouched ? "1em" : "3em",
                                    direction: "rtl",
                                }}
                            >
                                <span
                                    style={{
                                        direction: "ltr",
                                        unicodeBidi: "bidi-override",
                                    }}
                                >
                                    ご芳名
                                </span>
                            </span>
                        </div>

                        <div
                            className="flex flex-col gap-5"
                            onFocus={() => setNameFieldTouched(true)}
                        >
                            <fieldset className="flex flex-col gap-2">
                                <span className="text-primary text-base leading-none">
                                    *
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="姓"
                                        value={familyNameKanji}
                                        onChange={(e) =>
                                            setFamilyNameKanji(e.target.value)
                                        }
                                    />
                                    <Input
                                        placeholder="名"
                                        value={firstNameKanji}
                                        onChange={(e) =>
                                            setFirstNameKanji(e.target.value)
                                        }
                                    />
                                </div>
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>カナ</FieldLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="セイ"
                                        value={familyNameKana}
                                        onChange={(e) =>
                                            setFamilyNameKana(e.target.value)
                                        }
                                    />
                                    <Input
                                        placeholder="メイ"
                                        value={firstNameKana}
                                        onChange={(e) =>
                                            setFirstNameKana(e.target.value)
                                        }
                                    />
                                </div>
                                {hasKanaError && (
                                    <p className="text-[0.7rem] text-destructive">
                                        ひらがなまたはカタカナで入力してください
                                    </p>
                                )}
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>Alphabetic</FieldLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Family Name"
                                        value={familyNameEn}
                                        onChange={(e) =>
                                            setFamilyNameEn(e.target.value)
                                        }
                                    />
                                    <Input
                                        placeholder="First Name"
                                        value={firstNameEn}
                                        onChange={(e) =>
                                            setFirstNameEn(e.target.value)
                                        }
                                    />
                                </div>
                                {hasAlphaError && (
                                    <p className="text-[0.7rem] text-destructive">
                                        半角アルファベットで入力してください
                                    </p>
                                )}
                            </fieldset>
                        </div>
                    </section>
                </FadeIn>

                {/* ═══ 3. ご連絡先 ═══ */}
                <FadeIn>
                    <section>
                        <SectionHeader number="03" title="ご連絡先" />

                        <div className="flex flex-col gap-5">
                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>メールアドレス</FieldLabel>
                                <Input
                                    type="email"
                                    placeholder="wedding@bridal.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                {isEmailInvalid && (
                                    <p className="text-[0.7rem] text-destructive">
                                        メールアドレスの形式が正しくありません
                                    </p>
                                )}
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>電話番号</FieldLabel>
                                <Input
                                    type="tel"
                                    placeholder="09005070220"
                                    value={tel}
                                    onChange={(e) => setTel(e.target.value)}
                                />
                            </fieldset>
                        </div>
                    </section>
                </FadeIn>

                {/* ═══ 4. ご住所 ═══ */}
                <FadeIn>
                    <section>
                        <SectionHeader number="04" title="ご住所" />

                        <div className="flex flex-col gap-3">
                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>郵便番号</FieldLabel>
                                <div className="flex gap-2">
                                    <Input
                                        className="flex-1"
                                        inputMode="numeric"
                                        placeholder="1710031"
                                        value={postCode}
                                        onChange={(e) =>
                                            setPostCode(e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-[0.7rem] text-text-soft border border-border hover:bg-accent transition-colors"
                                        onClick={lookupAddress}
                                    >
                                        住所検索
                                    </button>
                                </div>
                                {addressLookupError && (
                                    <p className="text-[0.7rem] text-destructive">
                                        {addressLookupError}
                                    </p>
                                )}
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>都道府県</FieldLabel>
                                <Input
                                    placeholder="東京都"
                                    value={prefecture}
                                    onChange={(e) =>
                                        setPrefecture(e.target.value)
                                    }
                                />
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>市区町村</FieldLabel>
                                <Input
                                    placeholder="豊島区目白"
                                    value={municipalities}
                                    onChange={(e) =>
                                        setMunicipalities(e.target.value)
                                    }
                                />
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel required>番地</FieldLabel>
                                <Input
                                    placeholder="2-39-1"
                                    value={block}
                                    onChange={(e) => setBlock(e.target.value)}
                                />
                            </fieldset>

                            <fieldset className="flex flex-col gap-2">
                                <FieldLabel>建物名・部屋番号</FieldLabel>
                                <Input
                                    placeholder="トラッド目白 301"
                                    value={buildingAndRoom}
                                    onChange={(e) =>
                                        setBuildingAndRoom(e.target.value)
                                    }
                                />
                            </fieldset>
                        </div>
                    </section>
                </FadeIn>

                {/* ═══ 5. アレルギー ═══ */}
                <FadeIn>
                    <section>
                        <SectionHeader number="05" title="アレルギー" />

                        <div className="flex flex-col gap-4">
                            <fieldset className="flex flex-col gap-3">
                                <FieldLabel required>
                                    食物アレルギーはございますか？
                                </FieldLabel>
                                <RadioGroup
                                    value={allergyHas}
                                    onValueChange={setAllergyHas}
                                    className="flex justify-center gap-8"
                                >
                                    {["あり", "なし"].map((v) => (
                                        <RadioButton
                                            key={v}
                                            value={v}
                                            id={`allergy-${v}`}
                                            selected={allergyHas === v}
                                        />
                                    ))}
                                </RadioGroup>
                            </fieldset>

                            {allergyHas === "あり" && (
                                <div className="relative pl-4 flex flex-col gap-4">
                                    <span className="absolute top-0 left-0 w-0.5 h-full bg-primary" />

                                    <div>
                                        <p className="text-[0.7rem] text-text-soft mb-3">
                                            特定原材料 (該当するものを選択)
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SPECIFIC_RAW_MATERIALS.map(
                                                (item) => (
                                                    <label
                                                        key={item}
                                                        htmlFor={`allergy-item-${item}`}
                                                        className="flex items-center gap-1.5 text-xs cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            id={`allergy-item-${item}`}
                                                            checked={allergyItems.includes(
                                                                item,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                handleAllergyToggle(
                                                                    item,
                                                                    checked ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                        {item}
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <fieldset className="flex flex-col gap-2">
                                        <FieldLabel>その他</FieldLabel>
                                        <Input
                                            placeholder="その他のアレルギー"
                                            value={allergyOther}
                                            onChange={(e) =>
                                                setAllergyOther(e.target.value)
                                            }
                                        />
                                    </fieldset>
                                </div>
                            )}
                        </div>
                    </section>
                </FadeIn>

                {/* ═══ 6. メッセージ ═══ */}
                <FadeIn>
                    <section>
                        <SectionHeader number="06" title="メッセージ" />

                        <fieldset className="flex flex-col gap-2">
                            <FieldLabel>ふたりへのメッセージ</FieldLabel>
                            <Textarea
                                className="min-h-25"
                                placeholder="任意です"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </fieldset>
                    </section>
                </FadeIn>

                {/* ═══ 送信 ═══ */}
                <FadeIn variant="bounce">
                    <div className="flex flex-col items-center gap-4 pt-4">
                        <span className="w-3/5 h-px bg-border" />

                        <Button
                            size="lg"
                            className="w-full py-3.5 text-xs tracking-wider"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                        >
                            {submitState.status === "submitting" ? (
                                <>
                                    <Spinner />
                                    送信中…
                                </>
                            ) : (
                                <>
                                    <Send className="size-4" />
                                    送信する
                                </>
                            )}
                        </Button>

                        {submitState.status === "error" && (
                            <p className="text-[0.7rem] text-destructive text-center">
                                {submitState.message}
                            </p>
                        )}
                    </div>
                </FadeIn>
            </div>
        </div>
    );
};
