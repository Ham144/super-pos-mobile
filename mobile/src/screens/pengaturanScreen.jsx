import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import React, { useState } from "react";
import { DrawerActions } from "@react-navigation/native";
import PengaturanPrinterConfig from "../components/PengaturanPrinterConfig";
import PengaturanInputBill from "../components/PengaturanInputBill";
import PengaturanFitur from "../components/PengaturanFitur";
import PengaturanOutlet from "../components/PengaturanOutlet";
import { SquareChevronRight, Menu } from "lucide-react-native";
import PengaturanBackend from "../components/PengaturanBackend";
import PengaturanAplikasi from "../components/PengaturanAplikasi";

const PengaturanScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 1024;
  const [currentTab, setCurrentTab] = useState("pengaturanPrinterConfig");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pengaturanItems = [
    { id: "pengaturanPrinterConfig", label: "Pengaturan Printer" },
    { id: "pengaturanBackend", label: "Pengaturan Backend" },
    { id: "pengaturanFitur", label: "Pengaturan Fitur" },
    { id: "pengaturaninputbill", label: "Pengaturan Input Bill" },
    { id: "myoutlet", label: "My Outlet" },
    { id: "pengaturanAplikasi", label: "Pengaturan Aplikasi" },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case "pengaturanBackend":
        return <PengaturanBackend />;
      case "pengaturanPrinterConfig":
        return <PengaturanPrinterConfig />;
      case "pengaturanFitur":
        return <PengaturanFitur />;
      case "pengaturaninputbill":
        return <PengaturanInputBill />;
      case "myoutlet":
        return <PengaturanOutlet />;
      case "pengaturanAplikasi":
        return <PengaturanAplikasi />;
      default:
        return <Text>Tutorial</Text>;
    }
  };

  const showSidebar = isLarge || isSidebarOpen;

  return (
    <View style={styles.root}>
      {/* StyleSheet only — NativeWind conditional shadow/transition on pressables breaks nav context */}
      {showSidebar ? (
        <View style={[styles.sidebar, !isLarge && styles.sidebarOverlay]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {pengaturanItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setCurrentTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  style={[styles.tabItem, active ? styles.tabItemActive : styles.tabItemIdle]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      active ? styles.tabLabelActive : styles.tabLabelIdle,
                      { fontFamily: active ? "gilroyBold" : "gilroyRegular" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.content}>{renderContent()}</View>

      {!isLarge ? (
        <TouchableOpacity
          onPress={() => setIsSidebarOpen((open) => !open)}
          style={styles.mobileMenuBtn}
        >
          <Menu size={24} color="white" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.drawerBtnWrap}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.drawerBtn}
        >
          <SquareChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  sidebar: {
    width: 256,
    height: "100%",
    backgroundColor: "#ffffff",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 80,
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  tabItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: "#2563eb",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  tabItemIdle: {
    backgroundColor: "#f9fafb",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  tabLabelIdle: {
    color: "#4b5563",
  },
  content: {
    flex: 1,
    padding: 16,
    height: "100%",
    zIndex: 0,
  },
  mobileMenuBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 16,
    elevation: 100,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  drawerBtnWrap: {
    position: "absolute",
    bottom: 56,
    left: 0,
  },
  drawerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: "#93c5fd",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PengaturanScreen;
