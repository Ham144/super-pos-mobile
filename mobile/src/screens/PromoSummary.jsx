import { Text, View } from "react-native";
import { ScrollView } from "react-native";

const PromoSummary = () => {
	const mockData = [
		{
			id: 1,
			name: "Promo A",
			description: "Buy 1 Get 1 Free",
			validUntil: "2023-12-31",
		},
		{
			id: 2,
			name: "Promo B",
			description: "Discount 50%",
			validUntil: "2023-11-30",
		},
		{
			id: 3,
			name: "Promo C",
			description: "Free Shipping",
			validUntil: "2023-10-31",
		},
	];

	return (
		<ScrollView className="p-4">
			{mockData.map((promo) => (
				<View
					key={promo.id}
					className="mb-4 p-4 border border-gray-300 rounded"
				>
					<Text className="text-lg font-bold">{promo.name}</Text>
					<Text>{promo.description}</Text>
					<Text>Berlaku hingga: {promo.validUntil}</Text>
				</View>
			))}
		</ScrollView>
	);
};

export default PromoSummary;
