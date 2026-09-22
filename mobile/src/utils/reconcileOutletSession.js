import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import { useCurrentBill, useInventoriesOffline, useOutlet } from "../store";

export const getOutletId = (outlet) => {
  if (!outlet) return "";
  if (typeof outlet === "object") {
    return String(outlet._id || "");
  }
  return String(outlet);
};

/**
 * Bill lokal: _id = `${kodeOutlet}-${user}-${timestamp}`, kodeInvoice diawali kodeOutlet.
 * Pakai prefix `_id` + `-` agar kode pendek tidak nabrak (PR vs PRJ_JKT).
 */
export const billBelongsToOutlet = (bill, kodeOutlet) => {
  if (!bill || !kodeOutlet) return false;
  const kode = String(kodeOutlet);
  const id = String(bill._id || "");
  if (id.startsWith(`${kode}-`)) return true;
  if (bill.kodeOutlet === kode || bill.outlet?.kodeOutlet === kode) return true;
  return false;
};

export const filterBillsForOutlet = (bills, kodeOutlet) => {
  if (!Array.isArray(bills)) return [];
  if (!kodeOutlet) return bills;
  return bills.filter((bill) => billBelongsToOutlet(bill, kodeOutlet));
};

/** Buang bill outlet lain dari AsyncStorage (sisa soft-reset / merge sync). */
export const purgeForeignOutletBills = async (kodeOutlet) => {
  if (!kodeOutlet) return [];
  try {
    const raw = await AsyncStorage.getItem("bills");
    if (!raw) return [];
    const all = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    const scoped = filterBillsForOutlet(all, kodeOutlet);
    if (scoped.length !== all.length) {
      await AsyncStorage.setItem("bills", JSON.stringify(scoped));
    }
    return scoped;
  } catch {
    return [];
  }
};

/**
 * Data yang terikat ke satu outlet. Harus dibuang saat currentOutlet ganti.
 * Jangan logout — cukup flush + rehydrate (sync / live fetch).
 */
export const OUTLET_SCOPED_STORAGE_KEYS = [
  "inventories",
  "favoritedInventorySkus",
  "removedInventorySkus",
  "lastInventoryUpdate",
  "lastSyncTime",
  "bills",
  "spg",
  "paymentMethod",
  "diskon",
  "promo",
  "voucher",
  "kirimNantiKwitansi",
];

const notify = (title, message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert(title, message);
  }
};

/** Hapus cache lokal yang bergantung outlet + bersihkan cart aktif. */
export const resetOutletScopedLocalData = async () => {
  await AsyncStorage.multiRemove(OUTLET_SCOPED_STORAGE_KEYS);
  try {
    useInventoriesOffline.getState().setInventoriesOffline([]);
  } catch (_) {
    /* store belum siap */
  }
  try {
    useCurrentBill.getState().clearSale?.();
  } catch (_) {
    /* store belum siap */
  }
};

/**
 * Reconcile mobile session dengan payload getUserInfo / login.
 *
 * Design:
 * - Ganti outlet → soft reset (bukan logout) + needsResync
 * - Offline tanpa server → pakai outlet lokal apa adanya
 * - Akses dicabut / tanpa outlet → caller yang logout
 *
 * offline mode  → setelah reset, sync dump katalog
 * stateless     → setelah reset, LibrariesScreen live-fetch
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

  if (outletChanged) {
    await resetOutletScopedLocalData();
  }

  await AsyncStorage.setItem("outlet", JSON.stringify(outletToStore));
  await useOutlet.getState().setOutlet(outletToStore);

  if (outletChanged) {
    const label =
      outletToStore.namaOutlet || outletToStore.kodeOutlet || serverId;
    if (mode === "stateless") {
      notify(
        "Outlet diganti",
        `Sekarang: "${label}" (stateless). Data outlet lama dibuang — katalog diambil live.`,
      );
    } else {
      notify(
        "Outlet diganti",
        `Sekarang: "${label}" (offline). Data outlet lama dibuang — sync ulang katalog.`,
      );
    }
  }

  return {
    ok: true,
    changed: outletChanged,
    needsResync: outletChanged && mode === "offline",
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

/**
 * Default customer NAV dari outlet (seed/CRUD).
 * Baca zustand dulu, lalu AsyncStorage (sering lebih lengkap setelah sync).
 */
export const getOutletDefaultCustomer = async () => {
  let fromStore = null;
  try {
    fromStore = useOutlet.getState()?.outlet || null;
  } catch {
    fromStore = null;
  }

  let fromStorage = null;
  try {
    const raw = await AsyncStorage.getItem("outlet");
    fromStorage = raw ? JSON.parse(raw) : null;
  } catch {
    fromStorage = null;
  }

  const name =
    fromStore?.defaultSellToCustName ||
    fromStorage?.defaultSellToCustName ||
    "";
  const no =
    fromStore?.defaultSellToCustNo ||
    fromStorage?.defaultSellToCustNo ||
    "";

  return { name, no, outlet: fromStore || fromStorage };
};
