import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ToastAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl, pingBackend } from "../api";

const PengaturanBackend = () => {
  const [backendUrl, setBackendUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [timeout, setTimeout] = useState("5000");
  const [retryAttempts, setRetryAttempts] = useState("3");

  // Load pengaturan dari AsyncStorage saat komponen dimuat
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const baseUrl = await getBaseUrl();
        const savedApiKey = await AsyncStorage.getItem("apiKey");
        const savedTimeout = await AsyncStorage.getItem("timeout");
        const savedRetryAttempts = await AsyncStorage.getItem("retryAttempts");

        setBackendUrl(baseUrl || "");
        setApiKey(savedApiKey || "");
        setTimeout(savedTimeout || "5000");
        setRetryAttempts(savedRetryAttempts || "3");
      } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
      }
    };

    loadSettings();
  }, []);

  // Fungsi untuk menyimpan pengaturan
  const handleSave = async () => {
    try {
      // Simpan semua pengaturan ke AsyncStorage
      await AsyncStorage.setItem("BASE_URL", JSON.stringify(backendUrl));
      await AsyncStorage.setItem("apiKey", JSON.stringify(apiKey));
      await AsyncStorage.setItem("timeout", JSON.stringify(timeout));
      await AsyncStorage.setItem(
        "retryAttempts",
        JSON.stringify(retryAttempts),
      );

      ToastAndroid?.show("Berhasil memperbarui pengaturan", ToastAndroid.SHORT);
    } catch (error) {
      console.error("Gagal menyimpan pengaturan:", error);
      ToastAndroid?.show("Gagal menyimpan pengaturan", ToastAndroid.SHORT);
    }
  };

  // Query untuk ping backend
  const {
    data: pong,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["ping", backendUrl], // Sertakan backendUrl sebagai bagian dari queryKey agar refetch saat URL berubah
    queryFn: () => pingBackend(backendUrl),
    refetchInterval: 2000, // Refetch setiap 2 detik
    enabled: !!backendUrl, // Hanya jalankan query jika backendUrl ada
  });

  // Tentukan status koneksi
  const isConnected = pong;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {/* Status Koneksi */}
      <View
        className="flex-1 p-2 rounded-lg mb-4"
        style={{
          backgroundColor: isLoading
            ? "#A0AEC0" // Abu-abu saat loading
            : isConnected
              ? "#34C759" // Hijau saat terhubung
              : "#F56565", // Merah saat tidak terhubung
        }}
      >
        <Text className="text-white text-lg font-semibold text-center">
          {isLoading
            ? "Mengecek Koneksi..."
            : isConnected
              ? "Terhubung"
              : error
                ? `Tidak Terhubung: ${error.message}`
                : "Tidak Terhubung"}
        </Text>
      </View>

      {/* Backend URL */}
      <View className="p-4 rounded-lg bg-gray-100 shadow-sm gap-3 mb-4">
        <Text className="text-lg font-semibold text-gray-700">Backend URL</Text>
        <TextInput
          className="border rounded-lg p-2 text-lg bg-white"
          value={backendUrl}
          onChangeText={setBackendUrl}
          placeholder="Masukkan URL backend"
          autoCapitalize="none"
        />
      </View>

      {/* API Key */}
      <View className="p-4 rounded-lg bg-gray-100 shadow-sm gap-3 mb-4">
        <Text className="text-lg font-semibold text-gray-700">API Key</Text>
        <TextInput
          className="border rounded-lg p-2 text-lg bg-white"
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Masukkan API Key"
          secureTextEntry={true}
        />
      </View>

      {/* Timeout */}
      <View className="p-4 rounded-lg bg-gray-100 shadow-sm gap-3 mb-4">
        <Text className="text-lg font-semibold text-gray-700">
          Timeout (ms)
        </Text>
        <TextInput
          className="border rounded-lg p-2 text-lg bg-white"
          value={timeout}
          keyboardType="numeric"
          onChangeText={(text) => setTimeout(text.replace(/[^0-9]/g, ""))}
          placeholder="Masukkan waktu timeout (ms)"
        />
      </View>

      {/* Retry Attempts */}
      <View className="p-4 rounded-lg bg-gray-100 shadow-sm gap-3 mb-4">
        <Text className="text-lg font-semibold text-gray-700">
          Retry Attempts
        </Text>
        <TextInput
          className="border rounded-lg p-2 text-lg bg-white"
          value={retryAttempts}
          keyboardType="numeric"
          onChangeText={(text) => setRetryAttempts(text.replace(/[^0-9]/g, ""))}
          placeholder="Jumlah percobaan ulang"
        />
      </View>

      <Text className="font-aldrich">Jangan simpan sebelum terhubung</Text>
      {/* Tombol Simpan */}
      <View className="mt-4 flex-row justify-end gap-x-4">
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-950 flex-1 py-3 px-4 rounded-lg shadow-md active:bg-blue-700"
        >
          <Text className="text-white text-lg font-semibold text-center">
            Simpan
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PengaturanBackend;
