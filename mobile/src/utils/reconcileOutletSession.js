import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import { useInventoriesOffline, useOutlet } from "../store";

export const getOutletId = (outlet) => {
  if (!outlet) return "";
  if (typeof outlet === "object") {
    return String(outlet._id || "");
  }
  return String(outlet);
};

const notify = (title, message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Reconcile mobile session with server getUserInfo payload.
 * Always overwrite AsyncStorage/zustand outlet from DB currentOutlet.
 *
 * offline  → may dump inventory; clear + ask sync on change
 * stateless → live fetch only; never call sync-offline-mode dump
 */
export const applyServerSession = async (payload) => {
  if (!payload) {
    return { ok: false, changed: false, userInfo: null, outlet: null };
  }

  const userInfo = payload.userInfo?._id
    ? payload.userInfo
    : payload._id
      ? payload
      : null;

  if (!userInfo?._id) {
    return { ok: false, changed: false, userInfo: null, outlet: null };
  }

  const serverOutlet = payload.outlet || userInfo.currentOutlet || null;

  const normalizedUser = {
    ...userInfo,
    currentOutlet: serverOutlet || userInfo.currentOutlet || null,
  };

  await AsyncStorage.setItem("userInfo", JSON.stringify(normalizedUser));

  if (!serverOutlet) {
    notify(
      "Outlet diperlukan",
      "Akun belum terhubung ke outlet. Minta admin assign ke kasirList outlet.",
    );
    return {
      ok: false,
      changed: false,
      userInfo: normalizedUser,
      outlet: null,
      code: "OUTLET_REQUIRED",
    };
  }

  let localOutlet = null;
  try {
    const localRaw = await AsyncStorage.getItem("outlet");
    localOutlet = localRaw ? JSON.parse(localRaw) : null;
  } catch {
    localOutlet = null;
  }

  const serverId = getOutletId(serverOutlet);
  const localId = getOutletId(localOutlet);
  const outletChanged = Boolean(serverId && localId && serverId !== localId);
  const mode = serverOutlet?.mode || null;

  const outletToStore =
    typeof serverOutlet === "object"
      ? { ...serverOutlet }
      : { _id: serverOutlet };

  // Always write server outlet (fixes stale AsyncStorage / sync overwrite)
  if (outletChanged) {
    await AsyncStorage.multiRemove([
      "inventories",
      "favoritedInventorySkus",
      "removedInventorySkus",
      "lastInventoryUpdate",
    ]);
    await useInventoriesOffline.getState().setInventoriesOffline([]);

    // Force next offline sync path to re-init for offline mode only
    if (mode === "offline") {
      await AsyncStorage.removeItem("lastSyncTime");
    }
  }

  await AsyncStorage.setItem("outlet", JSON.stringify(outletToStore));
  await useOutlet.getState().setOutlet(outletToStore);

  if (outletChanged) {
    const label =
      outletToStore.namaOutlet || outletToStore.kodeOutlet || serverId;
    if (mode === "stateless") {
      notify(
        "Outlet diperbarui",
        `Sesi outlet diganti ke "${label}" (stateless). Katalog live dari server.`,
      );
    } else {
      notify(
        "Outlet diperbarui",
        `Sesi outlet diganti ke "${label}" (offline). Katalog lokal direset — sync ulang.`,
      );
    }
  }

  return {
    ok: true,
    changed: outletChanged,
    userInfo: normalizedUser,
    outlet: outletToStore,
    mode,
  };
};

export const getLocalOutletMode = async () => {
  try {
    const raw = await AsyncStorage.getItem("outlet");
    if (!raw) return null;
    return JSON.parse(raw)?.mode || null;
  } catch {
    return null;
  }
};
