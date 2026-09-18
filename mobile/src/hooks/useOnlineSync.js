import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getisOnline,
  getOuletByUserId,
  syncronizeOfflineMode,
} from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import {
  useInventoriesOffline,
  useDiskonOffline,
  usePromoOffline,
  useVoucherOffline,
  useOutlet,
} from "../store";
import useAccount from "./useAccount";
import { filterVisibleInventories } from "../utils/inventoryFilters";
import { getLocalOutletMode } from "../utils/reconcileOutletSession";

export const useOnlineSync = () => {
  const queryClient = useQueryClient();
  const { setInventoriesOffline, inventoriesOffline } = useInventoriesOffline();
  const { setDiskonOffline } = useDiskonOffline();
  const { setPromoOffline } = usePromoOffline();
  const { setVoucherOffline } = useVoucherOffline();

  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  const { data: isOnline = false } = useQuery({
    queryKey: ["ping"],
    queryFn: async () => {
      try {
        return await getisOnline();
      } catch (error) {
        console.error("Failed to fetch online status:", error);
        return false;
      }
    },
    refetchInterval: 8000,
  });
  
  const { logoutNoSync } = useAccount();

  const { mutateAsync: handleSinkronisasi, isPending: isPendingSinkronisasi } =
    useMutation({
      mutationFn: async () => {
        try {
          const res = await syncronizeOfflineMode(isOnline);
          return res;
        } catch (error) {
          if (Platform.OS === "android" || Platform.OS === "ios") {
            if (error?.response?.data?.hint === "perbedaan data login") {
              Alert.alert(
                "Konfirmasi",
                "Outlet tidak cocok. Kamu perlu logout dan login ulang, konfirmasi?",
                [
                  {
                    text: "Batal",
                    style: "cancel",
                    onPress: () => {}, 
                  },
                  {
                    text: "Ya, Logout",
                    onPress: async () => {
                      console.log("Akan keluar karena data sangat berbeda");
                      await logoutNoSync();
                    },
                  },
                ],
                { cancelable: false }
              );
            } else {
              Alert.alert(
                "Kesalahan",
                error?.response?.data?.message ||
                  "Terjadi kesalahan sinkronisasi"
              );
            }
          } else if (Platform.OS === "web") {
            if (error?.response?.data?.hint === "perbedaan data login") {
              const yesLogout = window.confirm(
                "Outlet Tidak cocok. Kamu perlu logout dan login ulang, konfirmasi?"
              );
              if (yesLogout) {
                console.log("Akan keluar karena data sangat berbeda");
                await logoutNoSync();
              } else {
                return;
              }
            } else {
              alert(
                error?.response?.data?.message ||
                  "kegagalan sinkronisasi di web"
              );
            }
          } else {
            console.log(error);
          }
        }
      },
      onSuccess: async (data) => {
        if (!data) {
          return;
        }

        const {
          newDiskonData,
          newPromoData,
          newVoucherData,
          newInventoryData,
          newSpgsData,
          newCustomerData,
          newBillData,
          newOutletData,
          newUserInfoData,
          favoritedInventorySkus,
          removedInventorySkus,
        } = data;

        //update hasil sinkronisasi userInfo
        if (newUserInfoData) {
          await AsyncStorage.setItem(
            "userInfo",
            JSON.stringify(newUserInfoData)
          );
          setTimeout(async () => {
            await queryClient.invalidateQueries(["userInfo"]);
          }, 0);
        }

        //update hasil sinkronisasi outlet — prefer DB currentOutlet
        let outletToSave = newOutletData;
        try {
          const userInfoStr = await AsyncStorage.getItem("userInfo");
          const uid = userInfoStr ? JSON.parse(userInfoStr)?._id : null;
          if (uid) {
            const fresh = await getOuletByUserId(uid);
            if (fresh?.data) outletToSave = fresh.data;
          }
        } catch (_) {}

        if (outletToSave) {
          try {
            outletToSave.pendapatanFromApp = 0;
            outletToSave.terakhirSync = new Date().toISOString();

            await AsyncStorage.setItem(
              "outlet",
              JSON.stringify(outletToSave),
            );
            useOutlet.getState().setOutlet(outletToSave);
            setTimeout(async () => {
              await queryClient.invalidateQueries(["outlet"]);
            }, 0);
          } catch (error) {
            console.error("Error saving outlet data:", error);
            ToastAndroid?.show(
              "Gagal menyimpan data outlet",
              ToastAndroid.SHORT,
            );
          }
        }

        let finaleResult = [];

        const storageRaw = await AsyncStorage.getItem("inventories");
        const storageInventories = storageRaw ? JSON.parse(storageRaw) : [];
        const removedSkus = removedInventorySkus ?? [];

        const baseInventories =
          storageInventories?.length > 0
            ? storageInventories
            : inventoriesOffline || [];

        if (!newInventoryData || newInventoryData.length === 0) {
          finaleResult = baseInventories;
        } else {
          const mergedMap = new Map();

          baseInventories.forEach((item) => {
            if (item?._id) mergedMap.set(item._id, item);
          });

          newInventoryData.forEach((newItem) => {
            if (!newItem?._id) return;
            const oldItem = mergedMap.get(newItem._id);
            mergedMap.set(
              newItem._id,
              oldItem ? { ...oldItem, ...newItem } : newItem
            );
          });

          finaleResult = Array.from(mergedMap.values());
        }

        finaleResult = filterVisibleInventories(finaleResult, removedSkus);

        await AsyncStorage.setItem(
          "removedInventorySkus",
          JSON.stringify(removedSkus)
        );

        // Set offline
        await setInventoriesOffline(finaleResult)
          .then(async () => {
            await AsyncStorage.setItem(
              "lastInventoryUpdate",
              Date.now().toString()
            );
            setTimeout(async () => {
              await queryClient.invalidateQueries(["inventories"]);
            }, 0);
          })
          .catch((err) => {
            console.log(err);
            ToastAndroid?.show(
              "Terjadi kesalahan saat sync inventories",
              ToastAndroid.SHORT
            );
          });

        await AsyncStorage.setItem(
          "favoritedInventorySkus",
          JSON.stringify(favoritedInventorySkus ?? [])
        );
        setTimeout(async () => {
          await queryClient.invalidateQueries(["favoritedInventorySkus"]);
        }, 0);

        //update hasil sinkronisasi diskon
        if (newDiskonData) {
          await setDiskonOffline(newDiskonData)
            .then(async () => {
              console.log("berhasil sinkronisasi diskon");
              setTimeout(async () => {
                await queryClient.invalidateQueries(["diskon"]);
              }, 0);
            })
            .catch(console.log);
        }

        //update hasil sinkronisasi promo
        if (newPromoData) {
          await setPromoOffline(newPromoData)
            .then(async () => {
              console.log("berhasil sinkronisasi promo");
              setTimeout(async () => {
                await queryClient.invalidateQueries(["promo"]);
              }, 0);
            })
            .catch(console.log);
        }

        //update hasil sinkronisasi voucher
        if (newVoucherData) {
          await setVoucherOffline(newVoucherData)
            .then(async () => {
              console.log("berhasil sinkronisasi voucher");
              setTimeout(async () => {
                await queryClient.invalidateQueries(["voucher"]);
              }, 0);
            })
            .catch((err) => {
              console.log(err);
              ToastAndroid?.show(
                "Terjadi kesalahan saat sync voucher",
                ToastAndroid.SHORT
              );
            });
        }

        //update hasil sinkronisasi spg
        if (newSpgsData?.length) {
          await AsyncStorage.setItem("spg", JSON.stringify(newSpgsData))
            .then(async () => {
              console.log("berhasil sinkronisasi spg");
              setTimeout(async () => {
                await queryClient.invalidateQueries(["spg"]);
              }, 0);
            })
            .catch(console.log);
        }

        //update hasil sinkronisasi customer
        if (newCustomerData) {
          // Filter out any empty customer objects before saving
          const validCustomers = newCustomerData.filter((customer) => {
            // Skip if customer is not an object or is empty
            if (
              !customer ||
              typeof customer !== "object" ||
              Object.keys(customer).length === 0
            ) {
              return false;
            }

            // Skip customers where all values are empty
            return Object.values(customer).some(
              (value) => value !== undefined && value !== null && value !== ""
            );
          });

          if (validCustomers.length > 0) {
            await AsyncStorage.setItem(
              "customer",
              JSON.stringify(validCustomers)
            )
              .then(async () => {
                console.log("berhasil sinkronisasi customer ✅");
                setTimeout(async () => {
                  await queryClient.invalidateQueries(["customer"]);
                }, 0);
              })
              .catch(console.log);
          }
        }

        //update hasil sinkronisasi bill
        if (newBillData) {
          try {
            const existingBillsStr = await AsyncStorage.getItem("bills");
            const existingBills = existingBillsStr
              ? JSON.parse(existingBillsStr)
              : [];

            const existingBillsMap = {};
            existingBills.forEach((bill) => {
              existingBillsMap[bill._id] = bill;
            });

            const mergedBills = newBillData.map((newBill) => {
              const existingBill = existingBillsMap[newBill._id];
              if (existingBill) {
                // Use a function to determine the correct value for boolean flags
                const getBooleanFlag = (serverVal, localVal) => {
                  // If either value is explicitly true, use true
                  return serverVal === true || localVal === true;
                };

                return {
                  ...newBill,
                  done: getBooleanFlag(newBill.done, existingBill.done),
                  isVoid: getBooleanFlag(newBill.isVoid, existingBill.isVoid),
                  isPrintedCustomerBilling: getBooleanFlag(
                    newBill.isPrintedCustomerBilling,
                    existingBill.isPrintedCustomerBilling
                  ),
                  isPrintedKwitansi: getBooleanFlag(
                    newBill.isPrintedKwitansi,
                    existingBill.isPrintedKwitansi
                  ),
                  paymentMethod:
                    existingBill.paymentMethod || newBill.paymentMethod,
                  customer: {
                    ...newBill.customer,
                    ...existingBill.customer,
                    name:
                      existingBill.customer?.name ||
                      newBill.customer?.name ||
                      "",
                    email:
                      existingBill.customer?.email ||
                      newBill.customer?.email ||
                      "",
                    phone:
                      existingBill.customer?.phone ||
                      newBill.customer?.phone ||
                      "",
                    jenisKelamin:
                      existingBill.customer?.jenisKelamin ||
                      newBill.customer?.jenisKelamin ||
                      "",
                    alamat:
                      existingBill.customer?.alamat ||
                      newBill.customer?.alamat ||
                      "",
                  },
                };
              }
              return newBill;
            });

            existingBills.forEach((existingBill) => {
              if (existingBill.isDeleted) {
                return;
              }
              if (!mergedBills.some((bill) => bill._id === existingBill._id)) {
                mergedBills.push(existingBill);
              }
            });

            await AsyncStorage.setItem("bills", JSON.stringify(mergedBills))
              .then(async () => {
                console.log(
                  "berhasil sinkronisasi bill (dengan status yang ada sebelumnya dipertahankan)"
                );
                setTimeout(async () => {
                  await queryClient.invalidateQueries(["bills"]);
                }, 0);
              })
              .catch((error) => {
                console.log("Error saving merged bills:", error);
                ToastAndroid?.show("Error saving bills", ToastAndroid.SHORT);
              });
          } catch (error) {
            console.log("Error processing bills:", error);
            ToastAndroid?.show("Error processing bills", ToastAndroid.SHORT);
          }
          ToastAndroid?.show("berhasil sinkronisasi", ToastAndroid.LONG);
        }

        //bersih bersih
        const billStorageStr = await AsyncStorage.getItem("bills");
        const billStorage = billStorageStr ? JSON.parse(billStorageStr) : [];
        const billStorageFilter = billStorage?.filter((bill) => {
          return bill?.isDeleted != true;
        });
        await AsyncStorage.setItem("bills", JSON.stringify(billStorageFilter));

        const currentTime = new Date().getTime();
        await AsyncStorage.setItem("lastSyncTime", currentTime.toString());
        setLastSyncTime(currentTime);
      },
    });

  const checkAutoSync = async () => {
    try {
      const mode = await getLocalOutletMode();
      // Stateless never uses sync-offline-mode dump loop
      if (mode === "stateless") {
        return;
      }

      const lastSyncTimeStr = await AsyncStorage.getItem("lastSyncTime");
      const lastSync = lastSyncTimeStr ? parseInt(lastSyncTimeStr) : null;
      setLastSyncTime(lastSync);

      const sinkronisasiIntervalStr = await AsyncStorage.getItem(
        "sinkronisasiInterval"
      );
      const sinkronisasiInterval = sinkronisasiIntervalStr
        ? parseInt(sinkronisasiIntervalStr)
        : 1;

      const currentTime = new Date().getTime();

      if (
        !lastSync ||
        currentTime - lastSync > sinkronisasiInterval * 60 * 60 * 1000
      ) {
        if (isOnline) {
          handleSinkronisasi();
        }
      }
    } catch (error) {
      console.error("Error checking auto sync:", error);
    }
  };

  useEffect(() => {
    checkAutoSync();
    const autoSyncCheckInterval = setInterval(checkAutoSync, 30 * 60000);

    return () => {
      clearInterval(autoSyncCheckInterval);
    };
  }, [isOnline, handleSinkronisasi]);

  return {
    isOnline,
    handleSinkronisasi,
    isPendingSinkronisasi,
    lastSyncTime,
  };
};
