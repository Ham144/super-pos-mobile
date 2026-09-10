import axios from "axios";
import { BASE_URL, environment } from "./constant";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import printerFormatter from "./utils/printerFormatter";
import exactTimeFormatterReadable from "./utils/exactTimeFormatterReadable";
import { formatCurrency } from "./utils/FormatCurrency.js";
import {
  filterVisibleInventories,
  loadRemovedInventorySkus,
} from "./utils/inventoryFilters.js";

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

const getMobileAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return { mobile: `Bearer ${token}` };
};

export const getPrinterConfigs = async () => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/printer/getAllPrinter`,
    {
      headers: await getMobileAuthHeaders(),
      timeout: 30000,
    },
  );

  return response?.data?.data || [];
};

export const createMidtransPayment = async (invoiceId) => {
  const response = await axios.post(
    `${await getBaseUrl()}/api/v1/payment/midtrans/transaction`,
    { invoiceId },
    { headers: await getMobileAuthHeaders(), timeout: 30000 },
  );
  return response.data?.data;
};

export const getMidtransPaymentStatus = async (invoiceId) => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/payment/midtrans/status/${encodeURIComponent(invoiceId)}`,
    { headers: await getMobileAuthHeaders(), timeout: 30000 },
  );
  return response.data?.data;
};

//get Offline inventories
export const getAllinventoriesOffline = async (queryKey) => {
  const inventoriOffline = await AsyncStorage.getItem("inventories");
  const removedSkus = await loadRemovedInventorySkus(AsyncStorage);

  if (inventoriOffline) {
    const parsedData = filterVisibleInventories(
      JSON.parse(inventoriOffline).map((item) => ({
        ...item,
        terjualFromApp:
          item.terjualFromApp !== undefined ? item.terjualFromApp : 0,
      })),
      removedSkus,
    );

    //for libraris screen filter
    const filter = queryKey?.queryKey[1];

    const filteredData = parsedData.filter((item) => {
      if (filter?.searchKey === "") {
        if (
          item?.description &&
          !item.description.toLowerCase()?.includes("")
        ) {
          return false;
        }
        if (
          filter?.startDate &&
          item?.startDate &&
          new Date(item.startDate) < new Date(filter.startDate)
        ) {
          return false;
        }
        if (
          filter?.endDate &&
          item?.endDate &&
          new Date(item.endDate) > new Date(filter.endDate)
        ) {
          return false;
        }
        return true; // item passes all conditions if all conditions pass
      }

      // If a searchKey is provided
      else {
        let matchesSearchKey = false;

        // Check if SKU or description matches the search key
        if (item.sku?.includes(filter?.searchKey)) {
          matchesSearchKey = true;
        }

        if (
          item.description
            ?.toLowerCase()
            ?.includes(filter?.searchKey.toLowerCase())
        ) {
          matchesSearchKey = true;
        }
        if (
          item.barcodeItem
            ?.toLowerCase()
            ?.includes(filter?.searchKey.toLowerCase())
        ) {
          matchesSearchKey = true;
        }
        // Date comparisons
        const startDateCondition =
          filter?.startDate &&
          item?.startDate &&
          new Date(item.startDate) < new Date(filter.startDate);
        const endDateCondition =
          filter?.endDate &&
          item?.endDate &&
          new Date(item.endDate) > new Date(filter.endDate);

        // Return true if the item matches search key and date filters
        if (matchesSearchKey && !startDateCondition && !endDateCondition) {
          return true;
        }

        return false;
      }
    });

    if (filter?.limit) {
      filteredData.splice(filter.limit);
    }
    if (filter?.skip) {
      filteredData.splice(0, filter?.skip);
    }
    const response = {
      data: filteredData,
    };

    return response;
  } else {
    return { data: [] };
  }
};

// export const perbaruiInventoryDariUnlisted = async () => {
//   const token = await AsyncStorage.getItem("token");
//   const response = await axios.get(
//     `${await getBaseUrl()}/api/v1/unlistedLibraries/getUnlistedLibraryByQueries`,
//     {
//       headers: {
//         mobile: `Bearer ${token}`,
//       },
//     }
//   );
//   return response;
// };

//--------------------DISKON---------------------
export const getAllDiskon = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/diskon/getAllDiskon`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getAllDiskonByProduct = async (sku) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/diskon/getAllDiskonByProduct/${sku}`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

//--------------------PROMO---------------------
export const getAllPromo = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("Token tidak ditemukan");
      throw new Error("Token tidak ditemukan");
    }

    console.log("Mengambil data promo dari BE...");
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/promo/getAllPromo`,
      {
        headers: {
          mobile: `Bearer ${token}`,
        },
      },
    );

    if (!response?.data) {
      console.error("Response data kosong");
      throw new Error("Response data kosong");
    }

    console.log("Data promo berhasil diambil:", {
      status: response.status,
      dataLength: response.data?.length || 0,
    });

    return response.data;
  } catch (error) {
    ToastAndroid?.show(
      error.response?.data.message || "terjadi kesalahan saat ambil data promo",
      ToastAndroid.SHORT,
    );
    throw error;
  }
};

export const getAllPromoByProduct = async (sku) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/promo/getAllPromoByProduct/${sku}`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

//--------------------VOUCHER---------------------
export const getAllVouchers = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/voucher/getAllVouchers`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getAllVoucherTerblokirByProduct = async (sku) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/voucher/getAllVoucherTerblokirByProduct/${sku}`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

//untuk mengambil data metode pembayaran
export const initializePaymentMethod = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/payment/getAllPaymentMethod`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response?.data;
};

// Ambil halaman inventory dari InventoryRefrensi (bukan SOAP).
// offline: dipakai dump awal ke AsyncStorage
// stateless: dipakai live/partial di LibrariesScreen
export const getAllInventoriesOnlineInitial = async (
  page = 1,
  limit = 50,
  searchKey = "",
) => {
  const token = await AsyncStorage.getItem("token");
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (searchKey) params.set("searchKey", searchKey);
  
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/inventories/getAllinventoriesMobile?${params.toString()}`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response?.data;
};

