import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput } from "react-native";
import { X } from "lucide-react-native";

const EditBonusQuantity = ({ isVisible, onClose, onSave, selectedPromo }) => {
  const [quantity, setQuantity] = useState(
    selectedPromo?.promoInfo?.quantityBonus || "0",
  );

  const handleSave = () => {
    const numQuantity = parseInt(quantity) || 0;
    onSave(numQuantity);
    onClose();
    setQuantity(null);
  };

  useEffect(() => {
    setQuantity(selectedPromo?.promoInfo?.quantityBonus || "0");
  }, [selectedPromo]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Edit Quantity Bonus</Text>
            <TouchableOpacity onPress={onClose}>
              <Text>
                <X size={24} color="gray" />
              </Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-600 mb-2">Quantity Bonus</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Masukkan quantity"
              />
            </View>

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 bg-gray-200 p-3 rounded-lg"
              >
                <Text className="text-center">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-blue-950 p-3 rounded-lg"
              >
                <Text className="text-center text-white">Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditBonusQuantity;
