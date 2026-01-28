import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const Forms = () => {
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [allergy, setAllergy] = useState("");
	const [attendance, setAttendance] = useState("basic-one");

	const isNameEmpty = name.trim().length === 0;
	const isAddressEmpty = address.trim().length === 0;
	const isAllergyEmpty = allergy.trim().length === 0;

	const handleExport = () => {
		const payload = {
			name,
			address,
			allergy,
			attendance,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "form-data.json";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col">
			<Textarea
				id="name"
				placeholder="Enter your name"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			{isNameEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<Textarea
				id="address"
				placeholder="Enter your address"
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
				placeholder="Enter your allergy"
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
				className="mt-4 self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
				onClick={handleExport}
			>
				JSONを保存
			</button>
		</div>
	);
};