// Simpan ke AsyncStorage dengan cara bertahap
const saveToAsyncStorage = async (key, newData) => {
  const CHUNK_SIZE = 500; // Batasi ukuran batch
  let existingData = JSON.parse(await AsyncStorage.getItem(key)) || [];

  // Create a map of existing items by _id to prevent duplicates
  const existingMap = new Map(existingData.map((item) => [item._id, item]));

  for (let i = 0; i < newData.length; i += CHUNK_SIZE) {
    const chunk = newData.slice(i, i + CHUNK_SIZE);

    // Process each item in the chunk
    chunk.forEach((item) => {
      if (!existingMap.has(item._id)) {
        existingMap.set(item._id, item);
      }
    });

    // Convert map back to array and save
    const updatedData = Array.from(existingMap.values());
    await AsyncStorage.setItem(key, JSON.stringify(updatedData));

    // Beri jeda kecil agar UI tetap responsif
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

//sinkronisasi
export const syncDiskonPromoVoucherInventories = async (isOnline) => {
  const token = await AsyncStorage.getItem("token");

  if (!isOnline) {
    if (Platform.OS === "android") {
      return ToastAndroid.show("Sedang offline", ToastAndroid.SHORT);
    } else if (Platform.OS === "web") {
      return alert("Anda sedang offline");
    } else {
      console.log("Platform tidak didukung");
      return;
    }
  }

  //Ambil data dari AsyncStorage terlebih dahulu dengan await
  //jika key data AsyncStorage tidak ditemukan berarti belum di initialisasi
  //tapi kalau ada key tapi isinya undefined atau [] maka memang tidak ada, maka lanjutkan mengupdate yang lain saja

  // Get userInfo safely with proper error handling
  let userInfo;
  try {
    const userInfoStr = await AsyncStorage.getItem("userInfo");
    if (userInfoStr) {
      userInfo = JSON.parse(userInfoStr);
    } else {
      userInfo = null;
      console.log("userInfo tidak ditemukan");
    }
  } catch (error) {
    await AsyncStorage.removeItem("userInfo");
    await AsyncStorage.removeItem("outlet");
    await AsyncStorage.removeItem("token");
    return;
  }

  const updatedPromos =
    (await AsyncStorage?.getItem("promo")) &&
    (await AsyncStorage.getItem("promo")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("promo"))
      : [];

  const updateDiskons =
    (await AsyncStorage?.getItem("diskon")) &&
    (await AsyncStorage.getItem("diskon")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("diskon"))
      : [];

  const updateVouchers =
    (await AsyncStorage?.getItem("voucher")) &&
    (await AsyncStorage.getItem("voucher")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("voucher"))
      : [];

  const inventoriesOfflineFull = JSON.parse(
    await AsyncStorage?.getItem("inventories"),
  );
  const inventoriesOffline = inventoriesOfflineFull?.filter((i) => {
    if (i.quantityDariDataBase !== i.quantity) {
      return true;
    }
    return false;
  });

  const updatedSpg =
    (await AsyncStorage.getItem("spg")) &&
    (await AsyncStorage.getItem("spg")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("spg"))
      : [];

  const updatedCustomer =
    (await AsyncStorage.getItem("customer")) &&
    (await AsyncStorage.getItem("customer")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("customer"))
      : [];

  const billStorage =
    (await AsyncStorage.getItem("bills")) &&
    (await AsyncStorage.getItem("bills")) !== "undefined"
      ? JSON.parse(await AsyncStorage.getItem("bills"))
      : [];
  const updatedBill = billStorage;

  let updatedOutlet = await AsyncStorage.getItem("outlet");
  if (updatedOutlet) {
    try {
      updatedOutlet = JSON.parse(updatedOutlet);
    } catch (error) {
      console.log("Error parsing outlet:", error);
      updatedOutlet = null;
    }
  }

  const paymentMethod =
    (await AsyncStorage.getItem("paymentMethod")) &&
    (await AsyncStorage.getItem("paymentMethod")) != "undefined"
      ? JSON.parse(await AsyncStorage.getItem("paymentMethod"))
      : [];

  //cek apakah userInfo ada
  if (!userInfo) {
    console.log("gagal mengambil user, coba login ulang");
    ToastAndroid?.show(
      "Gagal mengambil user, coba login ulang",
      ToastAndroid.SHORT,
    );
    return null;
  }

  //jika terdapat lastSyncTime maka artinya inisialisasi, perlu ambil semua data dari db
  const lastSyncTime = await AsyncStorage.getItem("lastSyncTime");

  //----END 0f geting offline data need to be filled-----

  //to return
  const data = {};

  //jika tidak ada inventoriesOffline atau yang lain artinya, aplikasi belum ada data untuk itu, maka ambil model yang belum ada dari DB
  //jika inventoriesOffline  dari asyncstorage tidak ada maka artinya belum diinisialisasi
  if (!lastSyncTime || lastSyncTime == "null") {
    console.log("mengambil data initial untuk mengisi AsyncStorage");

    //jika tidak ada diskon Offline diasyncstorage maka ambil BE
    if (!updateDiskons?.length || !updateDiskons) {
      console.log(
        "tidak ada diskon offline, mencoba mengambil data diskon dari BE",
      );

      const response = await getAllDiskon();
      if (!response?.data) {
        console.log("Initialized diskon data ❌");
        return;
      }

      const initialDiskon = response.data.map((item) => {
        return {
          ...item,
          quantityDariDataBase: item?.quantityTersedia,
          terakhirSync: new Date(),
        };
      });
      data.newDiskonData = initialDiskon;
      console.log("Initialized diskon data ✅");
    }

    //jika tidak ada promoOffline di asyncstorage maka ambil BE
    if (!updatedPromos?.length || !updatedPromos) {
      console.log(
        "tidak ada promo offline, mencoba mengambil data promo dari BE",
      );
      const response = await getAllPromo();
      if (!response) {
        console.log("Initialized promo data ❌");
        return;
      }
      const initialPromo = response.data.map((item) => {
        return {
          ...item,
          quantityDariDataBase: item?.quantityBerlaku,
          terakhirSync: new Date(),
        };
      });
      data.newPromoData = initialPromo;
      console.log("Initialized promo data ✅");
    }

    //jika tidak ada voucherOffline diasyncstorage maka ambil BE
    if (!updateVouchers?.length || !updateVouchers) {
      console.log(
        "Tidak ada voucher offline, mencoba mengambil data voucher dari BE",
      );
      const response = await getAllVouchers();
      if (!response?.data) {
        console.log("Initialized voucher data ❌");
        return;
      }
      const initialVoucher = response.data.map((item) => {
        return {
          ...item,
          quantityDariDataBase: item?.quantityTersedia,
          terakhirSync: new Date(),
        };
      });
      data.newVoucherData = initialVoucher;
      console.log("Initialized voucher data ✅");
    }

    //jika tidak ada spg di AsyncStorage maka ambil dari BE
    if (!updatedSpg?.length || !updatedSpg) {
      const response = await getAllSpg();
      if (!response?.data) {
        console.log("tidak ditemukan apapun di spg table");
        return;
      }
      const initialSpg = response.data.map((item) => {
        return {
          ...item,
          terakhirSync: new Date(),
          totalHargaPenjualanFromApp: 0,
          totalQuantityPenjualanFromApp: 0,
        };
      });
      data.newSpgsData = initialSpg;
      console.log("Initialized spg data ✅");
    }

    //jika tidak ada customer di AsyncStorage maka ambil dari BE
    if (!updatedCustomer?.length || !updatedCustomer) {
      const response = await getAllCustomer();
      if (!response?.data) {
        console.log("tidak ditemukan apapun di customer table");
        return;
      }
      const initialCustomer = response.data
        .filter((item) => {
          // Skip empty customer objects that only have keys but no values
          if (
            !item ||
            typeof item !== "object" ||
            Object.keys(item).length === 0
          ) {
            return false;
          }
          return true;
        })
        .map((item) => {
          return {
            ...item,
            terakhirSync: new Date(),
          };
        });
      data.newCustomerData = initialCustomer;
      console.log("Initialized customer data ✅");
    }

    //jika tidak ada billTersimpan di AsyncStorage maka ambil dari BE
    if (!updatedBill?.length || !updatedBill) {
      const response = await getAllBill();
      if (!response?.data) {
        console.log("tidak ditemukan apapun di bill table");
        return;
      }
      const initialBill = response.data.map((item) => {
        return {
          ...item,
          terakhirSync: new Date(),
        };
      });
      data.newBillData = initialBill;
      console.log("Initialized bill data ✅");
    }

    //jika userInfo tidak ada maka ambil dari BE
    if (
      userInfo?.totalHargaPenjualanFromApp != 0 &&
      !userInfo?.totalHargaPenjualanFromApp
    ) {
      data.newUserInfoData = {
        ...userInfo,
        totalHargaPenjualanFromApp: 0,
        totalQuantityPenjualanFromApp: 0,
        terakhirSync: new Date(),
      };
      console.log("Initialized userInfo data ✅");
    }

    //jika tidak ada Metode pembayaran di AsyncStorage maka ambil dari BE
    if (!paymentMethod?.length || !paymentMethod) {
      const paymentList = await initializePaymentMethod();
      if (!paymentList?.length) {
        console.log("tidak ditemukan apapun di metode pembayaran table");
      }
      await AsyncStorage.setItem("paymentMethod", JSON.stringify(paymentList));
      console.log("Initialized paymentMethod data ✅");
    }

    //jika tidak ada outlet di AsyncStorage maka ambil dari BE
    if (!updatedOutlet || updatedOutlet?.namaOutlet == "") {
      console.log("inisialisasi outlet");
      const token = await AsyncStorage.getItem("token");
      try {
        const response = await axios.get(
          `${await getBaseUrl()}/api/v1/outlet/getOutlet/${
            data?.newUserInfoData?._id
          }`,
          {
            headers: {
              mobile: `Bearer ${token}`,
            },
          },
        );
        if (response?.data?.data) {
          data.newOutletData = response?.data?.data;
          await AsyncStorage.setItem(
            "outlet",
            JSON.stringify(response?.data?.data),
          );
          console.log("Initialized outlet ✅");
        }
      } catch (error) {
        console.error("Error initializing outlet:", error);
        if (Platform.OS === "web") {
          alert("Gagal menginisialisasi outlet");
        } else {
          ToastAndroid?.show(
            "Gagal menginisialisasi outlet",
            ToastAndroid.SHORT,
          );
        }
        console.log("gagal menginisialisasi outlet ❌");
        data.newOutletData = null;
      }
    }

    //jika tidak ada inventories di AsyncStorage maka ambil dari BE
    // outlet.mode=stateless: jangan dump ke AsyncStorage — fetch partial langsung dari InventoryRefrensi
    const outletForMode = updatedOutlet || data.newOutletData;
    if (outletForMode?.mode === "stateless") {
      await AsyncStorage.setItem("inventories", JSON.stringify([]));
      data.newInventoryData = [];
      console.log(
        "Stateless outlet: skip inventory AsyncStorage dump (live fetch) ✅",
      );
    } else if (!inventoriesOffline?.length || !inventoriesOffline) {
      let currentPage = 1;
      let hasMorePages = true;
      const ITEMS_PER_PAGE = 50;
      let totalItems = 0;

      try {
        // Implementasi pagination untuk mengambil data inventories
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Memulai sinkronisasi inventories...",
            ToastAndroid.SHORT,
          );
        } else if (Platform.OS === "web") {
          console.log("Memulai sinkronisasi inventories...");
        }

        // Inisialisasi array kosong di AsyncStorage
        await AsyncStorage.setItem("inventories", JSON.stringify([]));

        while (hasMorePages) {
          const inventoriesPage = await getAllInventoriesOnlineInitial(
            currentPage,
            ITEMS_PER_PAGE,
          );

          if (!inventoriesPage?.data || inventoriesPage.data.length === 0) {
            hasMorePages = false;
            break;
          }

          const currentBatchData = inventoriesPage.data
            .filter((item) => item?.isDisabled !== true)
            .map((item) => ({
              ...item,
              quantityDariDataBase: item?.quantity,
              terakhirSync: new Date(),
              terjualFromApp: 0,
            }));

          await saveToAsyncStorage("inventories", currentBatchData);

          totalItems += currentBatchData.length;

          if (inventoriesPage.data.length < ITEMS_PER_PAGE) {
            hasMorePages = false;
          } else {
            currentPage++;
          }
        }
        // Setelah selesai, ambil semua data untuk dikembalikan
        const finalInventories = JSON.parse(
          await AsyncStorage.getItem("inventories"),
        );

        if (finalInventories?.length > 0) {
          data.newInventoryData = finalInventories;

          if (Platform.OS === "android") {
            ToastAndroid.show(
              `Sinkronisasi selesai: ${totalItems} item`,
              ToastAndroid.SHORT,
            );
          } else if (Platform.OS === "web") {
            console.log(`Sinkronisasi selesai: ${totalItems} item`);
          }
          console.log("Initialized inventories data ✅");
        } else {
          if (Platform.OS === "web") {
            console.log("Tidak ditemukan data inventories dari Database");
          } else {
            ToastAndroid?.show(
              "Tidak ditemukan data inventories dari Database",
              ToastAndroid.SHORT,
            );
          }
          console.log("Initialized inventories data ❌");
          return;
        }
      } catch (res) {
        Platform.OS === "web"
          ? console.log(
              res?.response?.data?.message ||
                "gagal inisialisasi inventories offline",
            )
          : ToastAndroid?.show(
              res?.response?.data?.message ||
                "gagal inisialisasi inventories offline",
              ToastAndroid.SHORT,
            );
        if (res?.status == 401) {
          ToastAndroid?.show(
            "Token expired, logout redirect",
            ToastAndroid.SHORT,
          );
          setTimeout(async () => {
            await AsyncStorage.removeItem("userInfo");
            await AsyncStorage.removeItem("outlet");
            await AsyncStorage.removeItem("token");

            // Navigate to login screen
            if (Platform.OS === "web") {
              window.location.href = "/";
            } else {
              // Using Expo Router
              const { router } = require("expo-router");
              router.replace("/");
            }
          }, 2000);
        }
        console.log("Initialized inventories data ❌");
        return;
      }
    }

    //kembalikan data ke useOnlineSync
    return data;
  }

  //update DB sinkronisasi
  else {
    /**expectation (COMPLETE): (✅   means done, do not break the code)
     *diskon[diskon].quantityDariDataBase = 78 (77) ✅
     *diskon[diskon].quantityTersedia = 77 (from backend(77)) ✅
     *promo[promo].quantityDariDataBase = 6 (5) ✅
     *promo[promo].quantityBerlaku = 5 (from the backend(from backend 5)) ✅
     *spg[spg].totalHargaPenjualanFromApp = 272580 (0) ✅
     *spg[spg].totalHargaPenjualan = 474320 (+272580 => 746900) ✅
     *spg[spg].totalQuantityPenjualanFromApp = 2 (0) ✅
     *spg[spg].totalQuantityPenjualan = 4 (+2 => 6) ✅
     *spg[spg].skuTerjual = [{sku: "007PUNDI", quantity: 2}] ([]) ✅
     *userInfo.totalQuantityPenjualanFromApp = 1 (0) ✅
     *userInfo.totalQuantityPenjualan = 13 (+1 => 14) ✅
     *userInfo.totalHargaPenjualanFromApp = 118580 (0) ✅
     *userInfo.totalHargaPenjualan = 3649880 (+118580 => 3768460) ✅
     *inventories[cosmos007pundi].quantity = 12 (from backend(12)) ✅
     *inventories[cosmos007pundi].quantityDariDataBase = 14 (12) ✅
     *inventories[cosmos007pundi].terjualFromApp = 1 (0) ✅
     *inventories[cosmos007pundi].terjual = 95 (+1 => 96) ✅
     *outlet.pendapatanFromApp = 118580 (0) ✅
     *outlet.pendapatan = 3881300 (+118580 => 3999880) ✅
     *outlet.jumlahInvoice = 20 (increment by the iteration of create new invoice) ✅
     *for the backend:
     *for the bill (return the bill that has .kodeInvoice.slice(0,2) == kodeOutlet) ✅
     *for the bill kodeInvoice, its unique, if the INCREMENT is not unique, genereate increment again
     */
    console.log("masuk else sinkronisasi: artinya hanya pembaruan data ");
    //jika aplikasi sudah punya data, akan masuk sini

    // Filter bills to only include those that haven't been synced yet or have changed
    const unsyncedBills = updatedBill.filter(
      (bill) => !bill.sync || bill.isChanged,
    );

    const body = {
      updatedPromos,
      updateDiskons,
      updateVouchers,
      inventoriesOffline,
      updatedSpg,
      // Filter out empty customer objects before sending to server
      updatedCustomer: updatedCustomer.filter((customer) => {
        if (
          !customer ||
          typeof customer !== "object" ||
          Object.keys(customer).length === 0
        ) {
          return false;
        }

        return Object.values(customer).some(
          (value) => value !== undefined && value !== null && value !== "",
        );
      }),
      // Make sure salesPerson is explicitly included in each bill and only send unsynced bills
      updatedBill: unsyncedBills.map((bill) => ({
        ...bill,
        salesPerson: bill.salesPerson || null,
      })),
      updatedOutlet,
      updatedUser: userInfo,
      deviceLastSyncTime: lastSyncTime,
    };

    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/sinkronisasi/syncDiskonPromoVoucher`,
      body,
      {
        headers: {
          mobile: `Bearer ${token}`,
        },
        timeout: 60000, // 1 menit
        timeoutErrorMessage: "Timeout, silahkan coba lagi",
      },
    );

    // -------- output ----------
    if (response?.status < 300) {
      const newPromoData = response?.data.data?.newPromoData?.map((item) => {
        return {
          ...item,
          quantityDariDataBase: item?.quantityBerlaku,
          terakhirSync: new Date(),
        };
      });
      const newDiskonData = response?.data?.data?.newDiskonData?.map((item) => {
        return {
          ...item,
          quantityDariDataBase: item?.quantityTersedia,
          terakhirSync: new Date(),
        };
      });
      const newVoucherData = response?.data?.data?.newVoucherData?.map(
        (item) => {
          return {
            ...item,
            quantityDariDataBase: item?.quantityTersedia,
            terakhirSync: new Date(),
          };
        },
      );
      const newSpgsData = response?.data?.data?.newSpgList?.map((item) => {
        return {
          ...item,
          terakhirSync: new Date(),
          totalHargaPenjualanFromApp: 0,
          totalQuantityPenjualanFromApp: 0,
        };
      });

      const newCustomerData = response?.data?.data?.limitedNewCustomerList
        ?.map((item) => {
          // Skip empty customer objects that only have keys but no values
          if (
            !item ||
            typeof item !== "object" ||
            Object.keys(item).length === 0
          ) {
            return null;
          }

          // Skip customers where all values are empty
          const hasAnyValue = Object.values(item).some(
            (value) => value !== undefined && value !== null && value !== "",
          );

          if (!hasAnyValue) {
            return null;
          }

          return {
            ...item,
            terakhirSync: new Date(),
          };
        })
        .filter(Boolean); // Remove null entries

      const newBillData = response?.data?.data?.limitedNewBillTersimpan?.map(
        (item) => {
          // Find the local version of this bill if it exists to preserve fields that might not be returned by the server
          const localBill = updatedBill.find((bill) => bill._id === item._id);

          return {
            ...item,
            // Preserve salesPerson field if it's missing in the response but exists in local data
            salesPerson: item.salesPerson || localBill?.salesPerson || null,
            terakhirSync: new Date(),
            sync: true,
            isChanged: false,
            // Always prioritize server values for these critical fields
            isPrintedKwitansi:
              item.isPrintedKwitansi === true
                ? true
                : localBill?.isPrintedKwitansi === true
                  ? true
                  : false,
            isPrintedCustomerBilling:
              item.isPrintedCustomerBilling === true
                ? true
                : localBill?.isPrintedCustomerBilling === true
                  ? true
                  : false,
            done:
              item.done === true
                ? true
                : localBill?.done === true
                  ? true
                  : false,
          };
        },
      );

      const newOutletData = {
        ...response?.data?.data?.newOutletData,
        terakhirSync: new Date(),
        pendapatanFromApp: 0,
      };

      const newUserInfoDataDB = response?.data?.data?.newUserInfoData;
      const newUserInfoData = {
        ...userInfo, // Preserve existing userInfo data
        ...newUserInfoDataDB, // Update with new data from server
        totalHargaPenjualanFromApp: 0,
        totalQuantityPenjualanFromApp: 0,
        terakhirSync: new Date(),
      };

      // Force add terjualFromApp to all inventory items
      const inventoryDataWithTerjualFromApp =
        response?.data?.data?.newInventoryData?.map((item) => ({
          ...item,
          terjualFromApp: 0,
          quantityDariDataBase: item?.quantity,
          terakhirSync: new Date(),
        }));

      const favoritedInventorySkus =
        response?.data?.data?.favoritedInventorySkus ?? [];

      const removedInventorySkus =
        response?.data?.data?.removedInventorySkus ?? [];

      const data = {
        newPromoData,
        newDiskonData,
        newVoucherData,
        newInventoryData: inventoryDataWithTerjualFromApp,
        newSpgsData,
        newCustomerData,
        newBillData,
        newOutletData,
        newUserInfoData,
        favoritedInventorySkus,
        removedInventorySkus,
      };

      // Update the sync status of the bills that were sent to the server
      if (unsyncedBills.length > 0) {
        try {
          // Get all bills from AsyncStorage
          const allBills = [...updatedBill];

          // Mark synced bills as synced
          unsyncedBills.forEach((syncedBill) => {
            const index = allBills.findIndex(
              (bill) => bill._id === syncedBill._id,
            );
            if (index !== -1) {
              allBills[index] = {
                ...allBills[index],
                sync: true,
                isChanged: false,
              };
            }
          });

          // Save updated bills back to AsyncStorage
          await AsyncStorage.setItem("bills", JSON.stringify(allBills));
          console.log(`Updated sync status for ${unsyncedBills.length} bills`);
        } catch (error) {
          console.error("Error updating bill sync status:", error);
        }
      }

      //simpan langsung aja sebagian lanjutannya di useOnlineSync
      //proses tanpa perubaham hanya ambil dari DB dan update AsyncStorage
      await AsyncStorage.setItem(
        "paymentMethod",
        JSON.stringify(response?.data?.data?.newPaymentMethodData),
      );

      return data;
    } else {
      ToastAndroid?.show("gagal sinkronisasi", ToastAndroid.SHORT);
    }
    console.log("berhasil sinkronisasi");
  }
};

export const printTest = async (config) => {
  return new Promise((resolve, reject) => {
    const { ipPrinter, portPrinter, tipePrinter } = config;

    const ESC_INIT = "\x1B\x40"; // Initialize printer
    const CUT_PAPER = "\x1D\x56\x41\x00"; // Full cut Mode A
    const ESC_ALIGN_CENTER = "\x1B\x61\x01"; // Align center
    const ESC_FONT_SIZE = "\x1D\x21\x11"; // Set font size
    const ESC_FEED = "\x1B\x64\x05"; // Feed 5 lines
    const ESC_STATUS = "\x1B\x76"; // Get printer status

    const sampleText =
      "TEST BERHASIL\n" +
      "Printer Model: " +
      tipePrinter +
      "\n" +
      "Printer berhasil terhubung";

    const message =
      ESC_INIT +
      ESC_ALIGN_CENTER +
      ESC_FONT_SIZE +
      sampleText +
      ESC_FEED +
      CUT_PAPER;

    let isDataSent = false;
    let isPrinterReady = false;
    let client = null;

    try {
      client = TcpSocket.createConnection(
        {
          port: portPrinter || 9100,
          host: ipPrinter,
          timeout: 10000, // 10 detik timeout
        },
        () => {
          // Cek status printer terlebih dahulu
          client.write(ESC_STATUS, "ascii");

          // Tunggu sebentar untuk memastikan printer siap
          setTimeout(() => {
            if (isPrinterReady && client) {
              client.write(message, "ascii", (err) => {
                if (err) {
                  if (client) {
                    client.destroy();
                  }
                  reject({
                    status: "Failed",
                    message: `Gagal mengirim data ke printer: ${err.message}`,
                  });
                  return;
                }
                isDataSent = true;

                // Tunggu sebentar untuk memastikan data terkirim
                setTimeout(() => {
                  if (client) {
                    client.destroy();
                  }
                  if (isDataSent) {
                    resolve({
                      status: "Success",
                      message: "Printer berhasil mencetak!",
                    });
                  } else {
                    reject({
                      status: "Failed",
                      message: "Data tidak terkirim ke printer",
                    });
                  }
                }, 1000);
              });
            } else {
              if (client) {
                client.destroy();
              }
              reject({
                status: "Failed",
                message: "Printer tidak siap",
              });
            }
          }, 500);
        },
      );

      // Set connection timeout
      client.setTimeout(10000, () => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: "Koneksi ke printer timeout",
        });
      });

      client.on("error", (error) => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Gagal connect ke printer`,
        });
      });

      client.on("data", (data) => {
        // Cek status printer dari response
        const status = data[0];
        if (status === 0) {
          isPrinterReady = true;
        } else {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Printer dalam status error",
          });
        }
      });

      client.on("close", () => {
        if (!isDataSent) {
          reject({
            status: "Failed",
            message: "Koneksi printer terputus sebelum data terkirim",
          });
        }
      });
    } catch (error) {
      if (client) {
        client.destroy();
      }
      reject({
        status: "Failed",
        message: `Terjadi kesalahan: ${error.message}`,
      });
    }
  });
};

