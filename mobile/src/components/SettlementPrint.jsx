import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from "react-native";
import { FileText, Printer, ShoppingCart, User2 } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useOutlet } from "../store";
import { getPaymentMethodRanking, printSettlement } from "../api";

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

const SettlementPrint = ({ formatCurrency, storeName, selectedDate }) => {
  const { outlet } = useOutlet();
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    data: paymentMethodData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["paymentMethodRanking", selectedDate],
    queryFn: () =>
      getPaymentMethodRanking({
        startDate: getStartDate(selectedDate),
        endDate: getEndDate(selectedDate),
        transactionStatus: "success",
        outlet: outlet.kodeOutlet,
      }),
    enabled: !!outlet?.kodeOutlet,
  });

  const paymentRankings = paymentMethodData?.data?.paymentMethodRank || [];
  const totalAmount = paymentRankings.reduce(
    (acc, item) => acc + item.totalSales,
    0,
  );

  const handlePrintSettlement = async () => {
    if (isPrinting) return;

    if (!paymentRankings.length) {
      ToastAndroid.show(
        "Tidak ada data settlement untuk tanggal ini",
        ToastAndroid.SHORT,
      );
      return;
    }

    setIsPrinting(true);
    try {
      await printSettlement({
        totalAmount: totalAmount,
        totals: paymentRankings,
        outletName: outlet?.namaOutlet,
        settlementDate: new Date(selectedDate).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      ToastAndroid.show("Settlement berhasil dicetak", ToastAndroid.SHORT);
    } catch (error) {
      const message =
        error?.message || error?.status?.message || "Gagal mencetak settlement";
      Platform.OS === "android" || Platform.OS === "ios"
        ? Alert.alert("Gagal Cetak", message)
        : alert(message);
    } finally {
      setIsPrinting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator size="large" color="#3b82f6" className="my-8" />
      );
    }

    if (isError) {
      return (
        <Text className="text-center text-red-500 my-8">
          Gagal memuat data peringkat.
        </Text>
      );
    }

    if (paymentRankings.length === 0) {
      return (
        <Text className="text-center text-gray-500 my-8">
          Tidak ada data settlement untuk tanggal ini.
        </Text>
      );
    }

    return paymentRankings.map((item, index) => (
      <View
        key={item._id}
        className={`bg-white p-4 rounded-lg mb-3 border border-gray-100 shadow-xs ${
          index === 0 ? "border-l-4 border-l-blue-950" : ""
        }`}
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Text className="text-blue-600 font-bold">
                {item._id.charAt(0)}
              </Text>
            </View>
            <Text className="font-medium text-gray-800">{item._id}</Text>
          </View>
          <Text className="font-bold text-gray-800">
            {formatCurrency(item.totalSales)}
          </Text>
        </View>

        <View className="flex-row justify-between mt-2">
          <View className="flex-row items-center">
            <FileText size={14} color="#9ca3af" className="mr-1" />
            <Text className="text-gray-500 text-xs">
              {item.jumlahInvoice} transactions
            </Text>
          </View>
          <View className="flex-row items-center">
            <ShoppingCart size={14} color="#9ca3af" className="mr-1" />
            <Text className="text-gray-500 text-xs">
              {item.totalItems} items
            </Text>
          </View>
          <View className="bg-green-50 px-2 py-1 rounded-full">
            <Text className="text-green-600 text-xs font-medium">
              {Number(item.percentage).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    ));
  };

  return (
    <View className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Text className="text-sm bg-orange-300 text-center p-2 rounded-md text-gray-600 font-medium border-b border-gray-200 pb-2">
        Preview SETTLEMENT
      </Text>
      <Text className="text-lg font-bold text-center mb-2 mt-2">
        {storeName}
      </Text>

      <View className="px-4 pb-4">
        <View className="border-y border-gray-200 py-2 mb-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Tanggal Settlement:</Text>
            <Text className="text-sm font-medium text-gray-800">
              {new Date(selectedDate)?.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg mb-4">
          <View className="flex-row items-center">
            <User2 size={16} color="#6b7280" className="mr-2" />
            <Text className="text-gray-600 font-medium">My Outlet:</Text>
          </View>
          <Text className="text-gray-800 font-medium">
            {outlet?.namaOutlet || "Unknown outlet"}
          </Text>
        </View>

        <View>{renderContent()}</View>

        <View className="mt-4 pt-4 border-t border-gray-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600 font-medium">Total Sales</Text>
            <Text className="text-gray-800 font-bold">
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handlePrintSettlement}
          disabled={isPrinting || isLoading}
          className={`mt-6 py-3 rounded-lg flex-row items-center justify-center shadow-md gap-x-3 active:bg-blue-600 ${
            isPrinting || isLoading ? "bg-blue-300" : "bg-blue-950"
          }`}
        >
          {isPrinting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Printer size={18} color="white" className="mr-2" />
          )}
          <Text className="text-white font-semibold">
            {isPrinting ? "Mencetak..." : "Print Settlement Report"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettlementPrint;
