import React from "react";
import { Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { isAddItemLocked, useCurrentBill, useOutlet } from "../store";

// Hanya menutup area daftar item (sisi kiri). Bill di kanan (edit, hapus, Bayar, Clear) tetap bisa dipakai.
const AddItemLockOverlay = () => {
  const outletMode = useOutlet((s) => s.outlet?.mode);
  const isLocked = useCurrentBill(
    (s) => outletMode === "stateless" && isAddItemLocked(s),
  );

  if (!isLocked) return null;

  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-center px-6 z-50">
      <Lock size={40} color="white" />
      <Text className="text-white text-lg font-bold mt-3 text-center">
        Inventory Dikunci
      </Text>
      <Text className="text-white text-center mt-2">
        Bill sudah dicetak & dikirim ke NAV. Item tidak bisa ditambah.
        Selesaikan Bayar, atau Clear untuk membatalkan bill.
      </Text>
    </View>
  );
};

export default AddItemLockOverlay;