export const printCetakBillCustomer = async (
  config,
  bill,
  time,
  outlet,
  isFirstTime,
) => {
  const { ipPrinter, portPrinter } = config;
  const {
    diskons,
    promos,
    futureVouchers,
    subTotal,
    total,
    currentBill,
    spg,
    salesPerson,
    paymentMethod,
    customer,
    _id,
  } = bill;

  if (!bill) {
    throw new Error("terjadi kesalahan mencetak customer bill");
  }

  return new Promise((resolve, reject) => {
    // Setup printer configuration
    const ESC_INIT = printerFormatter.ESC_INIT;
    const CUT_PAPER = printerFormatter.CUT_PAPER;
    const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
    const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
    const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
    const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
    const ESC_STATUS = "\x1B\x76"; // Get printer status
    const totalWidth = printerFormatter.totalWidth;

    // Judul Besar di Tengah
    let message = ESC_INIT;
    message +=
      ESC_ALIGN_CENTER +
      ESC_FONT_SIZE_LARGE +
      "INVOICE BILL\n\n" +
      ESC_FONT_SIZE_NORMAL;
    if (!isFirstTime) {
      message += "-".repeat(45) + "\n";
      message += ESC_FONT_SIZE_NORMAL + "THIS IS A COPY\n";
    }
    message += "-".repeat(45) + "\n";

    // Format informasi dengan spasi dinamis
    const infoBill =
      `${printerFormatter.formatWithSpace("Ext doc", _id)}\n` +
      `${printerFormatter.formatWithSpace("Waktu Print", time)}\n` +
      `${printerFormatter.formatWithSpace("Nama Customer", customer?.name)}\n` +
      `${printerFormatter.formatWithSpace("Kasir", salesPerson)}\n` +
      `${printerFormatter.formatWithSpace("Spg", spg?.name)}\n` +
      `${printerFormatter.formatWithSpace("Payment Method", paymentMethod)}\n`;

    message += infoBill;
    message += "\n";

    // Judul Daftar Item di Tengah
    message += ESC_FONT_SIZE_NORMAL;
    message += "-".repeat(45) + "\n";
    message +=
      ESC_ALIGN_CENTER +
      ESC_FONT_SIZE_LARGE +
      "DAFTAR ITEM\n\n" +
      ESC_FONT_SIZE_NORMAL;

    // Menambahkan item ke pesan print
    message += ESC_ALIGN_LEFT;
    currentBill.forEach((item) => {
      const left = item?.sku;
      const middle = `x ${item?.quantity}`;
      const right = `Rp ${item.totalRp.toLocaleString("id-ID")}`;

      message += item?.description + "\n";
      message += printerFormatter.formatColumns(left, middle, right) + "\n";

      // Menambahkan diskon terkait
      const relatedDiskons =
        diskons?.filter((d) => d.description === item.description) || [];
      relatedDiskons.forEach((diskon) => {
        const potongan = diskon?.diskonInfo.RpPotonganHarga
          ? `${diskon.diskonInfo.RpPotonganHarga}`
          : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
        message +=
          printerFormatter.formatColumns(
            "\tPotongan Diskon",
            "",
            formatCurrency(potongan),
          ) + "\n";
      });

      // print promo particular
      const relatedPromos =
        promos?.filter((p) => p.description === item.description) || [];
      relatedPromos.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message +=
          printerFormatter.formatColumns("\tFree (PARTICULAR)", "", bonus) +
          "\n";
      });

      // Menambahkan future vouchers
      const relatedVouchers =
        futureVouchers?.filter((v) => v.description === item.description) || [];
      relatedVouchers.forEach((voucher) => {
        const potongan = voucher.voucherInfo.potongan;
        message +=
          printerFormatter.formatColumns(
            "\tVoucher (NEXT TIME)",
            "",
            `Rp ${potongan.toLocaleString("id-ID")}`,
          ) + "\n";

        const tanggal = new Date(
          voucher.voucherInfo.berlakuHingga,
        ).toLocaleDateString();
        message +=
          printerFormatter.formatColumns(
            "\tVoucher Berlaku hingga",
            "",
            tanggal,
          ) + "\n";
      });
    });

    // print promo simple_total
    message += ESC_ALIGN_CENTER;
    const simplePromos = promos?.filter((p) => p.promoInfo?.kategori) || [];
    if (simplePromos?.length) {
      message += "-".repeat(45) + "\n";
      message += "BONUS PROMO (keseluruhan)\n";
      simplePromos.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
      });
    }

    // Menambahkan subtotal dan total dengan spasi dinamis
    message += ESC_ALIGN_CENTER;
    message += "-".repeat(45) + "\n";
    message += ESC_ALIGN_LEFT;

    message += "\n";
    message += printerFormatter.formatColumns(
      "SUBTOTAL",
      "",
      `Rp ${subTotal.toLocaleString("id-ID")}`,
    );
    message += "\n";
    message += printerFormatter.formatColumns(
      "TOTAL",
      "",
      `Rp ${total.toLocaleString("id-ID")}`,
    );
    message += "\n";

    // Footer dengan terpusat
    message += ESC_ALIGN_CENTER;
    message += "-".repeat(totalWidth) + "\n";
    message += "Silahkan membayar di kasir\n";
    message += "-".repeat(totalWidth) + "\n";

    //footer
    message += ESC_ALIGN_LEFT;
    message += ESC_FONT_SIZE_NORMAL;
    message += "\n";
    if (outlet?.namaPerusahaan) {
      message += "Nama perusahaan: " + outlet?.namaPerusahaan || "";
      message += "\n";
      message += "NPWP: " + outlet?.npwp || "";
      message += "\n";
      message += "Alamat: " + "\n" + outlet?.alamat || "";
      message += "\n";
      message += "-".repeat(totalWidth);
    }
    message += "\n\n\n\n\n";
    message += CUT_PAPER;

    if (environment == "development") {
      console.log("PRINT CETAK BILL CUSTOMER HASIL : \n", message);
      resolve(true);
      return true;
    }
    let isDataSent = false;
    let isPrinterReady = false;
    let client = null;

    try {
      client = TcpSocket.createConnection(
        {
          port: portPrinter || 9100,
          host: ipPrinter,
          timeout: 10000, // 10 detik timeout
        },
        () => {
          // Cek status printer terlebih dahulu
          client.write(ESC_STATUS, "ascii");

          // Tunggu sebentar untuk memastikan printer siap
          setTimeout(() => {
            if (isPrinterReady && client) {
              client.write(message, "ascii", (err) => {
                if (err) {
                  if (client) {
                    client.destroy();
                  }
                  reject({
                    status: "Failed",
                    message: `Gagal mengirim data ke printer: ${err.message}`,
                  });
                  return;
                }
                isDataSent = true;

                // Tunggu sebentar untuk memastikan data terkirim
                setTimeout(() => {
                  if (client) {
                    client.destroy();
                  }
                  if (isDataSent) {
                    resolve(true);
                  } else {
                    reject({
                      status: "Failed",
                      message: "Data tidak terkirim ke printer",
                    });
                  }
                }, 1000);
              });
            } else {
              if (client) {
                client.destroy();
              }
              reject({
                status: "Failed",
                message: "Printer tidak siap",
              });
            }
          }, 500);
        },
      );

      // Set connection timeout
      client.setTimeout(10000, () => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: "Koneksi ke printer timeout",
        });
      });

      client.on("error", (error) => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Gagal connect ke printer`,
        });
      });

      client.on("data", (data) => {
        // Cek status printer dari response
        const status = data[0];
        if (status === 0) {
          isPrinterReady = true;
        } else {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Printer dalam status error",
          });
        }
      });

      client.on("close", () => {
        if (!isDataSent) {
          reject({
            status: "Failed",
            message: "Koneksi printer terputus sebelum data terkirim",
          });
        }
      });
    } catch (error) {
      if (client) {
        client.destroy();
      }
      reject({
        status: "Failed",
        message: `Terjadi kesalahan: ${error.message}`,
      });
    }
  });
};

// Fungsi untuk mencetak kwitansi
export const printCetakKwitansi = async (
  config,
  bill,
  time,
  outlet,
  isFirstTime,
) => {
  const { ipPrinter, portPrinter } = config;
  const {
    diskons,
    promos,
    futureVouchers,
    subTotal,
    total,
    currentBill,
    spg,
    salesPerson,
    paymentMethod,
    customer,
    nomorTransaksi,
    tanggalBayar,
    _id,
  } = bill;

  if (!bill) {
    throw new Error("terjadi kesalahan mencetak customer bill");
  }

  return new Promise((resolve, reject) => {
    // Setup printer configuration
    const ESC_INIT = "\x1B\x40";
    const CUT_PAPER = "\x1D\x56\x00";
    const ESC_ALIGN_CENTER = "\x1B\x61\x01";
    const ESC_ALIGN_LEFT = "\x1B\x61\x00";
    const ESC_FONT_SIZE_LARGE = "\x1D\x21\x11";
    const ESC_FONT_SIZE_NORMAL = "\x1D\x21\x00";
    const ESC_STATUS = "\x1B\x76"; // Get printer status
    const totalWidth = 46;

    // Judul Besar di Tengah
    let message = ESC_INIT;
    message +=
      ESC_ALIGN_CENTER +
      ESC_FONT_SIZE_LARGE +
      "BUKTI PEMBAYARAN\n\n" +
      ESC_FONT_SIZE_NORMAL;
    message += "-".repeat(45) + "\n";
    message += ESC_FONT_SIZE_NORMAL + "LUNAS\n";
    message += "-".repeat(45) + "\n";

    if (!isFirstTime) {
      message += ESC_FONT_SIZE_NORMAL + "THIS IS A COPY\n";
      message += "-".repeat(45) + "\n";
    }

    //converted tanggalBayar
    let tanggalBayarStr = "";
    if (tanggalBayar) {
      tanggalBayarStr = exactTimeFormatterReadable(tanggalBayar);
    }
    let infoBill = "";
    // Format informasi dengan spasi dinamis
    infoBill +=
      `${printerFormatter.formatWithSpace("Ext doc", _id)}\n` +
      `${printerFormatter.formatWithSpace(
        "Waktu Pembayaran",
        tanggalBayarStr || time,
      )}\n` +
      `${printerFormatter.formatWithSpace("Waktu Print", time)}\n` +
      `${printerFormatter.formatWithSpace(
        "Nama Customer",
        customer?.name || "",
      )}\n` +
      `${printerFormatter.formatWithSpace("Kasir", salesPerson)}\n` +
      `${printerFormatter.formatWithSpace("Spg", spg?.name || "")}\n` +
      `${printerFormatter.formatWithSpace(
        "Payment Method",
        paymentMethod || "",
      )}\n`;

    if (nomorTransaksi) {
      infoBill += `${printerFormatter.formatWithSpace(
        "Nomor Transaksi",
        nomorTransaksi,
      )}\n`;
    }
    message += infoBill;
    message += "\n";

    // Judul Daftar Item di Tengah
    message += ESC_FONT_SIZE_NORMAL;
    message += "-".repeat(45) + "\n";
    message +=
      ESC_ALIGN_CENTER +
      ESC_FONT_SIZE_LARGE +
      "DAFTAR ITEM\n\n" +
      ESC_FONT_SIZE_NORMAL;

    // Menambahkan item ke pesan print
    message += ESC_ALIGN_LEFT;
    currentBill.forEach((item) => {
      const left = item?.sku;
      const middle = `x ${item?.quantity}`;
      const right = `Rp ${item.totalRp.toLocaleString("id-ID")}`;

      message += item?.description + "\n";
      message += printerFormatter.formatColumns(left, middle, right) + "\n";

      // Menambahkan diskon terkait
      const relatedDiskons =
        diskons?.filter((d) => d.description === item.description) || [];
      relatedDiskons.forEach((diskon) => {
        const potongan = diskon?.diskonInfo.RpPotonganHarga
          ? `${diskon.diskonInfo.RpPotonganHarga}`
          : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
        message +=
          printerFormatter.formatColumns(
            "\tPotongan Diskon",
            "",
            formatCurrency(potongan),
          ) + "\n";
      });

      // Menambahkan promo terkait
      const relatedPromos =
        promos?.filter((p) => p.description === item.description) || [];
      relatedPromos.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
      });

      // Menambahkan future vouchers
      const relatedVouchers =
        futureVouchers?.filter((v) => v.description === item.description) || [];
      relatedVouchers.forEach((voucher) => {
        const potongan = voucher.voucherInfo.potongan;
        message +=
          printerFormatter.formatColumns(
            "\tVoucher (NEXT TIME)",
            "",
            `Rp ${potongan.toLocaleString("id-ID")}`,
          ) + "\n";

        const tanggal = new Date(
          voucher.voucherInfo.berlakuHingga,
        ).toLocaleDateString();
        message +=
          printerFormatter.formatColumns(
            "\tVoucher Berlaku hingga",
            "",
            tanggal,
          ) + "\n";
      });
    });

    // print promo simple_total
    message += ESC_ALIGN_CENTER;
    const simplePromos = promos?.filter((p) => p.promoInfo?.kategori) || [];
    if (simplePromos?.length) {
      message += "-".repeat(45) + "\n";
      message += "BONUS PROMO (keseluruhan)\n";
      simplePromos.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
      });
    }

    // Menambahkan subtotal dan total dengan spasi dinamis
    message += ESC_ALIGN_CENTER;
    message += "-".repeat(45) + "\n";
    message += ESC_ALIGN_LEFT;

    message += "\n";
    message += printerFormatter.formatColumns(
      "SUBTOTAL",
      "",
      `Rp ${subTotal.toLocaleString("id-ID")}`,
    );
    message += "\n";
    message += printerFormatter.formatColumns(
      "TOTAL",
      "",
      `Rp ${total.toLocaleString("id-ID")}`,
    );
    message += "\n";

    // Footer dengan terpusat
    message += ESC_ALIGN_CENTER;
    message += "-".repeat(totalWidth) + "\n";
    message += "Terimakasih atas pembelian!\n";
    message += "-".repeat(totalWidth) + "\n";

    //footer
    message += ESC_ALIGN_LEFT;
    message += ESC_FONT_SIZE_NORMAL;
    message += "\n";
    if (futureVouchers?.length > 0) {
      message +=
        "Catatan: future Voucher berlaku dipembelian selanjunya, 5 karakter kode voucher telah/akan dikirim ke email anda";
      message += "\n";
      message += "-".repeat(totalWidth) + "\n";
    }
    if (outlet?.namaPerusahaan) {
      message += "Nama perusahaan: " + outlet?.namaPerusahaan || "";
      message += "\n";
      message += "NPWP: " + outlet?.npwp || "";
      message += "\n";
      message += "Alamat: " + "\n" + outlet?.alamat || "";
      message += "\n";
      message += "-".repeat(totalWidth);
    }
    message += "\n\n\n\n\n";
    message += CUT_PAPER;

    //------------------END---------------------

    if (environment == "development") {
      console.log("PRINT CETAK KWITANSI HASIL : \n", message);
      resolve(true);
      return true;
    }
    let isDataSent = false;
    let isPrinterReady = false;
    let client = null;

    try {
      client = TcpSocket.createConnection(
        {
          port: portPrinter || 9100,
          host: ipPrinter,
          timeout: 10000, // 10 detik timeout
        },
        () => {
          // Cek status printer terlebih dahulu
          client.write(ESC_STATUS, "ascii");

          // Tunggu sebentar untuk memastikan printer siap
          setTimeout(() => {
            if (isPrinterReady && client) {
              client.write(message, "ascii", (err) => {
                if (err) {
                  if (client) {
                    client.destroy();
                  }
                  reject({
                    status: "Failed",
                    message: `Gagal mengirim data ke printer: ${err.message}`,
                  });
                  return;
                }
                isDataSent = true;

                // Tunggu sebentar untuk memastikan data terkirim
                setTimeout(() => {
                  if (client) {
                    client.destroy();
                  }
                  if (isDataSent) {
                    resolve(true);
                  } else {
                    reject({
                      status: "Failed",
                      message: "Data tidak terkirim ke printer",
                    });
                  }
                }, 1000);
              });
            } else {
              if (client) {
                client.destroy();
              }
              reject({
                status: "Failed",
                message: "Printer tidak siap",
              });
            }
          }, 500);
        },
      );

      // Set connection timeout
      client.setTimeout(10000, () => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: "Koneksi ke printer timeout",
        });
      });

      client.on("error", () => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Gagal connect ke printer`,
        });
      });

      client.on("data", (data) => {
        // Cek status printer dari response
        const status = data[0];
        if (status === 0) {
          isPrinterReady = true;
        } else {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Printer dalam status error",
          });
        }
      });

      client.on("close", () => {
        if (!isDataSent) {
          reject({
            status: "Failed",
            message: "Koneksi printer terputus sebelum data terkirim",
          });
        }
      });
    } catch (error) {
      if (client) {
        client.destroy();
      }
      reject({
        status: "Failed",
        message: `Terjadi kesalahan: ${error.message}`,
      });
    }
  });
};

