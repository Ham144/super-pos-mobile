import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo"; // Untuk memeriksa status jaringan
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ToastAndroid } from "react-native";

/*{
        _id: "id_bill_untuk_bisa_save_update",
        sku: "",
        description: "",
        quantity: 0,
        totalRp: "",
        catatan: "",
    }
    */
// Stateless: setelah Cetak Bill (Customer) bill sudah di-ship ke NAV, jadi tidak boleh tambah item.
export const isAddItemLocked = (billState) =>
  useOutlet.getState().outlet?.mode === "stateless" &&
  Boolean(billState?.isPrintedCustomerBilling) &&
  !billState?.done;

export const useCurrentBill = create((set) => ({
  _id: "",
  currentBill: [], //didalam nya ada lihat diatas
  spg: "",
  total: 0,
  subTotal: 0,
  diskon: [],
  promo: [],
  futureVoucher: [],
  isPrintedCustomerBilling: false, //sudah cetak customer?
  isPrintedKwitansi: false, //sudah terkirim dari printer atau email
  done: false, //sudah lunas?
  paymentMethod: null,
  customerName: null,
  customerEmail: null,
  customerPhone: null,
  customerAddress: null,
  customerJenisKel: null,
  salesPerson: null, //yg sedang login
  kodeInvoice: "", // Field for formatted invoice code
  isChanged: true,
  tanggalBayar: null,
  nomorTransaksi: null,
  implementedVoucher: [], //untuk implementasi voucher
  setCurrentBill: (
    //untuk get single data bill history(dari history bill)
    savedBill
  ) =>
    set((state) => {
      return {
        ...state,
        _id: savedBill?._id,
        kodeInvoice: savedBill?.kodeInvoice,
        currentBill: savedBill?.currentBill,
        catatan: savedBill?.catatan,
        user: savedBill?.user,
        spg: savedBill?.spg,
        total: savedBill?.total,
        subTotal: savedBill?.subTotal,
        diskon: savedBill?.diskon,
        promo: savedBill?.promo,
        voucher: savedBill?.voucher,
        done: savedBill?.done,
        isPrintedCustomerBilling: savedBill?.isPrintedCustomerBilling,
        isPrintedKwitansi: savedBill?.isPrintedKwitansi,
        paymentMethod: savedBill?.paymentMethod,
        customerName: savedBill?.customer?.name,
        customerEmail: savedBill?.customer?.email,
        customerPhone: savedBill?.customer?.phone,
        customerJenisKel: savedBill?.jenisKelamin,
        customerAddress: savedBill?.alamat,
        salesPerson: savedBill?.salesPerson,
        tanggalBayar: savedBill?.tanggalBayar,
        nomorTransaksi: savedBill?.nomorTransaksi,
      };
    }),
  addToCurrentBill: (
    //untuk add item kedua kali dan seterusnya
    item
  ) =>
    set((state) => {
      // Quick validation to prevent issues
      if (!item || !item.sku) return state;
      if (isAddItemLocked(state)) {
        ToastAndroid?.show(
          "Bill sudah dicetak & dikirim ke NAV, tidak bisa tambah item",
          ToastAndroid.SHORT
        );
        return state;
      }

      const { currentBill } = state;
      const existingIndex = currentBill.findIndex(
        (bill) => bill.sku === item.sku
      );

      let newCurrentBill;
      if (existingIndex !== -1) {
        // Optimized update for existing item
        newCurrentBill = [...currentBill];
        const quantity = newCurrentBill[existingIndex].quantity + 1;
        const hargaDasar =
          parseFloat(newCurrentBill[existingIndex].RpHargaDasar) || 0;

        newCurrentBill[existingIndex] = {
          ...newCurrentBill[existingIndex],
          quantity,
          totalRp: hargaDasar * quantity,
        };
      } else {
        // Optimized add for new item
        const hargaDasar = parseFloat(item?.RpHargaDasar) || 0;
        newCurrentBill = [
          ...currentBill,
          {
            ...item,
            quantity: 1,
            totalRp: hargaDasar,
          },
        ];
      }
      // Return only what's needed
      return { currentBill: newCurrentBill };
    }),
  createCurrentBill: async (item) => {
    //untuk create bill pertama kali
    try {
      // Format kodeInvoice: [outlet][kasir][YYMMDDHHmmss] — unik per detik
      const now = new Date();

      // Get outlet and user info once
      let outletCode, kodeKasir, salesPerson;

      try {
        // Prefer zustand (server session) — AsyncStorage sering tertinggal setelah ganti outlet
        const zustandOutlet = useOutlet.getState()?.outlet;
        const [outletResult, userResult] = await Promise.all([
          AsyncStorage.getItem("outlet"),
          AsyncStorage.getItem("userInfo"),
        ]);

        const outletStorage = outletResult ? JSON.parse(outletResult) : null;
        const userInfo = userResult ? JSON.parse(userResult) : null;

        outletCode =
          zustandOutlet?.kodeOutlet || outletStorage?.kodeOutlet || null;
        kodeKasir = userInfo?.kodeKasir;
        salesPerson = userInfo?.username;

        // Samakan AsyncStorage agar sync/cetak tidak pakai outlet lama
        if (
          zustandOutlet?.kodeOutlet &&
          zustandOutlet.kodeOutlet !== outletStorage?.kodeOutlet
        ) {
          await AsyncStorage.setItem("outlet", JSON.stringify(zustandOutlet));
        }

        const [year, month, date, hours, minutes, seconds] = [
          String(now.getFullYear()).slice(-2), // tahun 2 digit
          String(now.getMonth() + 1).padStart(2, "0"), // bulan mulai dari 0
          String(now.getDate()).padStart(2, "0"),
          String(now.getHours()).padStart(2, "0"),
          String(now.getMinutes()).padStart(2, "0"),
          String(now.getSeconds()).padStart(2, "0"),
        ];

        const timestamp = `${year}${month}${date}${hours}${minutes}${seconds}`;

        const randomId = `${outletCode}-${salesPerson}-${timestamp}`;
        // Validate required data
        if (!kodeKasir) {
          ToastAndroid?.show(
            "Akun yang tidak memiliki kode kasir tidak bisa membuat bill",
            ToastAndroid.SHORT
          );
          return;
        }

        if (!outletCode) {
          ToastAndroid?.show(
            "Akun yang tidak terdaftar ke outlet tidak bisa membuat bill",
            ToastAndroid.SHORT
          );
          return;
        }

        // Unik per transaksi (index Mongo kodeInvoice unique).
        // Format lama outlet+kasir+YYMM bentrok tiap bill di bulan yang sama.
        const kodeInvoice = `${outletCode}${kodeKasir}${timestamp}`;

        // Set all state at once in a single update
        set({
          _id: randomId,
          kodeInvoice,
          currentBill: [
            {
              ...item,
              totalRp: parseFloat(item?.RpHargaDasar) || 0,
              quantity: 1,
            },
          ],
          salesPerson,
          spg: item.spg || "",
          paymentMethod: item.paymentMethod || null,
        });
      } catch (error) {
        console.error("Gagal membuat kode Invoice offline:", error);
        ToastAndroid?.show(
          "Gagal membuat kode Invoice offline",
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      console.error("Gagal membuat bill:", error);
    }
  },
  editCurrentBill: (newItem) =>
    set((state) => {
      const existingItem = state.currentBill.find(
        (bill) => bill.sku === newItem.sku
      );
      if (existingItem) {
        return {
          currentBill: state.currentBill.map((bill) =>
            bill.sku === newItem.sku ? { ...bill, ...newItem } : bill
          ),
        };
      } else {
        return;
      }
    }),
  incrementQuantity: (item) =>
    set((state) => {
      const existingItem = state.currentBill.find(
        (bill) => bill.sku === item.sku
      );
      if (existingItem) {
        return {
          currentBill: state.currentBill.map((bill) =>
            bill.sku === item.sku
              ? {
                  ...bill,
                  quantity: bill.quantity + 1,
                  totalRp: bill.totalRp * bill.quantity,
                }
              : bill
          ),
        };
      } else {
        return;
      }
    }),
  decrementQuantity: (item) =>
    set((state) => {
      const existingItem = state.currentBill.find(
        (bill) => bill.sku === item.sku
      );
      if (existingItem) {
        return {
          currentBill: state.currentBill.map((bill) =>
            bill.sku === item.sku
              ? {
                  ...bill,
                  quantity: bill.quantity - 1,
                  totalRp: bill.totalRp * bill.quantity,
                }
              : bill
          ),
        };
      } else {
        return;
      }
    }),
  clearSale: () =>
    set({
      _id: "",
      kodeInvoice: "",
      currentBill: [],
      catatan: "",
      salesPerson: "",
      isPrinted: false,
      total: 0,
      subTotal: 0,
      diskon: [],
      promo: [],
      futureVoucher: [],
      done: false,
      customerEmail: "",
      customerName: "",
      customerPhone: "",
      customerJenisKel: "",
      customerAddress: "",
      isPrintedCustomerBilling: false,
      isPrintedKwitansi: false,
      paymentMethod: "",
      tanggalBayar: null,
      spg: "",
      customerEmail: "",
      nomorTransaksi: null,
      implementedVoucher: [],
    }),

  removeFromCurrentBill: (item) =>
    set((prevState) => {
      // Filter out the item with the matching sku from the currentBill array
      return {
        ...prevState,
        currentBill: prevState.currentBill.filter(
          (bill) => bill.sku != item.sku
        ),
      };
    }),
  setDiskon: (diskon) => set({ diskon }),
  setPromo: (promo) => set({ promo }),
  setFutureVoucher: (futureVoucher) => set({ futureVoucher }),
  incrementTotal: (float) => set((state) => ({ total: state.total + float })),
  resetTotal: () => set({ total: 0 }),
  setTotal(total) {
    set({ total });
  },
  setSubTotal(total) {
    set({ subTotal: total });
  },
  setIsPrintedCustomerBilling: (bool) =>
    set({ isPrintedCustomerBilling: bool }),
  setIsPrintedKwitansi: (bool) => set({ isPrintedKwitansi: bool }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerEmail: (customerEmail) => set({ customerEmail }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setCustomerJenisKel: (customerJenisKel) => set({ customerJenisKel }),
  setCustomerAddress: (text) => set({ customerAddress: text }),
  setDone: (bool) => set({ done: bool }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setSpg: (spg) => set({ spg }),
  setNomorTransaksi: (nomorTransaksi) => set({ nomorTransaksi }),
  setImplementedVoucher: (obj) =>
    set((state) => ({
      implementedVoucher: [...state.implementedVoucher, obj],
    })),
}));

export const useTransactionFlow = create((set) => ({
  currentTransaction: null,
  step: 23,
  setLastTransaction: (data) => set(() => set(data)),
  clearCurrentTransaction: () => set(() => set(null)),
}));

export const useOfflineBills = create((set) => ({
  offlineBills: [],
  setOfflineBills: (bill) => set({ bill }),
}));

export const useFilter = create((set) => ({
  filter: {
    startDate: "",
    endDate: "",
    limit: 100,
    skip: 0,
    asc: true,
    searchKey: "",
  },
  setFilter: (filter) => set((state) => ({ filter })),
  resetFilter: () =>
    set(() => ({
      filter: {
        startDate: "",
        endDate: "",
        limit: 100,
        skip: 0,
        asc: true,
        searchKey: "",
      },
    })),
}));

export const useNetInfo = create((set) => ({
  isOnline: true,
  setConnected: (isOnline) => set({ isOnline }),
  checkOnline: async () => {
    const netInfo = await NetInfo?.fetch();
    const isOnline = netInfo.isConnected;
    set({ isOnline });
  },
}));

//------------//------------optimasi start
//note: tujuannya untuk tidak get berulang kali dari AsyncStorage
export const useInventoriesOffline = create((set) => ({
  inventoriesOffline: [],
  setInventoriesOffline: async (inventories) => {
    // Stateless: jangan cache inventori ke AsyncStorage / memory dump
    let mode = null;
    try {
      const raw = await AsyncStorage.getItem("outlet");
      mode = raw ? JSON.parse(raw)?.mode : null;
    } catch (_) {
      mode = null;
    }
    if (mode === "stateless") {
      set({ inventoriesOffline: [] });
      await AsyncStorage.removeItem("inventories");
      return;
    }
    set({ inventoriesOffline: inventories });
    await AsyncStorage.setItem("inventories", JSON.stringify(inventories));
  },
}));

/** Stateless: bump setelah cetak/ship agar Libraries refetch qty NAV. */
export const useLiveStockRevision = create((set) => ({
  revision: 0,
  bumpLiveStock: () => set((state) => ({ revision: state.revision + 1 })),
}));

export const useDiskonOffline = create((set) => ({
  diskonOffline: [],
  setDiskonOffline: async (diskon) => {
    set({ diskonOffline: diskon });
    await AsyncStorage.setItem("diskon", JSON.stringify(diskon));
  },
}));

export const usePromoOffline = create((set) => ({
  promoOffline: [],
  setPromoOffline: async (promo) => {
    set({ promoOffline: promo });
    await AsyncStorage.setItem("promo", JSON.stringify(promo));
  },
}));

export const useVoucherOffline = create((set) => ({
  voucherOffline: [],
  setVoucherOffline: async (voucher) => {
    set({ voucherOffline: voucher });
    await AsyncStorage.setItem("voucher", JSON.stringify(voucher));
  },
}));
//------------//------------optimasi end

export const useDebouceTime = create((set) => ({
  debounceTime: 800,
  loadDebounceTime: async () => {
    const time = (await AsyncStorage.getItem("debounceTime")) || 800;
    if (!time) {
      await AsyncStorage.setItem("debounceTime", "800");
    }
    set({ debounceTime: time ? JSON.parse(time) : 800 });
  },
  setDebounceTime: async (ms) => {
    await AsyncStorage.setItem("debounceTime", JSON.stringify(ms));
    set({ debounceTime: ms });
  },
  isDebouncing: false,
  setIsDebouncing: (bool) => set({ isDebouncing: bool }),
}));

export const useOutlet = create((set) => ({
  outlet: null,
  setOutlet: async (outlet) => {
    set({ outlet });
    if (outlet) {
      try {
        await AsyncStorage.setItem("outlet", JSON.stringify(outlet));
      } catch (e) {
        console.error("Gagal menyimpan outlet ke AsyncStorage:", e);
      }
    }
  },
}));

export const useLoading = create((set) => ({
  loadingPrinting: false,
  setLoadingPrinting: (bool) => set({ loadingPrinting: bool }),
}));

//confif auto sync setelah print invoice
export const useSyncSetting = create((set) => ({
  autoSyncSetelahKwitansiPertama: true,
  setAutoSyncSetelahKwitansiPertama: async (bool) => {
    set({ autoSyncSetelahKwitansiPertama: bool });
    await AsyncStorage.setItem("autoSyncSetelahKwitansiPertama", bool);
  },
}));

//config fitur enabled, aktiv semua default app
export const useFiturEnabled = create((set) => ({
  diskonEnabled: true,
  promoEnabled: true,
  futureVoucherEnabled: true,
  setPromoEnabled: async (bool) => {
    set({ promoEnabled: bool });
    await AsyncStorage.setItem("promoEnabled", bool);
  },
  setDiskonEnabled: async (bool) => {
    set({ diskonEnabled: bool });
    await AsyncStorage.setItem("diskonEnabled", bool);
  },
  setFutureVoucherEnabled: async (bool) => {
    set({ futureVoucherEnabled: bool });
    await AsyncStorage.setItem("futureVoucherEnabled", bool);
  },
}));
