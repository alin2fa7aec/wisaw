import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DinosaurGame } from "./DinosaurGame";

const Container = () => {
	return (
		<div className="flex flex-col">
			<div className="flex flex-row h-1/2">
				<Card className="shadow-none">
					<CardContent className="pt-6">
						<Textarea id="name" placeholder="Enter your name" />
						<p className="text-xs font-medium text-destructive">
							This field is required
						</p>
					</CardContent>
				</Card>
				<Card className="shadow-none">
					<CardContent className="pt-6">
						<p className="text-xs font-extrabold">うみみゃあ！！</p>
					</CardContent>
				</Card>
			</div>

			<Card className="shadow-none h-1/2">
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
			<div className="">
				<Container />
			</div>
		</>
	);
};

export default App;