//untuk mencetak bill helper
export const printCetakHelper = async (
  _id,
  config,
  items,
  promo,
  catatans,
  time,
) => {
  const { ipPrinter, portPrinter } = config;

  return new Promise((resolve, reject) => {
    // Setup printer configuration
    const ESC_INIT = printerFormatter.ESC_INIT;
    const CUT_PAPER = printerFormatter.CUT_PAPER;
    const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
    const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
    const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
    const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
    const ESC_STATUS = "\x1B\x76"; // Get printer status
    const totalWidth = printerFormatter.totalWidth;

    // Initialize message
    let message = ESC_INIT;
    message += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE;
    message += "STRUK PENGAMBILAN\n\n";
    message += ESC_FONT_SIZE_NORMAL;
    message += ESC_ALIGN_LEFT;
    message += `Ext Doc: ${_id}\n`;
    message += `Waktu Print: ${time}\n`;
    message += "-".repeat(totalWidth) + "\n";

    // Helper function to format item lines
    const formatColumns = (left, right, paperWidth = totalWidth) => {
      left = String(left).trim();
      right = String(right).trim();

      const leftWidth = Math.floor(paperWidth * 0.7);
      const rightWidth = Math.floor(paperWidth * 0.3);

      left =
        left.length > leftWidth
          ? left.substring(0, leftWidth - 1) + "..."
          : left.padEnd(leftWidth);
      right = right.padStart(rightWidth);

      return `${left}${right}`;
    };

    // Print items
    items.forEach((item) => {
      const sku = item?.sku || "";
      const quantity = item?.quantity || 0;
      message += formatColumns(sku, `x${quantity}`) + "\n";
    });

    message += "-".repeat(totalWidth) + "\n";

    const promosParticular = [];
    const promosTotal = [];

    promo.forEach((promo) => {
      if (promo?.promoInfo?.kategori) {
        promosTotal.push(promo);
      } else {
        promosParticular.push(promo);
      }
    });

    if (promosParticular?.length) {
      // print promo simple_total
      message += "-".repeat(45) + "\n";
      message += ESC_ALIGN_CENTER;

      message += "PROMO (particular)\n";
      promosParticular.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
      });
    }

    if (promosTotal?.length) {
      // print promo simple_total
      message += "-".repeat(45) + "\n";
      message += ESC_ALIGN_CENTER;

      message += "PROMO (keseluruhan)\n";
      promosTotal.forEach((promo) => {
        const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
        message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
      });
    }

    // Print catatan
    message += ESC_ALIGN_LEFT;
    message += "Catatan:\n";
    if (catatans && catatans?.length > 0) {
      catatans?.forEach((cat) => {
        message += `${cat.sku}\n`;
        message += `   ${cat.catatan}\n`;
      });
    } else {
      message += "--\n";
    }

    message += "\n\n\n\n\n";
    message += CUT_PAPER;

    if (environment == "development") {
      console.log("PRINT CETAK HELPER HASIL : \n", message);
      resolve(true);
      return true;
    }

    let isDataSent = false;
    let isPrinterReady = false;
    let client = null;

    try {
      client = TcpSocket.createConnection(
        {
          port: portPrinter || 9100,
          host: ipPrinter,
          timeout: 10000, // 10 detik timeout
        },
        () => {
          // Cek status printer terlebih dahulu
          client.write(ESC_STATUS, "ascii");

          // Tunggu sebentar untuk memastikan printer siap
          setTimeout(() => {
            if (isPrinterReady && client) {
              client.write(message, "ascii", (err) => {
                if (err) {
                  if (client) {
                    client.destroy();
                  }
                  reject({
                    status: "Failed",
                    message: `Gagal mengirim data ke printer: ${err.message}`,
                  });
                  return;
                }
                isDataSent = true;

                // Tunggu sebentar untuk memastikan data terkirim
                setTimeout(() => {
                  if (client) {
                    client.destroy();
                  }
                  if (isDataSent) {
                    resolve(true);
                  } else {
                    reject({
                      status: "Failed",
                      message: "Data tidak terkirim ke printer",
                    });
                  }
                }, 1000);
              });
            } else {
              if (client) {
                client.destroy();
              }
              reject({
                status: "Failed",
                message: "Printer tidak siap",
              });
            }
          }, 500);
        },
      );

      // Set connection timeout
      client.setTimeout(10000, () => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: "Koneksi ke printer timeout",
        });
      });

      client.on("error", (error) => {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Gagal connect ke printer`,
        });
      });

      client.on("data", (data) => {
        // Cek status printer dari response
        const status = data[0];
        if (status === 0) {
          isPrinterReady = true;
        } else {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Printer dalam status error",
          });
        }
      });

      client.on("close", () => {
        if (!isDataSent) {
          reject({
            status: "Failed",
            message: "Koneksi printer terputus sebelum data terkirim",
          });
        }
      });
    } catch (error) {
      if (client) {
        client.destroy();
      }
      reject({
        status: "Failed",
        message: `Terjadi kesalahan: ${error.message}`,
      });
    }
  });
};

const getDefaultPrinterConfig = async () => {
  const normalizePrinterConfig = (config) => ({
    ...config,
    ipPrinter: config?.ipPrinter || "",
    tipePrinter: config?.tipePrinter || "",
    portPrinter: String(config?.portPrinter || config?.port || ""),
  });

  const raw = await AsyncStorage.getItem("printerConfigs");
  if (raw) {
    try {
      const multiConfig = JSON.parse(raw);
      const defaultConfig =
        multiConfig?.find((config) => config.isDefault) ||
        multiConfig?.[0] ||
        null;

      if (defaultConfig) {
        return normalizePrinterConfig(defaultConfig);
      }
    } catch (error) {
      console.log("Gagal membaca printer configs lokal", error);
    }
  }

  try {
    const printers = await getPrinterConfigs();
    if (!printers.length) {
      return null;
    }

    const normalizedPrinters = printers.map((printer) =>
      normalizePrinterConfig(printer),
    );
    const defaultIndex =
      normalizedPrinters.findIndex((printer) => printer.isDefault) >= 0
        ? normalizedPrinters.findIndex((printer) => printer.isDefault)
        : 0;

    const printersToStore = normalizedPrinters.map((printer, index) => ({
      ...printer,
      isDefault: index === defaultIndex,
    }));

    await AsyncStorage.setItem(
      "printerConfigs",
      JSON.stringify(printersToStore),
    );

    return printersToStore[defaultIndex];
  } catch (error) {
    console.log("Gagal mengambil printer configs dari server", error);
    return null;
  }
};

const sendRawPrintMessage = (config, message) => {
  const { ipPrinter, portPrinter } = config;
  const ESC_STATUS = "\x1B\x76";

  return new Promise((resolve, reject) => {
    let isDataSent = false;
    let isPrinterReady = false;
    let client = null;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    try {
      client = TcpSocket.createConnection(
        {
          port: portPrinter || 9100,
          host: ipPrinter,
          timeout: 10000,
        },
        () => {
          client.write(ESC_STATUS, "ascii");

          setTimeout(() => {
            if (isPrinterReady && client) {
              client.write(message, "ascii", (err) => {
                if (err) {
                  if (client) client.destroy();
                  finish(
                    reject,
                    new Error(`Gagal mengirim data ke printer: ${err.message}`),
                  );
                  return;
                }
                isDataSent = true;

                setTimeout(() => {
                  if (client) client.destroy();
                  finish(resolve, true);
                }, 1000);
              });
            } else {
              if (client) client.destroy();
              finish(reject, new Error("Printer tidak siap"));
            }
          }, 500);
        },
      );

      client.setTimeout(10000, () => {
        if (client) client.destroy();
        finish(reject, new Error("Koneksi ke printer timeout"));
      });

      client.on("error", () => {
        if (client) client.destroy();
        finish(reject, new Error("Gagal connect ke printer"));
      });

      client.on("data", (data) => {
        const status = data[0];
        if (status === 0) {
          isPrinterReady = true;
        } else {
          if (client) client.destroy();
          finish(reject, new Error("Printer dalam status error"));
        }
      });

      client.on("close", () => {
        if (!isDataSent) {
          finish(
            reject,
            new Error("Koneksi printer terputus sebelum data terkirim"),
          );
        }
      });
    } catch (error) {
      if (client) client.destroy();
      finish(reject, error);
    }
  });
};

export const printSettlement = async ({
  totals,
  totalAmount,
  outletName,
  settlementDate,
}) => {
  const config = await getDefaultPrinterConfig();
  if (!config?.tipePrinter || !config?.ipPrinter || !config?.portPrinter) {
    throw new Error("Config printer belum lengkap");
  }

  // Print
  const ESC_INIT = printerFormatter.ESC_INIT;
  const CUT_PAPER = printerFormatter.CUT_PAPER;
  const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
  const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
  const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
  const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
  const totalWidth = printerFormatter.totalWidth;

  let printMessage = ESC_INIT;
  printMessage +=
    ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + "SETTLEMENT" + "\n\n";
  printMessage += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + outletName + "\n\n";
  printMessage += ESC_FONT_SIZE_NORMAL + "-".repeat(totalWidth) + "\n";
  printMessage += `Tanggal Settlement: ${settlementDate}\n`;
  printMessage += "Metode Pembayaran dan Total\n";
  printMessage += "-".repeat(totalWidth) + "\n\n";
  printMessage += ESC_ALIGN_LEFT;

  printerFormatter.formatColumns("Metode Pembayaran", "", "Total");
  totals.forEach((item) => {
    const paymentMethod = item?._id ?? "UNKNOWN";

    printMessage += printerFormatter.formatColumns(
      paymentMethod,
      "",
      formatCurrency(item?.totalSales),
    );
    printMessage += "\n";
  });

  printMessage += "-".repeat(totalWidth) + "\n";

  printMessage += printerFormatter.formatColumns(
    "Total Keseluruhan",
    "",
    formatCurrency(totalAmount),
  );
  printMessage += "\n\n\n\n\n";
  printMessage += CUT_PAPER;

  if (environment == "development") {
    return true;
  }

  return sendRawPrintMessage(config, printMessage);
};

//untuk mencetak end of day (pengelompokan total quantity dan harga hari ini pada outlet)
export const printCetakEOD = async ({
  totals,
  totalAmount,
  outletName,
  date,
}) => {
  const config = await getDefaultPrinterConfig();
  if (!config?.tipePrinter || !config?.ipPrinter || !config?.portPrinter) {
    throw new Error("Config printer belum lengkap");
  }

  // Format currency
  const formatCurrency = (amount) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  // Print
  const ESC_INIT = printerFormatter.ESC_INIT;
  const CUT_PAPER = printerFormatter.CUT_PAPER;
  const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
  const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
  const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
  const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
  const totalWidth = printerFormatter.totalWidth;

  let printMessage = ESC_INIT;
  printMessage +=
    ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + "END OF DAY" + "\n\n";
  printMessage += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + outletName + "\n\n";
  printMessage += ESC_FONT_SIZE_NORMAL + "-".repeat(totalWidth) + "\n";
  printMessage += `End of Day: ${date}\n`;
  printMessage += "SKU Grouping by today\n";
  printMessage += "-".repeat(totalWidth) + "\n\n";
  printMessage += ESC_ALIGN_LEFT;

  printMessage += printerFormatter.formatColumns("SKU", "QTY", "SALE");
  printMessage += "\n";

  totals.forEach((item) => {
    const sku = item?._id ?? "?sku?";

    printMessage += printerFormatter.formatColumns(
      sku,
      item?.totalQuantity ? item.totalQuantity : "-",
      item?.totalSales ? item.totalSales : "-",
    );
    printMessage += "\n";
  });

  const totalAmountQuantity = totals.reduce(
    (acc, item) => acc + (item?.totalQuantity || 0),
    0,
  );

  printMessage += "-".repeat(totalWidth) + "\n";
  printMessage += printerFormatter.formatColumns(
    "Total Keseluruhan",
    totalAmountQuantity ? totalAmountQuantity : "-",
    formatCurrency(totalAmount),
  );
  printMessage += "\n\n\n\n\n";
  printMessage += CUT_PAPER;

  if (environment == "development") {
    return true;
  }

  return sendRawPrintMessage(config, printMessage);
};
export const deleteFromKirimNanti = async (_id) => {
  try {
    const kirimNantiBill = JSON.parse(
      await AsyncStorage.getItem("kirimNantiKwitansi"),
    );
    const updatedKirimNantiBill = kirimNantiBill.filter(
      (item) => item._id !== _id,
    );
    await AsyncStorage.setItem(
      "kirimNantiKwitansi",
      JSON.stringify(updatedKirimNantiBill),
    );
  } catch (error) {
    console.log("gagal menghapus dari kirim nanti", error);
  }
};

//multi bill
export const sendKwitansiViaEmail = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const billTersimpanOffline = JSON.parse(await AsyncStorage.getItem("bill"));
    //filter yg belum terkirim saja
    if (!billTersimpanOffline?.length) {
      return;
    }
    const filteredBillTersimpanOffline = billTersimpanOffline?.filter(
      (item) => !item?.isPrintedKwitansi || item?.isPrintedKwitansi == false,
    );
    if (!filteredBillTersimpanOffline?.length) {
      console.log("tidak ada bill untuk dikirim via email");
      return;
    }
    await axios
      .post(
        `${await getBaseUrl()}/api/v1/kwitansi/sendKwitansiViaEmail`,
        filteredBillTersimpanOffline,
        {
          headers: {
            mobile: `Bearer ${token}`,
          },
        },
      )
      .then((response) => {})
      .catch((error) => {
        console.log(error);
        Platform.OS == "android" &&
          ToastAndroid?.show(
            "error di sendKwitansiViaEmail",
            ToastAndroid.SHORT,
          );
      });
    Platform.OS == "android" &&
      ToastAndroid?.show(response?.data?.message, ToastAndroid.SHORT);
  } catch (error) {
    console.log(error);
    Platform.OS == "android" &&
      ToastAndroid?.show("error di sendKwitansiViaEmail", ToastAndroid.SHORT);
  }
};

export const getAllSpg = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/spg/spgList/mobile`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getAllBill = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/invoice/getAllInvoice`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getAllCustomer = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/customer/getAllCustomer`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getCustomerList = async () => {
  const customer = JSON.parse(await AsyncStorage.getItem("customer"));
  return customer;
};

export const deleteCustomer = async (custToDel, customerList) => {
  const newOrder = customerList.filter((cust) => {
    return cust.name !== custToDel.name;
  });

  await AsyncStorage.setItem("customer", JSON.stringify(newOrder));
  return true;
};

export const getIsEnabledFitur = async () => {
  const response = JSON.parse(await AsyncStorage.getItem("fiturEnabled"));
  return response;
};

export const getOuletByUserId = async (userId) => {
  const token = await AsyncStorage.getItem("token");
  try {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/outlet/getOutlet/${userId}`,
      {
        headers: {
          mobile: `Bearer ${token}`,
        },
      },
    );
    return response?.data;
  } catch (error) {
    return error?.response?.data?.message;
  }
};

export const getThumbnail = async (itemId) => {
  const token = await AsyncStorage.getItem("token");
  const baseUrl = await getBaseUrl();
  const id = itemId?.$oid ?? itemId;
  try {
    const response = await axios.get(`${baseUrl}/api/v1/thumbnail/get/${id}`, {
      headers: {
        mobile: `Bearer ${token}`,
      },
    });
    return response?.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message);
  }
};

export const extractThumbnailBase64 = (response) => {
  if (!response) return null;
  if (typeof response === "string") return response;
  return (
    response?.data?.base64 ??
    response?.base64 ??
    response?.data?.data?.base64 ??
    (typeof response?.data === "string" ? response.data : null) ??
    null
  );
};

//test URL BASE
export const pingBackend = async (BE) => {
  try {
    console.log(BE);
    const response = await axios.get(`${BE}/api/v1/ping`);
    return response?.status === 200;
  } catch (error) {
    console.error("Ping error:", error);
    return false;
  }
};

export const getisOnline = async () => {
  const response = await axios.get(`${await getBaseUrl()}/api/v1/ping`);
  const isOnline = response?.data?.online ? true : false;
  return isOnline;
};

//offline search
export const searchInventoriesOffline = async (q) => {
  const inventoriOffline = JSON.parse(
    await AsyncStorage.getItem("inventories"),
  );
  if (!inventoriOffline) {
    ToastAndroid?.show("tidak ada inventories offline", ToastAndroid.SHORT);
  } else {
    const filteredInventoriesOffline = inventoriOffline?.filter((item) =>
      item?.sku?.toLowerCase().includes(q?.toLowerCase()),
    );
    if (!filteredInventoriesOffline?.length) {
      ToastAndroid?.show("tidak ada inventories offline", ToastAndroid.SHORT);
    } else {
      return filteredInventoriesOffline;
    }
  }
};

export const login = async (username, password) => {
  try {
    const body = {
      username,
      password,
    };

    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/auth/loginMobile`,
      body,
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        throw new Error("Username atau password salah");
      } else if (error.response.status === 404) {
        throw new Error(
          "Server tidak ditemukan. Periksa koneksi atau URL server",
        );
      } else {
        throw new Error(
          error.response.data?.message || "Terjadi kesalahan saat login",
        );
      }
    } else if (error.request) {
      // Request was made but no response
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda",
      );
    } else {
      // Error in request setup
      throw new Error("Terjadi kesalahan saat memproses permintaan");
    }
  }
};

