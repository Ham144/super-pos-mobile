import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  ToastAndroid,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useFiturEnabled, useSyncSetting } from "../store";

const PengaturanFitur = () => {
  const [sinkronisasiInterval, setSinkronisasiInterval] = useState("1");

  const {
    futureVoucherEnabled,
    setFutureVoucherEnabled,
    diskonEnabled,
    setDiskonEnabled,
    promoEnabled,
    setPromoEnabled,
  } = useFiturEnabled();

  const { autoSyncSetelahKwitansiPertama, setAutoSyncSetelahKwitansiPertama } =
    useSyncSetting();
  const [
    autoSyncSetelahKwitansiPertamaValue,
    setAutoSyncSetelahKwitansiPertamaValue,
  ] = useState(true);

  // Fungsi untuk menyimpan interval sinkronisasi
  const handleSaveSinkronisasiInterval = async () => {
    try {
      await AsyncStorage.setItem("sinkronisasiInterval", sinkronisasiInterval);
      ToastAndroid?.show(
        "Interval sinkronisasi berhasil disimpan",
        ToastAndroid.SHORT,
      );
    } catch (error) {
      console.error("Error saving sinkronisasi interval:", error);
      ToastAndroid?.show(
        "Gagal menyimpan interval sinkronisasi",
        ToastAndroid.SHORT,
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <Text className="text-3xl font-extrabold text-indigo-700 mb-8 text-center">
            Konfigurasi Fitur Aplikasi
          </Text>

          <View className="gap-y-5">
            {/* promo togle */}
            <View
              key={"promoEnabled"}
              className="flex  justify-between bg-indigo-50 p-5 rounded-md border border-indigo-200 shadow-sm"
            >
              <View className="flex-row justify-between items-center gap-x-2">
                <Text className="text-xl font-semibold text-indigo-800 capitalize">
                  Promo
                </Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={promoEnabled ? "#f4f3f4" : "#f4f3f4"}
                  value={promoEnabled}
                  onValueChange={() => setPromoEnabled(!promoEnabled)}
                />
              </View>
              <Text className="text-sm text-gray-500">
                Fitur ini digunakan untuk membuat transaksi dapat free bonus
                sesuai ketentuan promo
              </Text>
            </View>

            {/* diskon togle */}
            <View
              key={"diskonEnabled"}
              className="flex  justify-between bg-indigo-50 p-5 rounded-md border border-indigo-200 shadow-sm"
            >
              <View className="flex-row justify-between items-center gap-x-2">
                <Text className="text-xl font-semibold text-indigo-800 capitalize">
                  Diskon
                </Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={diskonEnabled ? "#f4f3f4" : "#f4f3f4"}
                  value={diskonEnabled}
                  onValueChange={() => setDiskonEnabled(!diskonEnabled)}
                />
              </View>
              <Text className="text-sm text-gray-500">
                Fitur ini digunakan untuk memberlakukan diskon sehingga harga
                jual akan terpotong sesuai ketentuan diskon
              </Text>
            </View>

            {/* voucher toggle */}
            <View
              key={"futureVoucherenabled"}
              className="flex  justify-between bg-indigo-50 p-5 rounded-md border border-indigo-200 shadow-sm"
            >
              <View className="flex-row justify-between items-center gap-x-2">
                <Text className="text-xl font-semibold text-indigo-800 capitalize">
                  Future Voucher
                </Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={futureVoucherEnabled ? "#f4f3f4" : "#f4f3f4"}
                  value={futureVoucherEnabled}
                  onValueChange={() =>
                    setFutureVoucherEnabled(!futureVoucherEnabled)
                  }
                />
              </View>
              <Text className="text-sm text-gray-500">
                Fitur ini digunakan untuk membuat generated voucher yang akan
                dikirim ke customer untuk digunakan di transaksi selanjutnya"
              </Text>
            </View>

            {/* Auto Sync Feature */}
            <View className="flex justify-between bg-indigo-50 p-5 rounded-md border border-indigo-200 shadow-sm">
              <View className="flex-row justify-between items-center gap-x-2">
                <Text className="text-xl font-semibold text-indigo-800">
                  Auto Sync Setelah Kwitansi Pertama
                </Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={
                    autoSyncSetelahKwitansiPertamaValue ? "#f4f3f4" : "#f4f3f4"
                  }
                  ios_backgroundColor="#3e3e3e"
                  value={autoSyncSetelahKwitansiPertamaValue}
                  onValueChange={(value) => {
                    setAutoSyncSetelahKwitansiPertamaValue(value);
                    setAutoSyncSetelahKwitansiPertama(value);
                  }}
                />
              </View>
              <Text className="text-sm text-gray-500">
                Fitur ini akan otomatis melakukan sinkronisasi setelah tombol
                kwitansi ditekan
              </Text>
            </View>
          </View>

          <Text className="mt-6 text-sm text-gray-500 italic text-center">
            Aktifkan atau nonaktifkan fitur-fitur aplikasi sesuai kebutuhan
            Anda.
          </Text>
        </View>
        <View className="bg-white rounded-xl shadow-md p-6">
          <Text className="text-2xl font-bold text-gray-800 mb-6">
            Pengaturan Interval
          </Text>

          <View className="bg-gray-50 p-5 rounded-lg mb-4 border border-gray-100">
            <Text className="text-lg font-semibold text-gray-700 mb-3">
              Interval Sinkronisasi (jam)
            </Text>
            <View className="flex flex-row items-center">
              <TextInput
                className="flex-1 bg-white border border-gray-300 rounded-lg p-3 mr-3"
                value={sinkronisasiInterval}
                onChangeText={setSinkronisasiInterval}
                keyboardType="numeric"
                placeholder="Masukkan interval dalam jam"
              />
              <TouchableOpacity
                className="bg-blue-600 px-4 py-3 rounded-lg"
                onPress={handleSaveSinkronisasiInterval}
              >
                <Text className="text-white font-semibold">Simpan</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 mt-2">Default: 5 jam</Text>
          </View>

          <View className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <Text className="text-lg font-semibold text-gray-700 mb-3">
              Interval Kirim Kwitansi Tertunda (hari)
            </Text>
            <View className="flex flex-row items-center">
              <View className="flex flex-row items-center">
                <View className="bg-yellow-100 p-2 rounded-lg ml-2">
                  <Text className="text-xs font-semibold text-yellow-700">
                    Default: 1 hari dipagi hari (cron job memeriksa, lihat
                    email_config di web CSI SUPER POS untuk pengaturan lebih
                    lanjut)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PengaturanFitur;
