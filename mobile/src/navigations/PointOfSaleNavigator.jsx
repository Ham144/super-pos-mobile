import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FavoritesScreen from "../screens/FavoritesScreen";
import LibrariesScreen from "../screens/LibrariesScreen";
import CustomsScreen from "../screens/CustomsScreen";
import {
  CalculatorIcon,
  ClipboardList,
  SquareChevronRight,
  Star,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { DrawerActions } from "@react-navigation/native";

const Tab = createBottomTabNavigator();

const PointOfSaleNavigator = ({ navigation }) => {
  return (
    <View className={`flex-1`}>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Libraries"
          component={LibrariesScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <ClipboardList size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Star size={size} color={color} />
            ),
            unmountOnBlur: true, // Memaksa remount saat tab ini tidak aktif
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Customs"
          component={CustomsScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <CalculatorIcon size={size} color={color} />
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

export default PointOfSaleNavigator;