export const loginLdap = async (username, password) => {
  try {
    const body = {
      username,
      password,
    };

    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/auth/ldapMobile`,
      body,
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 400) {
        throw new Error(
          error.response.data?.message || "Username atau password LDAP salah",
        );
      } else if (error.response.status === 404) {
        throw new Error(
          "Server tidak ditemukan. Periksa koneksi atau URL server",
        );
      } else {
        throw new Error(
          error.response.data?.message || "Terjadi kesalahan saat login LDAP",
        );
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda",
      );
    } else {
      throw new Error("Terjadi kesalahan saat memproses permintaan");
    }
  }
};

export const getUserInfo = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/auth/getUserInfo`,
      {
        headers: { mobile: `Bearer ${token}` },
      },
    );
    return response?.data;
  } catch (error) {
    console.log(
      error,
      "Error getUserInfo, gagal mendapatkan userInfo maak login ulang",
    );
  }
};

export const voucherRedeem = async (voucherCode, outletId) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.post(
    `${await getBaseUrl()}/api/v1/voucher/privateVoucherRedemption`,
    {
      voucherCode,
      outletId,
    },
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const getPaymentMethodRanking = async (params) => {
  const token = await AsyncStorage.getItem("token");
  const baseUrl = await getBaseUrl();
  const response = await axios.get(
    `${baseUrl}/api/v1/dashboard/rangking-payment-method`,
    {
      params,
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const endOfDayBySku = async (params) => {
  const token = await AsyncStorage.getItem("token");
  const baseUrl = await getBaseUrl();
  const response = await axios.get(
    `${baseUrl}/api/v1/dashboard/end-of-day-by-sku`,
    {
      params,
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};
