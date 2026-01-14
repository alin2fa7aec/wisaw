import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const Forms = () => {
	const [name, setName] = useState("");
	const isEmpty = name.trim().length === 0;

	return (
		<div className="flex flex-col">
			<Textarea
				id="name"
				placeholder="Enter your name"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			{isEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<Textarea
				id="name"
				placeholder="Enter your address"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			{isEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<Textarea
				id="name"
				placeholder="Enter your allergy"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			{isEmpty ? (
				<p className="text-xs font-medium text-destructive ml-auto">
					This field is required
				</p>
			) : null}

			<RadioGroup defaultValue="option-one">
				<div className="flex items-center gap-2">
					<RadioGroupItem value="basic-one" id="basic-one" />
					<Label htmlFor="basic-one">出席</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="basic-two" id="basic-two" />
					<Label htmlFor="basic-two">欠席</Label>
				</div>
			</RadioGroup>
		</div>
	);
};
