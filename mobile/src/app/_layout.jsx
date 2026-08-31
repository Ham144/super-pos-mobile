import "../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { StyleSheet } from "react-native";

const queryClient = new QueryClient();
const logo = require("@/assets/internal-pos.png");

export default function Layout() {
  const [fontsLoaded] = useFonts({
    gilroyRegular: require("@/assets/fonts/Gilroy-Regular.ttf"),
    gilroyBold: require("@/assets/fonts/Gilroy-Bold.ttf"),
    gilroyLight: require("@/assets/fonts/Gilroy-Light.ttf"),
  });

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <View
          style={{
            position: "absolute",
            left: "42%",
            top: "48%",
            transform: [{ translateY: -10 }],
            opacity: 0.2,
          }}
        >
          <Text>
            <ActivityIndicator size="large" color="#ffffff" />
          </Text>
        </View>
        <Image
          style={{ width: 200, height: 200, resizeMode: "contain" }}
          source={logo}
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7ca7eb",
    flexDirection: "row",
    position: "relative",
  },
  text: {
    fontSize: 24,
    color: "#ffffff", // White text
    fontWeight: "bold",
    textAlign: "center",
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
