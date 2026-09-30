import { View, Text, ScrollView, Alert } from "react-native";
import React, { useEffect } from "react";

const MyOutletSummary = () => {
	const mockData = {
		outletProfile: {
			name: "Outlet ABC",
			location: "Jakarta",
			owner: "John Doe",
		},
		totalSales: 1500,
		dailySales: [
			{ day: "Senin", sales: 200 },
			{ day: "Selasa", sales: 300 },
			{ day: "Rabu", sales: 250 },
			{ day: "Kamis", sales: 400 },
			{ day: "Jumat", sales: 350 },
			{ day: "Sabtu", sales: 500 },
			{ day: "Minggu", sales: 450 },
		],
		topSellingProduct: "Product XYZ",
	};

	useEffect(() => {
		Alert.alert("Screen Summary Masih dalam Pengembangan, data tidak benar");
	}, []);

	return (
		<ScrollView className="p-4">
			<View className="mb-6">
				<Text className="text-xl font-bold">Profil Outlet</Text>
				<Text>Nama: {mockData.outletProfile.name}</Text>
				<Text>Lokasi: {mockData.outletProfile.location}</Text>
				<Text>Pemilik: {mockData.outletProfile.owner}</Text>
			</View>

			<View className="mb-6">
				<Text className="text-xl font-bold">Total Penjualan</Text>
				<Text>{mockData.totalSales} items</Text>
			</View>

			<View className="mb-6">
				<Text className="text-xl font-bold">Penjualan Harian</Text>
				{mockData.dailySales.map((day, index) => (
					<View key={index} className="flex-row justify-between my-1">
						<Text>{day.day}</Text>
						<Text>{day.sales} items</Text>
					</View>
				))}
			</View>

			<View className="mb-6">
				<Text className="text-xl font-bold">Barang Paling Banyak Dijual</Text>
				<Text>{mockData.topSellingProduct}</Text>
			</View>
		</ScrollView>
	);
};

export default MyOutletSummary;
