import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Alert,
  Switch,
  ScrollView,
  Platform,
  ToastAndroid,
} from "react-native";
import { useOnlineSync } from "../hooks/useOnlineSync";
import {
  useDiskonOffline,
  useInventoriesOffline,
  usePromoOffline,
  useVoucherOffline,
} from "../store";

const PengaturanAplikasi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [dataLengths, setDataLengths] = useState({});
  const [selectedData, setSelectedData] = useState({
    inventories: false,
    customer: false,
    diskon: false,
    promo: false,
    voucher: false,
    fiturEnabled: false,
    outlet: false,
    paymentMethod: false,
    spg: false,
  });
  const { handleSinkronisasi } = useOnlineSync();

  // Move hooks to component level
  const { setPromoOffline } = usePromoOffline();
  const { setDiskonOffline } = useDiskonOffline();
  const { setVoucherOffline } = useVoucherOffline();
  const { setInventoriesOffline } = useInventoriesOffline();

  const getDataLengths = async () => {
    try {
      const lengths = {};
      for (const key of Object.keys(selectedData)) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsedData = JSON.parse(data);
          lengths[key] = Array.isArray(parsedData) ? parsedData.length : 1;
        } else {
          lengths[key] = 0;
        }
      }
      setDataLengths(lengths);
    } catch (error) {
      console.error("Error getting data lengths:", error);
    }
  };

  const handleSelectAll = () => {
    const newState = Object.keys(selectedData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setSelectedData(newState);
  };

  const handleDeselectAll = () => {
    const newState = Object.keys(selectedData).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});
    setSelectedData(newState);
  };

  const handleResetData = async () => {
    try {
      setIsLoading(true);

      // Always delete lastSyncTime
      await AsyncStorage.removeItem("lastSyncTime");

      // Delete selected data
      for (const [key, isSelected] of Object.entries(selectedData)) {
        if (isSelected) {
          await AsyncStorage.removeItem(key);

          // Update Zustand state
          if (key === "promo") {
            setPromoOffline([]);
          }
          if (key === "diskon") {
            setDiskonOffline([]);
          }
          if (key === "voucher") {
            setVoucherOffline([]);
          }
          if (key === "inventories") {
            setInventoriesOffline([]);
          }
        }
      }

      if (Platform.OS === "web") {
        alert("Data berhasil direset");
      } else {
        Alert.alert("Sukses", "Data berhasil direset", [{ text: "OK" }]);
      }

      handleDeselectAll();
      // Refresh data lengths after reset
      await getDataLengths();
    } catch (error) {
      console.error("Error reset data:", error);
      if (Platform.OS === "web") {
        alert("Gagal mereset data");
      } else {
        Alert.alert("Error", "Gagal mereset data", [{ text: "OK" }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showResetConfirmation = () => {
    const selectedCount = Object.values(selectedData).filter(Boolean).length;
    if (selectedCount === 0) {
      if (Platform.OS === "web") {
        alert("Pilih minimal satu data untuk direset");
      } else {
        Alert.alert("Peringatan", "Pilih minimal satu data untuk direset", [
          { text: "OK" },
        ]);
      }
      return;
    }

    const selectedItems = Object.entries(selectedData)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => `${key} (${dataLengths[key] || 0} items)`)
      .join("\n");

    const message = `Anda akan menghapus data berikut:\n\n${selectedItems}\n\nBeberapa data yang belum di sinkronisasi mungkin saja akan hilang dan tidak tercatat ke database. Lanjutkan?`;

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        handleResetData();
      }
    } else {
      Alert.alert("Peringatan!", message, [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Reset Data",
          style: "destructive",
          onPress: handleResetData,
        },
      ]);
    }
  };

  const handleSinkronisasiLagi = async () => {
    try {
      setIsLoading(true);
      await handleSinkronisasi(true);
      await getDataLengths();
    } catch (error) {
      console.error("Error saat sinkronisasi:", error);

      // Tampilkan pesan error ke user
      if (Platform.OS === "web") {
        alert(error?.response?.data?.message || error.message);
      } else {
        ToastAndroid.show(
          error?.response?.data?.message || error.message,
          ToastAndroid.SHORT,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDataLengths();
  }, [selectedData]);

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="bg-white rounded-xl shadow-md p-8 mb-8">
        <Text className="text-3xl font-extrabold text-red-700 mb-6 text-center">
          Atur Ulang Data
        </Text>
        <Text className="text-lg text-gray-700 mb-4 text-center">
          Pilih bagian data yang ingin Anda atur ulang. Tindakan ini akan
          menghapus data terpilih dan mengambil versi terbaru dari database.
        </Text>
        <Text className="text-orange-500 italic mb-6 text-center font-semibold">
          Perhatian: Fitur ini dapat menyebabkan perbedaan data jika digunakan
          secara tidak hati-hati.
        </Text>

        <View className="flex flex-row justify-center gap-x-4 mb-8">
          <TouchableOpacity
            onPress={handleSelectAll}
            className="bg-indigo-500 px-8 py-3 rounded-full shadow-sm active:bg-indigo-700"
          >
            <Text className="text-white font-semibold text-lg">
              Pilih Semua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeselectAll}
            className="bg-gray-400 px-8 py-3 rounded-full shadow-sm active:bg-gray-600"
          >
            <Text className="text-white font-semibold text-lg">
              Batalkan Pilihan
            </Text>
          </TouchableOpacity>
        </View>

        <View className=" mb-8 ">
          {Object.entries(selectedData).map(([key, isSelected]) => (
            <TouchableOpacity
              key={key}
              onPress={() =>
                setSelectedData((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
              className={`flex mb-3 flex-row items-center justify-between p-5 rounded-md border ${
                isSelected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-200 bg-gray-50"
              } shadow-sm active:bg-indigo-100`}
            >
              <View className="flex flex-row items-center">
                <View
                  className={`w-7 h-7 rounded border-2 mr-4 flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-gray-400"
                  }`}
                >
                  {isSelected && <Text className="text-white text-lg">✓</Text>}
                </View>
                <Text className="text-xl capitalize font-medium">{key}</Text>
              </View>
              <Text className="text-gray-600 text-sm">
                {dataLengths[key] || 0} item
                {dataLengths[key] > 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={showResetConfirmation}
          disabled={isLoading}
          className={`mt-8 p-5 rounded-full shadow-md ${
            isLoading ? "bg-red-300" : "bg-red-500"
          } active:bg-red-700`}
        >
          <Text className="text-white text-center font-bold text-lg">
            {isLoading ? "Memproses..." : "Atur Ulang Data Terpilih"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSinkronisasiLagi}
          disabled={isLoading}
          className={`mt-4 p-5 rounded-full shadow-md ${
            isLoading ? "bg-blue-300" : "bg-blue-950"
          } active:bg-blue-700`}
        >
          <Text className="text-white text-center font-bold text-lg">
            {isLoading ? "Memproses..." : "Ambil Data Terbaru"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PengaturanAplikasi;
