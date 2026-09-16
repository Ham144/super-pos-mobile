import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SquareChevronRight } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import MyOutletSummary from "../screens/MyOutletSummary";
import SpgSummary from "../screens/SpgSummary";
import DiskonSummary from "../screens/DiskonSummary";
import VoucherSummary from "../screens/VoucherSummary";
import PromoSummary from "../screens/PromoSummary";

const Tab = createBottomTabNavigator();

const SummaryTabs = ({ navigation }) => {
	return (
		<View className={`flex-1`}>
			<Tab.Navigator screenOptions={{ headerShown: false }}>
				<Tab.Screen
					name="My Outlet"
					component={MyOutletSummary}
					options={{
						tabBarIcon: ({ focused, color, size }) => (
							<SquareChevronRight size={size} color={color} />
						),
						unmountOnBlur: true, // Memaksa remount saat tab ini tidak aktif
						headerShown: false,
					}}
				/>
				<Tab.Screen
					name="Spg Summary"
					component={SpgSummary}
					options={{
						tabBarIcon: ({ focused, color, size }) => (
							<SquareChevronRight size={size} color={color} />
						),
					}}
				/>
				<Tab.Screen
					name="Diskon Summary"
					component={DiskonSummary}
					options={{
						tabBarIcon: ({ focused, color, size }) => (
							<SquareChevronRight size={size} color={color} />
						),
					}}
				/>
				<Tab.Screen
					name="Promo Summary"
					component={PromoSummary}
					options={{
						tabBarIcon: ({ focused, color, size }) => (
							<SquareChevronRight size={size} color={color} />
						),
					}}
				/>
				<Tab.Screen
					name="Voucher Summary"
					component={VoucherSummary}
					options={{
						tabBarIcon: ({ focused, color, size }) => (
							<SquareChevronRight size={size} color={color} />
						),
					}}
				/>
			</Tab.Navigator>
			{/* button untuk buka drawer */}
			<View className="absolute bottom-14 left-0">
				<TouchableOpacity
					onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
					className="px-2 bg-blue-300 py-4 rounded-r-lg  items-center justify-center"
				>
					<Text>
						<SquareChevronRight size={20} color={"white"} />
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default SummaryTabs;
