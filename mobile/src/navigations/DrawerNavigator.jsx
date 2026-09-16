import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import PointOfSaleNavigator from "@/navigations/PointOfSaleNavigator.jsx";
import AktivitasScreen from "@/screens/AktivitasScreen.jsx";
import InventoriScreen from "@/screens/InventoriScreen.jsx";
import PengaturanScreen from "@/screens/pengaturanScreen.jsx";
import SummaryScreen from "@/screens/SummaryScreen.jsx";

const Drawer = createDrawerNavigator();

/**
 * Nested under expo-router's NavigationContainer (no second container).
 * A nested NavigationContainer/IndependentTree breaks screen navigation context.
 */
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen
        name="Point of Sale"
        component={PointOfSaleNavigator}
      />
      <Drawer.Screen name="Aktivitas" component={AktivitasScreen} />
      <Drawer.Screen name="Inventori" component={InventoriScreen} />
      <Drawer.Screen name="Ringkasan" component={SummaryScreen} />
      <Drawer.Screen name="Pengaturan" component={PengaturanScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
