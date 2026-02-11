import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type SubmitState =
	| { status: "idle" }
	| { status: "submitting" }
	| { status: "success" }
	| { status: "error"; message: string };

export const Forms = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [address, setAddress] = useState("");
	const [allergy, setAllergy] = useState("");
	const [attendance, setAttendance] = useState("basic-one");
	const [submitState, setSubmitState] = useState<SubmitState>({
		status: "idle",
	});

	const isNameEmpty = name.trim().length === 0;
	const isEmailEmpty = email.trim().length === 0;
	const isEmailInvalid =
		!isEmailEmpty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	const isAddressEmpty = address.trim().length === 0;
	const isAllergyEmpty = allergy.trim().length === 0;

	const canSubmit =
		!isNameEmpty &&
		!isEmailEmpty &&
		!isEmailInvalid &&
		!isAddressEmpty &&
		!isAllergyEmpty &&
		submitState.status !== "submitting";

	const handleSubmit = async () => {
		if (!canSubmit) return;

		setSubmitState({ status: "submitting" });

		const body = {
			idempotencyKey: crypto.randomUUID(),
			email: email.trim(),
			answers: {
				name: name.trim(),
				address: address.trim(),
				allergy: allergy.trim(),
				attendance,
			},
		};

		try {
			const res = await fetch("/submit", {
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
		<div className="flex flex-col">
			<Textarea
				id="name"
				placeholder="お名前"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			{isNameEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<input
				id="email"
				type="email"
				placeholder="メールアドレス"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
			/>
			{isEmailEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : isEmailInvalid ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					メールアドレスの形式が正しくありません
				</p>
			) : null}

			<Textarea
				id="address"
				placeholder="ご住所"
				value={address}
				onChange={(event) => setAddress(event.target.value)}
			/>
			{isAddressEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<Textarea
				id="allergy"
				placeholder="アレルギー"
				value={allergy}
				onChange={(event) => setAllergy(event.target.value)}
			/>
			{isAllergyEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<RadioGroup
				value={attendance}
				onValueChange={(value) => setAttendance(value)}
			>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="basic-one" id="basic-one" />
					<Label htmlFor="basic-one">出席</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="basic-two" id="basic-two" />
					<Label htmlFor="basic-two">欠席</Label>
				</div>
			</RadioGroup>

			<button
				type="button"
				className="mt-4 self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
				disabled={!canSubmit}
				onClick={handleSubmit}
			>
				{submitState.status === "submitting" ? "送信中…" : "送信"}
			</button>

			{submitState.status === "success" ? (
				<p className="mt-2 text-sm text-green-600 text-center">
					送信が完了しました
				</p>
			) : null}
			{submitState.status === "error" ? (
				<p className="mt-2 text-sm text-destructive text-center">
					{submitState.message}
				</p>
			) : null}
		</div>
	);
};
