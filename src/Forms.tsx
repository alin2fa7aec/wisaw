import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

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
		</div>
	);
};
