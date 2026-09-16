import AsyncStorage from "@react-native-async-storage/async-storage";
import { ToastAndroid, Platform } from "react-native";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import {
  getAllDiskon,
  getAllPromo,
  getAllVouchers,
  getOuletByUserId,
  getAllSpg,
} from "../api";
import { getAllCustomer } from "./customer.api";
import { getAllBill } from "./billing.api";
import { initializePaymentMethod } from "./payment.api";


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
  
    // Get userInfo safely with proper error handling
    let userInfo;
    try {
      const userInfoStr = await AsyncStorage.getItem("userInfo");
      if (userInfoStr) {
        userInfo = JSON.parse(userInfoStr);
      } else {
        userInfo = null;
      }
    } catch (error) {
      await AsyncStorage.removeItem("userInfo");
      await AsyncStorage.removeItem("outlet");
      await AsyncStorage.removeItem("token");
      return;
    }
  
    if (!userInfo) {
      ToastAndroid?.show(
        "Gagal mengambil user, coba login ulang",
        ToastAndroid.SHORT,
      );
      return null;
    }
  
    // Always refresh outlet from server currentOutlet before sync decisions
    let updatedOutlet = null;
    try {
      const outletRes = await getOuletByUserId(userInfo._id);
      if (outletRes?.data) {
        updatedOutlet = outletRes.data;
        await AsyncStorage.setItem("outlet", JSON.stringify(updatedOutlet));
        const { useOutlet } = await import("./store");
        await useOutlet.getState().setOutlet(updatedOutlet);
      }
    } catch (error) {
      ToastAndroid?.show(
        "Gagal mengambil outlet, coba login ulang",
        ToastAndroid.SHORT,
      );
      return null;
    }
  
    if (!updatedOutlet) {
      try {
        const raw = await AsyncStorage.getItem("outlet");
        updatedOutlet = raw ? JSON.parse(raw) : null;
      } catch {
        updatedOutlet = null;
      }
    }
  
    // Stateless: no sync-offline-mode / inventory dump. Catalog is live.
    if (updatedOutlet?.mode === "stateless") {
      await AsyncStorage.setItem("inventories", JSON.stringify([]));
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Mode stateless: sync dump dilewati",
          ToastAndroid.SHORT,
        );
      }
      return {
        newOutletData: updatedOutlet,
        newUserInfoData: userInfo,
        newInventoryData: [],
        favoritedInventorySkus: [],
        removedInventorySkus: [],
      };
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
  
    const paymentMethod =
      (await AsyncStorage.getItem("paymentMethod")) &&
      (await AsyncStorage.getItem("paymentMethod")) != "undefined"
        ? JSON.parse(await AsyncStorage.getItem("paymentMethod"))
        : [];
  
    //jika terdapat lastSyncTime maka artinya inisialisasi, perlu ambil semua data dari db
    const lastSyncTime = await AsyncStorage.getItem("lastSyncTime");
  
    //----END 0f geting offline data need to be filled-----
  
    //to return
    const data = {};
  
    //jika tidak ada inventoriesOffline atau yang lain artinya, aplikasi belum ada data untuk itu, maka ambil model yang belum ada dari DB
    //jika inventoriesOffline  dari asyncstorage tidak ada maka artinya belum diinisialisasi
    if (!lastSyncTime || lastSyncTime == "null") {
  
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
      }
  
      //jika tidak ada Metode pembayaran di AsyncStorage maka ambil dari BE
      if (!paymentMethod?.length || !paymentMethod) {
        const paymentList = await initializePaymentMethod();
        if (!paymentList?.length) {
          console.log("tidak ditemukan apapun di metode pembayaran table");
        }
        await AsyncStorage.setItem("paymentMethod", JSON.stringify(paymentList));
      }
  
      //jika tidak ada outlet di AsyncStorage maka ambil dari BE
      // (updatedOutlet already refreshed from currentOutlet above; keep as newOutletData)
      if (updatedOutlet) {
        data.newOutletData = updatedOutlet;
      } else if (!updatedOutlet || updatedOutlet?.namaOutlet == "") {
        const token = await AsyncStorage.getItem("token");
        try {
          const response = await axios.get(
            `${await getBaseUrl()}/api/v1/outlet/getOutlet/${
              data?.newUserInfoData?._id || userInfo?._id
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
          data.newOutletData = null;
        }
      }
  
      //jika tidak ada inventories di AsyncStorage maka ambil dari BE
      // outlet.mode=stateless: jangan dump ke AsyncStorage — fetch partial langsung dari InventoryRefrensi
      const outletForMode = updatedOutlet || data.newOutletData;
      if (outletForMode?.mode === "stateless") {
        await AsyncStorage.setItem("inventories", JSON.stringify([]));
        data.newInventoryData = [];
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
            ToastAndroid?.show(
              "Memulai sinkronisasi inventories...",
              ToastAndroid.SHORT,
            );
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
              ToastAndroid?.show(
                `Sinkronisasi selesai: ${totalItems} item`,
                ToastAndroid.SHORT,
              );
            }
          } else {
            if (Platform.OS === "web") {
              ToastAndroid?.show(
                "Tidak ditemukan data inventories dari Database",
                ToastAndroid.SHORT,
              );
            } else {
              ToastAndroid?.show(
                "Tidak ditemukan data inventories dari Database",
                ToastAndroid.SHORT,
              );
            }
            return;
          }
        } catch (res) {
          Platform.OS === "web"
            ? ToastAndroid?.show(
                res?.response?.data?.message ||
                  "gagal inisialisasi inventories offline",
                ToastAndroid.SHORT,
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
        `${await getBaseUrl()}/api/v1/sinkronisasi/sync-offline-mode`,
        body,
        {
          headers: await getMobileAuthHeaders(),
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
        ToastAndroid?.show(response?.data?.message || "gagal sinkronisasi", ToastAndroid.SHORT);
      }
    }
  };