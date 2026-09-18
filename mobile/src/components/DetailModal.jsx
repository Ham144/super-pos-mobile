import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useCurrentBill } from "../store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializePaymentMethod } from "../api";

const DetailModal = ({ visible, setModalVisible, handleCetakBill }) => {
  const {
    setPaymentMethod,
    setSpg,
    paymentMethod: currentPaymentMethod,
    spg: currentSpg,
  } = useCurrentBill();
  const [spgList, setSpgList] = useState([]);
  const [paymentMethodList, setPaymentMethodList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSpgList, setFilteredSpgList] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedSpg, setSelectedSpg] = useState(null);
  const [selectedMode, setSelectedMode] = useState("fallback");

  const midtransMethods = useMemo(
    () =>
      paymentMethodList.filter(
        (method) => method.gatewayProvider === "midtrans",
      ),
    [paymentMethodList],
  );

  const fallbackMethods = useMemo(
    () =>
      paymentMethodList.filter((method) => method.gatewayProvider !== "midtrans"),
    [paymentMethodList],
  );

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const remotePaymentMethods = await initializePaymentMethod();
        if (Array.isArray(remotePaymentMethods) && remotePaymentMethods.length) {
          const activePaymentMethods = remotePaymentMethods.filter(
            (method) => method.status,
          );
          setPaymentMethodList(activePaymentMethods);
          await AsyncStorage.setItem(
            "paymentMethod",
            JSON.stringify(remotePaymentMethods),
          );
          return;
        }

        const storedPaymentMethods = await AsyncStorage.getItem("paymentMethod");
        if (storedPaymentMethods) {
          const parsedPaymentMethods = JSON.parse(storedPaymentMethods);
          const activePaymentMethods = parsedPaymentMethods.filter(
            (method) => method.status,
          );
          setPaymentMethodList(activePaymentMethods);
          return;
        }

        setPaymentMethodList([]);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        const storedPaymentMethods = await AsyncStorage.getItem("paymentMethod");
        if (storedPaymentMethods) {
          const parsedPaymentMethods = JSON.parse(storedPaymentMethods);
          const activePaymentMethods = parsedPaymentMethods.filter(
            (method) => method.status,
          );
          setPaymentMethodList(activePaymentMethods);
          return;
        }
        setPaymentMethodList([]);
      }
    };
    fetchPaymentMethods();
  }, [visible]);

  useEffect(() => {
    const fetchSpgList = async () => {
      try {
        const spgListFromStorage = await AsyncStorage.getItem("spg");
        if (spgListFromStorage) {
          const parsedList = JSON.parse(spgListFromStorage);
          setSpgList(parsedList);
          setFilteredSpgList(parsedList);
          return;
        }
        setSpgList([]);
        setFilteredSpgList([]);
      } catch (error) {
        console.error("Error fetching SPG list:", error);
        setSpgList([]);
        setFilteredSpgList([]);
      }
    };
    fetchSpgList();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const normalizedCurrentPaymentMethod =
      paymentMethodList.find((method) => method.method === currentPaymentMethod) ||
      null;
    const normalizedCurrentSpg =
      spgList.find((item) => item?._id === currentSpg?._id || item?._id === currentSpg) ||
      (currentSpg && typeof currentSpg === "object" ? currentSpg : null);

    setSelectedPaymentMethod(normalizedCurrentPaymentMethod);
    setSelectedMode(
      normalizedCurrentPaymentMethod?.gatewayProvider === "midtrans"
        ? "midtrans"
        : "fallback",
    );
    setSelectedSpg(normalizedCurrentSpg);
  }, [visible, currentPaymentMethod, currentSpg, paymentMethodList, spgList]);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery("");
    setFilteredSpgList(spgList);
  }, [visible, spgList]);

  useEffect(() => {
    if (!visible) return;

    if (selectedMode === "fallback" && !fallbackMethods.length && midtransMethods.length) {
      setSelectedMode("midtrans");
      if (!selectedPaymentMethod || selectedPaymentMethod.gatewayProvider !== "midtrans") {
        setSelectedPaymentMethod(midtransMethods[0]);
      }
    }

    if (selectedMode === "midtrans" && !midtransMethods.length && fallbackMethods.length) {
      setSelectedMode("fallback");
      if (!selectedPaymentMethod || selectedPaymentMethod.gatewayProvider === "midtrans") {
        setSelectedPaymentMethod(fallbackMethods[0]);
      }
    }
  }, [visible, selectedMode, midtransMethods, fallbackMethods, selectedPaymentMethod]);

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setSelectedMode(method.gatewayProvider === "midtrans" ? "midtrans" : "fallback");
  };

  const handleSelectSpg = (spgItem) => {
    setSelectedSpg(spgItem);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredSpgList(spgList);
      return;
    }

    const filtered = spgList.filter((spg) =>
      String(spg.name || "")
        .toLowerCase()
        .includes(text.toLowerCase()),
    );
    setFilteredSpgList(filtered);
  };

  const handleKonfirmasi = async () => {
    if (!selectedSpg || !selectedPaymentMethod) {
      return;
    }

    setSpg(selectedSpg);
    setPaymentMethod(selectedPaymentMethod.method);
    setModalVisible(false);

    if (handleCetakBill) {
      await handleCetakBill();
    }
  };

  const renderMethodList = (methods) => {
    if (!methods.length) {
      return (
        <View className="p-4 items-center">
          <Text className="text-gray-500 text-center">
            Tidak ada metode pembayaran aktif untuk mode ini.
          </Text>
        </View>
      );
    }

    return methods.map((method) => {
      const isSelected =
        selectedPaymentMethod?._id && selectedPaymentMethod._id === method._id;

      return (
        <TouchableOpacity
          key={method._id || method.method}
          className={`mb-2 rounded-xl border px-3 py-3 ${
            isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
          }`}
          onPress={() => handleSelectPaymentMethod(method)}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-gray-800">{method.method}</Text>
              <Text className="text-xs text-gray-500">
                {method.gatewayProvider === "midtrans"
                  ? "Gateway Midtrans"
                  : "Fallback manual"}
              </Text>
              <View className="mt-1 flex-row flex-wrap gap-2">
                {method.discount > 0 && (
                  <Text className="text-xs text-green-600">
                    Diskon: {method.discount}%
                  </Text>
                )}
                {method.additional_fee > 0 && (
                  <Text className="text-xs text-red-600">
                    Biaya tambahan: {method.additional_fee}
                  </Text>
                )}
              </View>
            </View>
            <Text className="text-sm font-bold text-blue-600">
              {isSelected ? "✓" : ""}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="w-full max-w-3xl bg-white rounded-xl p-4">
          <View className="flex-col justify-between items-center mb-3">
            <View className="flex-row justify-between items-center w-full">
              <Text className="text-xl font-bold text-gray-800 font-aldrich text-center">
                Pilih SPG & Metode Bayar
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2"
              >
                <Text className="text-lg text-red-500 font-semibold">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="mt-1 text-xs text-gray-500 text-center">
              Pilih SPG terlebih dahulu, lalu pilih metode pembayaran:
              Midtrans atau fallback manual.
            </Text>
          </View>

          <ScrollView className="max-h-[60vh]">
            <View className="gap-4">
              <View className="rounded-xl bg-gray-100 p-3">
                <Text className="mb-2 text-sm font-bold text-gray-700">
                  Pilih SPG
                </Text>
                <TextInput
                  className="bg-white p-2 rounded-md border border-gray-300"
                  placeholder="Cari nama SPG..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                <View className="mt-3 max-h-[220px]">
                  <ScrollView>
                    {filteredSpgList.map((spgItem) => {
                      const isSelected =
                        selectedSpg && spgItem._id === selectedSpg._id;

                      return (
                        <TouchableOpacity
                          key={spgItem._id || spgItem.name}
                          className={`mb-2 rounded-xl border px-3 py-3 ${
                            isSelected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-white"
                          }`}
                          onPress={() => handleSelectSpg(spgItem)}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-3">
                              <Text className="font-semibold text-gray-800">
                                {spgItem.name}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                Target: Rp{" "}
                                {Number(
                                  spgItem.targetHargaPenjualan || 0,
                                ).toLocaleString("id-ID")}{" "}
                                | Qty {spgItem.targetQuantityPenjualan || 0}
                              </Text>
                            </View>
                            <Text className="text-sm font-bold text-blue-600">
                              {isSelected ? "✓" : ""}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {filteredSpgList.length === 0 && (
                      <View className="p-4 items-center">
                        <Text className="text-gray-500 text-center">
                          Tidak ditemukan SPG. Tambahkan di website lalu sinkronkan
                          ke mobile.
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            fetchSpgList();
                          }}
                        >
                          <Text className="text-blue-600 text-center underline btn">
                            Tekan ini untuk refetch
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>

              <View className="rounded-xl bg-gray-100 p-3">
                <Text className="mb-2 text-sm font-bold text-gray-700">
                  Pilih Mode Pembayaran
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      selectedMode === "midtrans"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => {
                      setSelectedMode("midtrans");
                      if (midtransMethods.length && selectedPaymentMethod?.gatewayProvider !== "midtrans") {
                        setSelectedPaymentMethod(midtransMethods[0]);
                      }
                    }}
                  >
                    <Text className="font-semibold text-gray-800">Midtrans</Text>
                    <Text className="text-xs text-gray-500">
                      Gateway online
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      selectedMode === "fallback"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => {
                      setSelectedMode("fallback");
                      if (fallbackMethods.length && selectedPaymentMethod?.gatewayProvider === "midtrans") {
                        setSelectedPaymentMethod(fallbackMethods[0]);
                      }
                    }}
                  >
                    <Text className="font-semibold text-gray-800">Fallback</Text>
                    <Text className="text-xs text-gray-500">
                      Manual / offline
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-3">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {selectedMode === "midtrans"
                      ? "Metode Midtrans"
                      : "Metode Fallback"}
                  </Text>
                  <ScrollView className="max-h-[220px]">
                    {selectedMode === "midtrans"
                      ? renderMethodList(midtransMethods)
                      : renderMethodList(fallbackMethods)}
                  </ScrollView>
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="flex-row gap-x-2 mt-4">
            <TouchableOpacity
              className="flex-1 bg-gray-300 py-3 rounded-lg active:opacity-80"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-center text-gray-800 font-semibold">
                Tutup
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg active:opacity-80 ${
                selectedSpg && selectedPaymentMethod
                  ? "bg-blue-600"
                  : "bg-blue-300"
              }`}
              disabled={!selectedSpg || !selectedPaymentMethod}
              onPress={handleKonfirmasi}
            >
              <Text className="text-center text-white font-semibold">
                Konfirmasi & Lanjut
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DetailModal;
