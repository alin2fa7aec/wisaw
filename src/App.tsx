import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "./Greeting";
import { Forms } from "./Forms";
import { DinosaurGame } from "./DinosaurGame";
import { LabeledSeparator } from "@/components/ui/LabeledSeparator";

const Container = () => {
	return (
		<div className="flex flex-col h-1/2">
			<Card className="shadow-none border-none">
				<CardContent className="pt-6">
					<div className="flex flex-col gap-4">
						<Greeting />
						<LabeledSeparator className="bg-primary">
							Separate
						</LabeledSeparator>
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
