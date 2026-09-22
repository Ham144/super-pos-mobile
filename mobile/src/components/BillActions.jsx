import React from "react";
import { View, Text, TouchableOpacity, Platform, Alert } from "react-native";
import { Trash2, SaveAll, Archive, ReceiptText } from "lucide-react-native";
import { useCurrentBill, useLoading } from "../store";

export const BillActions = ({
  _id,
  clearSale,
  isCalculating,
  handleCetakBill,
  handleCetaKuitansi_offlineBayar,
  handleCetakHelper,
  isPrintedCustomerBilling,
  cebelumDiskon,
  setelahDiskon,
  done,
  setIsShowPaymentMethodModal,
}) => {
  const handleClearSale = () => {
    if (Platform.OS === "android") {
      Alert.alert(
        "Konfirmasi",
        "Bersihkan currentBill dengan data yang terpilih?",
        [
          {
            text: "Batal",
            style: "cancel",
          },
          {
            text: "Ya, hapus",
            onPress: clearSale,
          },
        ],
      );
    } else {
      clearSale();
    }
  };
  
  const { loadingPrinting } = useLoading();

  const { paymentMethod, spg } = useCurrentBill();

  return (
    <View>
      <View className="gap-2">
        {/* Baris 1: Cetak Bill (Customer) dan Bayar */}
        <View className="flex-row gap-2">
          {/* Print Bill Button */}
          <TouchableOpacity
            disabled={!_id || isCalculating || loadingPrinting}
            onPress={() => {
              if (!paymentMethod || !spg) {
                setIsShowPaymentMethodModal(true);
                return;
              }
              handleCetakBill({ fromResume: false });
            }}
            className={`flex-1 rounded-lg py-2 px-4 shadow-md items-center justify-center bg-blue-950 flex-row gap-x-2 ${
              !_id || isCalculating || loadingPrinting ? "opacity-50" : ""
            }`}
          >
            <Text className="text-xs font-semibold text-white font-aldrich">
              Cetak Bill (Customer)
            </Text>
            <Archive size={18} color={"white"} />
          </TouchableOpacity>

          {/* Payment Button */}
          <TouchableOpacity
            disabled={
              !cebelumDiskon ||
              !isPrintedCustomerBilling ||
              isCalculating ||
              loadingPrinting
            }
            onPress={handleCetaKuitansi_offlineBayar}
            className={`flex-1 rounded-lg py-2 px-4 shadow-md items-center justify-center flex-row gap-x-2 ${
              !cebelumDiskon ||
              !isPrintedCustomerBilling ||
              isCalculating ||
              loadingPrinting
                ? "bg-slate-400 opacity-50"
                : "bg-blue-950"
            }`}
          >
            <Text className="text-xs font-semibold text-white font-aldrich">
              {done
                ? "Cetak Ulang Kuitansi"
                : `Bayar Rp ${setelahDiskon?.toLocaleString("id")} dan Cetak`}
            </Text>
            <ReceiptText color="white" size={18} />
          </TouchableOpacity>
        </View>

        {/* Baris 2: Clear dan Cetak Bill Helper */}
        <View className="flex-row gap-2 items-center">
          {/* Clear Button */}
          <TouchableOpacity
            onPress={handleClearSale}
            className="flex-row gap-x-1 items-center justify-center px-3 py-1 rounded-full border border-red-600"
          >
            <Trash2 size={16} color="red" />
            <Text className="text-xs font-semibold text-red-600">Clear</Text>
          </TouchableOpacity>

          {/* Save & Print Button */}
          <TouchableOpacity
            disabled={
              !_id || !done || isCalculating || loadingPrinting
            }
            onPress={handleCetakHelper}
            className={`flex-1 rounded-lg py-2 px-4 shadow-md items-center justify-center flex-row gap-x-2 ${
              !_id || !done || isCalculating || loadingPrinting
                ? "bg-blue-950 opacity-50"
                : "bg-blue-950"
            }`}
          >
            <Text className="text-xs font-semibold text-white font-aldrich">
              Cetak Bill (Helper)
            </Text>
            <SaveAll size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
