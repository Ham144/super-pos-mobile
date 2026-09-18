import AsyncStorage from "@react-native-async-storage/async-storage";

// export const environment = "production";
export const environment = "development";

export const BACKEND_URLS = {
  production: "https://pos.mycsi.net",
  development: "http://192.168.21.193:3003",
};

export const BASE_URL = BACKEND_URLS[environment];

export const APP_NAME = "CSI SUPER POS";
export const APP_DESC =
  "Sistem POS by CSI untuk penjualan di outlet dan event besar";

/** Shared HTTP helpers — import from here, not from api.js (avoids circular deps). */
export const getBaseUrl = async () => {
  const storedBaseUrl = await AsyncStorage.getItem("BASE_URL");

  if (storedBaseUrl) {
    try {
      const parsedBaseUrl = JSON.parse(storedBaseUrl);
      if (parsedBaseUrl) {
        return parsedBaseUrl;
      }
    } catch (error) {
      if (storedBaseUrl.trim()) {
        return storedBaseUrl.trim();
      }
    }
  }

  await AsyncStorage.setItem("BASE_URL", JSON.stringify(BASE_URL));
  return BASE_URL;
};

export const getMobileAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return { mobile: `Bearer ${token}` };
};

export const MODE_OUTLET  = {
  stateless: "stateless",
  offline: "offline",
}