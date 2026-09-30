import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal } from "react-native";

export const ModalNomorTransaksi = ({
  isVisible,
  onClose,
  onSubmit,
  initialValue = "",
}) => {
  const [nomorTransaksi, setNomorTransaksi] = useState(initialValue);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg w-[90%] max-w-md">
          <Text className="text-xl font-bold mb-4">Nomor Transaksi</Text>
          <Text className="text-gray-500 text-sm mb-4">
            (Opsional & tidak ditampilkan di bill)
          </Text>

          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4"
            placeholder="Masukkan nomor transaksi"
            value={nomorTransaksi}
            onChangeText={setNomorTransaksi}
            keyboardType="numeric"
          />

          <View className="flex-row justify-end gap-x-2">
            <TouchableOpacity
              onPress={() => {
                onClose();
                setNomorTransaksi("");
              }}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-700">Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onSubmit(nomorTransaksi);
              }}
              className="bg-blue-950 px-4 py-2 rounded-lg"
            >
              <Text className="text-white">Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
