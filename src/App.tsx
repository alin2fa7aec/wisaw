import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Greeting } from "./Greeting";
import { Forms } from "./Forms";
import { DinosaurGame } from "./DinosaurGame";

const Container = () => {
	return (
		<div className="flex flex-col h-1/2">
			<Card className="shadow-none border-none">
				<CardContent className="pt-6">
					<div className="flex flex-col gap-4">
						<Greeting />
						<div className="relative">
							<div
								aria-hidden="true"
								className="absolute inset-0 grid place-items-center"
							>
								<Separator className="bg-primary" />
							</div>
							<div className="relative flex justify-center">
								<span className="bg-background px-2 text-sm text-foreground">
									Separate
								</span>
							</div>
						</div>
						<Forms />
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-none border-none">
				<CardContent className="pt-6">
					<DinosaurGame />
				</CardContent>
			</Card>
		</div>
	);
};

const App = () => {
	return (
		<>
			<Container />
		</>
	);
};

export default App;
