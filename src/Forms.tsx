import { Textarea } from "@/components/ui/textarea";

export const Forms = () => {
	return (
		<div className="flex flex-col h-3000">
			<Textarea id="name" placeholder="Enter your name" />
			<p className="text-xs font-medium text-destructive ml-auto">
				This field is required
			</p>
		</div>
	);
};
