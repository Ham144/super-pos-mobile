import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import React, { useState } from "react";
import { useCurrentBill } from "../store";
import { TextInput } from "react-native-gesture-handler";
import { formatRp } from "./BillItems";

export default function EditItemModal({
  showEditItemModal,
  setShowEditItemModal,
  tempEditItem,
  onAfterEdit,
}) {
  const editCurrentBill = useCurrentBill((state) => state.editCurrentBill);
  const [description, setDescription] = useState(
    tempEditItem?.description || "",
  );
  const [quantity, setQuantity] = useState(
    tempEditItem?.quantity?.toString() || "1",
  );
  const [catatan, setCatatan] = useState(tempEditItem?.catatan || "");
  // Digits-only string; display uses id-ID thousand separators (1.234.567)
  const [hargaDigits, setHargaDigits] = useState(() => {
    if (tempEditItem?.RpHargaDasar == null) return "";
    const n = Math.round(Number(tempEditItem.RpHargaDasar));
    return Number.isFinite(n) && n >= 0 ? String(n) : "";
  });

  const handleEditConfirm = async () => {
    if (quantity === "" || parseInt(quantity) < 1) {
      ToastAndroid?.show(
        "Quantity tidak boleh kurang dari 1",
        ToastAndroid.SHORT,
      );
      return;
    }

    const parsedHarga = Number(hargaDigits);
    if (!hargaDigits || !Number.isFinite(parsedHarga) || parsedHarga < 0) {
      ToastAndroid?.show("Harga tidak valid", ToastAndroid.SHORT);
      return;
    }

    const qty = parseInt(quantity, 10);
    const originalHarga = parseFloat(tempEditItem.RpHargaDasar);
    const priceEdited =
      Boolean(tempEditItem?.priceEdited) ||
      (Number.isFinite(originalHarga) && parsedHarga !== originalHarga);
    const quantityChanged =
      Boolean(tempEditItem?.quantityChanged) ||
      qty !== Number(tempEditItem?.quantity);

    const newItem = {
      ...tempEditItem,
      description: description,
      quantity: qty,
      catatan: catatan,
      RpHargaDasar: parsedHarga,
      RpHargaLowest:
        tempEditItem?.RpHargaLowest != null
          ? Number(tempEditItem.RpHargaLowest)
          : tempEditItem?.RpHargaLowest,
      priceEdited,
      quantityChanged,
      totalRp: parsedHarga * qty,
    };
    editCurrentBill(newItem);
    setShowEditItemModal(false);
    if (typeof onAfterEdit === "function") {
      await onAfterEdit(newItem, tempEditItem);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showEditItemModal}
      onRequestClose={() => setShowEditItemModal(false)}
    >
      <View className="flex-1 justify-center items-center">
        <View className="bg-white rounded-lg p-4 gap-y-5 shadow-lg">
          {/* Edit Description */}
          <View>
            <Text className="text-xs font-semibold mb-4">Edit Description</Text>
            <TextInput
              editable={tempEditItem?.description === "Produk tanpa sku"}
              style={{
                borderWidth: 1,
                padding: 10,
                borderRadius: 10,
                borderColor: "#ccc",
                textAlign: "center",
                backgroundColor:
                  tempEditItem?.description !== "Produk tanpa sku"
                    ? "#ccc"
                    : "#fff",
              }}
              placeholder="Item name"
              value={description}
              onChangeText={(text) => setDescription(text)}
            />
          </View>

          {/* Edit Harga (retail) */}
          <View>
            <Text className="text-xs font-semibold mb-2">
              Edit Harga (Rp retail)
            </Text>
            {tempEditItem?.RpHargaLowest != null && (
              <Text className="text-[10px] text-gray-500 mb-2 text-center">
                Harga web: Rp{" "}
                {formatRp(tempEditItem.RpHargaLowest)}
              </Text>
            )}
            <TextInput
              style={{
                borderWidth: 1,
                padding: 10,
                borderRadius: 10,
                borderColor: "#ccc",
                textAlign: "center",
                height: 40,
              }}
              keyboardType="number-pad"
              value={hargaDigits === "" ? "" : formatRp(hargaDigits)}
              onChangeText={(text) => {
                const digits = String(text).replace(/\D/g, "");
                if (digits === "") {
                  setHargaDigits("");
                  return;
                }
                // Strip leading zeros except a lone "0"
                setHargaDigits(digits.replace(/^0+(?=\d)/, ""));
              }}
              placeholder="0"
            />
          </View>

          {/* Edit Quantity */}
          <View className="flex flex-col gap-y-2 items-center  justify-center">
            <Text className="text-xs font-semibold mr-4">Edit Quantity</Text>
            <View className="flex flex-row items-center bg-white rounded-full border border-gray-300  px-4 py-2">
              <TouchableOpacity
                className="text-sm font-semibold text-gray-600 bg-blue-950 rounded-full px-9 py-1"
                onPress={() => {
                  if (parseInt(quantity) > 1) {
                    setQuantity((prev) => (parseInt(prev) - 1).toString());
                  }
                }}
              >
                <Text className="text-sm font-semibold text-white">-</Text>
              </TouchableOpacity>
              <TextInput
                style={{
                  height: 40,
                  textAlign: "center",
                  fontSize: 16,
                  paddingHorizontal: 50,
                }}
                keyboardType="number-pad"
                value={quantity}
                onChangeText={(text) => {
                  if (text === "" || parseInt(text) >= 0) {
                    setQuantity(text);
                  }
                }}
              />
              <TouchableOpacity
                className="text-sm font-semibold text-gray-600 bg-blue-950 rounded-full px-9 py-1"
                onPress={() => {
                  const newQuantity = parseInt(quantity) + 1;
                  if (newQuantity <= tempEditItem?.limitQuantity) {
                    setQuantity(newQuantity.toString());
                  }
                }}
              >
                <Text className="text-sm font-semibold text-white">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Edit catatan */}
          <View>
            <Text className="text-xs font-semibold mb-4">Edit catatan</Text>
            <TextInput
              style={{
                borderWidth: 1,
                padding: 10,
                borderRadius: 10,
                borderColor: "#ccc",
                textAlign: "center",
                height: 40,
              }}
              placeholder="Tambah catatan tambahan"
              value={catatan}
              onChangeText={(text) => setCatatan(text)}
            />
          </View>

          {/* Confirm and Cancel buttons */}
          <View className="flex-row items-center justify-center gap-x-4 mt-4 w-full">
            <TouchableOpacity
              className="py-2 px-4 rounded-full bg-blue-600"
              onPress={handleEditConfirm}
            >
              <Text className="text-sm font-semibold text-white">Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-2 px-4 rounded-full bg-gray-200"
              onPress={() => setShowEditItemModal(false)}
            >
              <Text className="text-sm font-semibold text-gray-600">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
