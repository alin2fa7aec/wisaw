import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "./Greeting";
import { Forms } from "./Forms";
import { DinosaurGame } from "./DinosaurGame";

const Container = () => {
	return (
		<div className="flex flex-col h-1/2">
			<Card className="shadow-none border-none">
				<CardContent className="pt-6">
					<Greeting />
					<Forms />
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
