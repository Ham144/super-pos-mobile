import { ScrollView, Text, View } from "react-native";

const VoucherSummary = () => {
	const mockData = [
		{ id: 1, code: "VOUCHER123", discount: "10%", validUntil: "2023-12-31" },
		{ id: 2, code: "VOUCHER456", discount: "20%", validUntil: "2023-11-30" },
		{ id: 3, code: "VOUCHER789", discount: "15%", validUntil: "2023-10-31" },
	];

	return (
		<ScrollView className="p-4">
			{mockData.map((voucher) => (
				<View
					key={voucher.id}
					className="mb-4 p-4 border border-gray-300 rounded"
				>
					<Text className="text-lg font-bold">{voucher.code}</Text>
					<Text>Diskon: {voucher.discount}</Text>
					<Text>Berlaku hingga: {voucher.validUntil}</Text>
				</View>
			))}
		</ScrollView>
	);
};

export default VoucherSummary;
