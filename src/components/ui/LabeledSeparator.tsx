import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type LabeledSeparatorProps = {
	children: ReactNode;
	className?: string;
	labelClassName?: string;
};

export const LabeledSeparator = ({
	children,
	className,
	labelClassName,
}: LabeledSeparatorProps) => {
	return (
		<div className="relative">
			<div
				aria-hidden="true"
				className="absolute inset-0 grid place-items-center"
			>
				<Separator className={cn("bg-border", className)} />
			</div>
			<div className="relative flex justify-center">
				<span
					className={cn("bg-background px-2 text-sm", labelClassName)}
				>
					{children}
				</span>
			</div>
		</div>
	);
};
