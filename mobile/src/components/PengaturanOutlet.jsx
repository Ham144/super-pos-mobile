import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOuletByUserId } from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Settings,
  Store,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  ImageIcon,
  LogOutIcon,
} from "lucide-react-native";
import { useOutlet } from "../store";
import {
  getOutletId,
  resetOutletScopedLocalData,
} from "../utils/reconcileOutletSession";
import useAccount from "../hooks/useAccount";
import { useOnlineSync } from "../hooks/useOnlineSync";
import { syncronizeOfflineMode } from "../api/synchronize";

const PengaturanOutlet = () => {
  const [userInfo, setUserInfo] = useState(null);

  // Check online status
  const queryClient = useQueryClient();
  const isOnline = queryClient.getQueryData(["ping"]);
  const { handleSinkronisasi } = useOnlineSync();

  //zustand
  const { setOutlet } = useOutlet();

  //hooks
  const { logoutNoSync } = useAccount();

  const {
    data: outletData,
    isPending,
    isError,
    refetch: refetchOutletData,
  } = useQuery({
    queryKey: ["outlet", userInfo?._id],
    queryFn: () => getOuletByUserId(userInfo?._id),
    enabled: !!userInfo?._id,
    throwOnError: true,
  });

  useEffect(() => {
    if (!outletData?.data) return;

    const syncOutletFromServer = async () => {
      const next = outletData.data;
      let prev = null;
      try {
        const raw = await AsyncStorage.getItem("outlet");
        prev = raw ? JSON.parse(raw) : null;
      } catch {
        prev = null;
      }

      const prevId = getOutletId(prev);
      const nextId = getOutletId(next);
      const changed = Boolean(prevId && nextId && prevId !== nextId);

      if (changed) {
        await resetOutletScopedLocalData();
      }

      await setOutlet(next);
    };

    syncOutletFromServer();
  }, [outletData?.data]);

  // Mutation for synchronizing data
  const { mutate: syncData, isPending: isSyncing } = useMutation({
    mutationFn: () => syncronizeOfflineMode(isOnline, userInfo),
    onSuccess: async (data) => {
      if (data?.outlet) {
        try {
          await AsyncStorage.setItem("outlet", JSON.stringify(data.outlet));
          ToastAndroid?.show(
            "Outlet berhasil disinkronisasi",
            ToastAndroid.SHORT,
          );
          refetchOutletData();
        } catch (error) {
          console.error("Error saving outlet data:", error);
          ToastAndroid?.show("Gagal menyimpan data outlet", ToastAndroid.SHORT);
        }
      } else {
        ToastAndroid?.show(
          "Tidak ada data outlet ditemukan",
          ToastAndroid.SHORT,
        );
      }
    },
    onError: (error) => {
      console.error("Sync error:", error);
      ToastAndroid?.show("Gagal melakukan sinkronisasi", ToastAndroid.SHORT);
    },
  });

  // Load user info from AsyncStorage
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfoStr = await AsyncStorage.getItem("userInfo");
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setUserInfo(userInfo);
        }
      } catch (error) {
        console.error("Error loading user info:", error);
        ToastAndroid?.show("Gagal memuat info pengguna", ToastAndroid.SHORT);
      }
    };
    loadUserInfo();
  }, []);

  // Check if outlet exists in AsyncStorage
  useEffect(() => {
    const checkOutlet = async () => {
      try {
        const outletStr = await AsyncStorage.getItem("outlet");
        if (!outletStr && isOnline && userInfo) {
          // If no outlet in storage and we're online, trigger sync
          syncData();
        }
      } catch (error) {
        console.error("Error checking outlet data:", error);
      }
    };
    checkOutlet();
  }, [userInfo, isOnline]);

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text
          className="text-red-500 text-center"
          style={{ fontFamily: "gilroyRegular" }}
        >
          Gagal memuat data outlet. Silakan coba lagi nanti.
        </Text>
        <TouchableOpacity
          onPress={refetchOutletData}
          className="mt-4 bg-blue-950 px-4 py-2 rounded-lg"
        >
          <Text className="text-white" style={{ fontFamily: "gilroyRegular" }}>
            Coba Lagi
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ zIndex: 40 }} className="absolute top-0 right-0 m-2">
        <View
          className={`px-3 py-1 rounded-lg flex-row items-center ${
            isOnline ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isOnline ? (
            <Wifi size={16} color="#ffffff" />
          ) : (
            <WifiOff size={16} color="#ffffff" />
          )}
          <Text
            className="text-white text-xs font-medium ml-1"
            style={{ fontFamily: "gilroyRegular" }}
          >
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <ScrollView>
        {/* User Info Section */}
        <View className="bg-white p-4 mb-4 rounded-lg mx-4 mt-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <User size={24} color="#4B5563" />
              <Text className="text-lg font-bold ml-2 text-gray-800">
                Informasi Pengguna
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Platform.OS === "android"
                  ? Alert.alert(
                      "Logout",
                      "Apakah anda yakin ingin logout dari device ini, sebelumnya akan dilakukan sinkronisasi, Konfirmasi?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Logout",
                          onPress: async () => {
                            try {
                              await handleSinkronisasi();
                              await logoutNoSync();
                            } catch (error) {
                              await logoutNoSync();
                            }
                          },
                        },
                      ],
                    )
                  : async () => {
                      try {
                        await handleSinkronisasi();
                        await logoutNoSync();
                      } catch (error) {
                        await logoutNoSync();
                      }
                    };
              }}
            >
              <LogOutIcon size={20} color="#2A4B8D" />
            </TouchableOpacity>
          </View>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Nama
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {userInfo?.username}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Target Harga Penjualan
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(userInfo?.targetHargaPenjualan || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Target Akumulasi Quantity Penjualan
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {userInfo?.targetQuantityPenjualan || "tidak ada target"}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Total Harga Penjualan
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(userInfo?.totalHargaPenjualan || "0")}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Total Quantity Penjualan
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {userInfo?.totalQuantityPenjualan}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-500"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Role Name
              </Text>
              <Text
                className="text-gray-900 font-medium"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {userInfo?.roleName}
              </Text>
            </View>
          </View>
        </View>

        {/* Outlet Info Section */}
        {isPending ? (
          <View className="bg-white p-6 mb-4 rounded-lg mx-4 shadow-sm items-center justify-center">
            <ActivityIndicator size="large" color="#2A4B8D" />
            <Text className="mt-2 text-gray-600">
              {isSyncing
                ? "Sinkronisasi data outlet..."
                : "Memuat data outlet..."}
            </Text>
          </View>
        ) : outletData?.data ? (
          <View className="bg-white p-4 mb-4 rounded-lg mx-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Store size={24} color="#4B5563" />
                <Text className="text-lg font-bold ml-2 text-gray-800">
                  Outlet
                </Text>
              </View>

              <View className="flex-row gap-x-3 items-center justify-end">
                {isOnline && (
                  <TouchableOpacity
                    onPress={() => syncData()}
                    className="bg-blue-100 p-2 rounded-full mr-3"
                  >
                    <RefreshCw size={20} color="#2A4B8D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Outlet Logo */}
            <View className="items-center mb-4">
              {outletData?.data?.logo ? (
                <Image
                  source={{
                    uri: outletData?.data?.logo.startsWith("data:")
                      ? outletData?.data?.logo
                      : `data:image/jpeg;base64,${outletData?.data?.logo}`,
                  }}
                  style={{
                    width: 150,
                    height: 150,
                    borderRadius: 75,
                    borderWidth: 2,
                    borderColor: "#E5E7EB",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="bg-gray-200 items-center justify-center rounded-full"
                  style={{ width: 150, height: 150 }}
                >
                  <ImageIcon size={50} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-2">
                    Logo tidak tersedia
                  </Text>
                </View>
              )}
              <Text className="text-lg font-semibold mt-2 text-center">
                {outletData?.data?.namaOutlet}
              </Text>
            </View>

            <View className="space-y-3">
              {outletData.data.namaPerusahaan && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500">Nama Perusahaan</Text>
                  <Text className="text-gray-900 font-medium">
                    {outletData?.data?.namaPerusahaan}
                  </Text>
                </View>
              )}
              {outletData.data.npwp && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500">NPWP</Text>
                  <Text className="text-gray-900 font-medium">
                    {outletData?.data?.npwp}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Nama Outlet
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {outletData?.data?.namaOutlet}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Alamat
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {outletData?.data?.alamat || outletData?.data?.description}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Deskripsi
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {outletData?.data?.description}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Kode Outlet
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {outletData?.data?.kodeOutlet}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Jumlah invoice
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {outletData?.data?.jumlahInvoice}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500">Pendapatan belum sinkron</Text>
                <Text className="text-gray-900 font-medium">
                  {Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(outletData?.data?.pendapatanFromApp || "0")}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Pendapatan
                </Text>
                <Text
                  className="text-gray-900 font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(outletData?.data?.pendapatan || "0")}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="bg-white p-4 mb-4 rounded-lg mx-4 shadow-sm">
            <Text className="text-gray-500 text-center">Outlet</Text>
            <Text className="text-gray-500 text-center mb-4">
              Tidak ada outlet tersambung untuk akun ini
            </Text>
            {isOnline && (
              <TouchableOpacity
                onPress={() => syncData()}
                className="bg-blue-950 p-3 rounded-lg flex-row justify-center items-center"
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <RefreshCw
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text className="text-white font-medium">
                  {isSyncing
                    ? "Sedang Sinkronisasi..."
                    : "Sinkronisasi Data Outlet"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Additional Settings Section */}
        <View className="bg-white p-4 mb-4 rounded-lg mx-4 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Settings size={24} color="#4B5563" />
            <Text className="text-lg font-bold ml-2 text-gray-800">
              Informasi lebih lanjut
            </Text>
          </View>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-500">Status</Text>
              <Text className="text-gray-900 font-medium">
                {outletData?.data?.status || "Aktif"}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-500">Tipe Outlet</Text>
              <Text className="text-gray-900 font-medium">
                {outletData?.data?.type || "Premium"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PengaturanOutlet;
