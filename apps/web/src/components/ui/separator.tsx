import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

function Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
	const ref = React.useRef<HTMLDivElement>(null);
	const [inView, setInView] = React.useState(false);

	React.useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<SeparatorPrimitive.Root
			ref={ref}
			data-slot="separator"
			decorative={decorative}
			orientation={orientation}
			className={cn(
				inView ? "separator-animate" : "separator-before-animate",
				"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
