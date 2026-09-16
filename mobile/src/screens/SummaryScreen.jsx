import React, { useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { View, ScrollView } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import SettlementPrint from "../components/SettlementPrint";
import EndOfDayskuView from "../components/EndOfDaySkuView";
import { SquareChevronRight, Calendar } from "lucide-react-native";

const SummaryScreen = ({ navigation }) => {
  const [storeName, setStoreName] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [settlementData, setSettlementData] = useState({});
  const [terakhirPrintSettlement, setTerakhirPrintSettlement] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatCurrency = (amount) => {
    if (!amount) return "Rp 0";
    return `Rp ${amount?.toLocaleString("id-ID")}`;
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {/* Date Navigation - Enhanced Premium Look */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              const prevDate = new Date(selectedDate);
              prevDate.setDate(prevDate.getDate() - 1);
              setSelectedDate(prevDate);
            }}
            className="bg-blue-50 p-3 rounded-xl active:bg-blue-100"
          >
            <Text className="text-blue-600 font-bold text-xl">‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="flex-1 mx-4 bg-gray-50 py-3 rounded-2xl border border-gray-100 items-center justify-center"
          >
            <View className="flex-row items-center">
              <Calendar size={16} color="#3b82f6" className="mr-2" />
              <Text
                className="text-gray-800 font-bold text-base"
                style={{ fontFamily: "gilroyBold" }}
              >
                {selectedDate.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Text className="text-blue-950 text-[10px] mt-0.5 font-medium">
              Tap to change date
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const nextDate = new Date(selectedDate);
              nextDate.setDate(nextDate.getDate() + 1);
              setSelectedDate(nextDate);
            }}
            className="bg-blue-50 p-3 rounded-xl active:bg-blue-100"
          >
            <Text className="text-blue-600 font-bold text-xl">›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
          gap: 20,
        }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={false}
      >
        {selectedDate && (
          <SettlementPrint
            key={"settlement-print"}
            formatCurrency={formatCurrency}
            storeName={storeName}
            selectedDate={selectedDate}
          />
        )}

        {selectedDate && (
          <EndOfDayskuView
            key={"end-of-day-sku-view"}
            formatCurrency={formatCurrency}
            storeName={storeName}
            selectedDate={selectedDate}
          />
        )}
      </ScrollView>
      <View className="absolute bottom-14 left-0 z-20">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="px-2 bg-blue-300 py-4 rounded-r-lg items-center justify-center"
        >
          <Text>
            <SquareChevronRight size={20} color={"white"} />
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SummaryScreen;
