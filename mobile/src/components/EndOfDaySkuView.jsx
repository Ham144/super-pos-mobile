import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Platform,
  Alert,
} from "react-native";
import { Printer } from "lucide-react-native";
import { endOfDayBySku, printCetakEOD } from "../api";
import { useQuery } from "@tanstack/react-query";
import { useOutlet } from "../store";

const getStartDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndDate = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const EndOfDayBySkuView = ({ formatCurrency, storeName, selectedDate }) => {
  const { outlet } = useOutlet();
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    data: endOfDayBySkuData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["endOfDayBySku", selectedDate, outlet?.kodeOutlet],
    queryFn: () =>
      endOfDayBySku({
        startDate: getStartDate(selectedDate),
        endDate: getEndDate(selectedDate),
        transactionStatus: "success",
        outlet: outlet?.kodeOutlet,
      }),
    enabled: !!outlet?.kodeOutlet,
  });

  const skuRankings = endOfDayBySkuData?.data?.skuRank || [];
  const totalAmount = skuRankings.reduce(
    (acc, item) => acc + item.totalSales,
    0,
  );

  const handlePrintEOD = async () => {
    if (isPrinting) return;

    if (!skuRankings.length) {
      ToastAndroid.show(
        "Tidak ada data penjualan untuk tanggal ini",
        ToastAndroid.SHORT,
      );
      return;
    }

    setIsPrinting(true);
    try {
      await printCetakEOD({
        outletName: outlet?.namaOutlet,
        totals: skuRankings,
        totalAmount: totalAmount,
        date: new Date(selectedDate).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      ToastAndroid.show("End of Day berhasil dicetak", ToastAndroid.SHORT);
    } catch (error) {
      const message =
        error?.message || error?.status?.message || "Gagal mencetak End of Day";
      Platform.OS === "android" || Platform.OS === "ios"
        ? Alert.alert("Gagal Cetak", message)
        : alert(message);
    } finally {
      setIsPrinting(false);
    }
  };

  const renderSkuList = () => {
    if (isLoading) {
      return (
        <ActivityIndicator size="large" color="#3b82f6" className="my-6" />
      );
    }

    if (isError) {
      return (
        <Text className="text-center text-red-500 my-6">
          Gagal memuat data penjualan SKU.
        </Text>
      );
    }

    if (skuRankings.length === 0) {
      return (
        <Text className="text-center text-gray-500 my-6">
          Tidak ada produk yang terjual pada tanggal ini.
        </Text>
      );
    }

    return (
      <>
        <View className="flex-row justify-between bg-gray-50 p-2 rounded-t-lg border-b border-gray-200">
          <Text className="font-bold text-gray-600" style={styles.skuColumn}>
            SKU
          </Text>
          <Text
            className="font-bold text-gray-600 text-center"
            style={styles.qtyColumn}
          >
            Qty
          </Text>
          <Text
            className="font-bold text-gray-600 text-right"
            style={styles.salesColumn}
          >
            Total Sales
          </Text>
        </View>

        {skuRankings.map((item) => (
          <View
            key={item._id}
            className="flex-row justify-between items-center p-2 border-b border-gray-100"
          >
            <Text className="text-gray-800" style={styles.skuColumn}>
              {item._id}
            </Text>
            <Text
              className="text-gray-800 text-center"
              style={styles.qtyColumn}
            >
              {item.totalQuantity}
            </Text>
            <Text
              className="text-gray-800 text-right"
              style={styles.salesColumn}
            >
              {formatCurrency(item.totalSales)}
            </Text>
          </View>
        ))}
      </>
    );
  };

  return (
    <View className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Text className="text-sm bg-orange-300 text-center p-2 rounded-md text-gray-600 font-medium border-b border-gray-200 pb-2">
        Preview End of Day
      </Text>

      <View className="px-4 pb-4">
        <Text className="text-lg font-bold text-center mb-2 mt-2">
          {storeName}
        </Text>

        <View className="flex-row justify-between mb-4">
          <Text className="text-sm text-gray-600">Tanggal:</Text>
          <Text className="text-sm font-medium text-gray-800">
            {new Date(selectedDate)?.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        <Text className="font-semibold mb-2">Rincian Penjualan per SKU</Text>

        <View className="border border-gray-200 rounded-lg overflow-hidden">
          {renderSkuList()}
        </View>

        <View className="mt-4 border-t border-gray-200 pt-2">
          <View className="flex-row justify-between">
            <Text className="font-semibold text-base">Total Sales </Text>
            <Text className="font-semibold text-base">
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handlePrintEOD}
          disabled={isPrinting || isLoading}
          className={`mt-6 mb-2 py-3 rounded-lg flex-row items-center justify-center shadow-md active:bg-blue-600 gap-x-3 ${
            isPrinting || isLoading ? "bg-blue-300" : "bg-blue-950"
          }`}
        >
          {isPrinting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Printer size={18} color="white" className="mr-2" />
          )}
          <Text className="text-white font-semibold">
            {isPrinting ? "Mencetak..." : "Print End of Day"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skuColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
  },
  salesColumn: {
    flex: 2,
  },
});

export default EndOfDayBySkuView;
