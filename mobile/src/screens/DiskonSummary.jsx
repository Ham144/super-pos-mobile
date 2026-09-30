import { ScrollView, Text, View } from "react-native";

const DiskonSummary = () => {
	const mockData = [
		{ id: 1, product: "Product A", discount: "5%", validUntil: "2023-12-31" },
		{ id: 2, product: "Product B", discount: "10%", validUntil: "2023-11-30" },
		{ id: 3, product: "Product C", discount: "15%", validUntil: "2023-10-31" },
	];

	return (
		<ScrollView className="p-4">
			{mockData.map((diskon) => (
				<View
					key={diskon.id}
					className="mb-4 p-4 border border-gray-300 rounded"
				>
					<Text className="text-lg font-bold">{diskon.product}</Text>
					<Text>Diskon: {diskon.discount}</Text>
					<Text>Berlaku hingga: {diskon.validUntil}</Text>
				</View>
			))}
		</ScrollView>
	);
};

export default DiskonSummary;
