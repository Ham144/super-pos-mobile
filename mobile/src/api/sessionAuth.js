import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Platform, ToastAndroid } from "react-native";

let installed = false;
let loggingOut = false;

const SESSION_KEYS = [
  "userInfo",
  "BASE_URL",
  "lastInventoryUpdate",
  "lastSyncTime",
  "outlet",
  "inventories",
  "customer",
  "diskon",
  "promo",
  "voucher",
  "paymentMethod",
  "spg",
  "bills",
  "favoritedInventorySkus",
  "removedInventorySkus",
  "token",
];

const isAuthEndpoint = (url = "") =>
  /\/api\/v1\/auth\/(login|ldap|loginMobile|ldapMobile|register)/i.test(url);

const shouldForceLogout = (error) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const message = String(error?.response?.data?.message || "");
  const url = error?.config?.url || "";

  if (isAuthEndpoint(url)) return false;

  if (status === 401) return true;
  if (code === "USER_NOT_FOUND") return true;
  if (/tidak ditemukan di database/i.test(message)) return true;

  return false;
};

/**
 * Clear session + go to login.
 * @param {string} [reason] shown as toast when not silent
 * @param {{ silent?: boolean }} [opts]
 */
export const forceLogoutSession = async (reason, opts = {}) => {
  if (loggingOut) return;
  loggingOut = true;

  const { silent = false } = opts;

  try {
    if (!silent && Platform.OS === "android") {
      ToastAndroid.show(
        reason || "Sesi tidak valid. Silakan login ulang.",
        ToastAndroid.LONG,
      );
    }
    await AsyncStorage.multiRemove(SESSION_KEYS);
  } catch (e) {
    console.error("forceLogoutSession clear failed:", e);
  } finally {
    try {
      router.replace("/");
    } catch (e) {
      console.error("forceLogoutSession navigate failed:", e);
    }
    // allow future logout after user logs in again
    setTimeout(() => {
      loggingOut = false;
    }, 2500);
  }
};

/** Install once — 401 / user not found → logout once, stop endless refetch. */
export const installAxiosAuthGuard = () => {
  if (installed) return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (shouldForceLogout(error)) {
        await forceLogoutSession(
          error?.response?.data?.message ||
            "Sesi tidak valid. Anda akan logout.",
        );
      }
      return Promise.reject(error);
    },
  );
};
