import { Star } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useFilter } from "../store";

const PilihInventoryModal = ({
  visible,
  onClose,
  inventoryList,
  favoritesLength,
  handleGantiBarangBonus,
  selectedSkuTemp,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInventory, setFilteredInventory] = useState([]);

  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    limit: 100,
    skip: 0,
    asc: true,
    searchKey: "",
  });

  //zustand
  const { filter: filterZustand, setFilter: setFilterZustand } = useFilter();

  // Initialize filteredInventory when inventoryList changes
  useEffect(() => {
    setFilteredInventory(inventoryList);
  }, [inventoryList]);

  // Update filtered inventory when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInventory(inventoryList);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = inventoryList.filter(
      (item) =>
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
    setFilteredInventory(filtered);
  }, [searchQuery, inventoryList]);

  const handleConfirm = () => {
    setFilter(filterZustand);
    onClose(); // Close modal after confirmation
  };

  // Render item for FlatList
  const renderItem = ({ item, index }) => (
    <View
      className={`flex-row ${
        index % 2 === 0 ? "bg-gray-100" : "bg-white"
      } justify-between items-center p-2`}
    >
      <Text className="w-[16%] text-center">{item.sku}</Text>
      <Text className="w-[16%] text-center">{item.description}</Text>
      <Text className="w-[16%] text-center">{item.quantity}</Text>
      <Text className="w-[16%] text-center">
        {item.RpHargaDasar?.$numberDecimal}
      </Text>
      <TouchableOpacity className="w-[16%] text-center items-center">
        <Star size={20} fill={index < favoritesLength ? "blue" : "gray"} />
      </TouchableOpacity>
      <TouchableOpacity
        className="w-[16%] text-center items-center"
        onPress={() => handleGantiBarangBonus(item.sku)}
      >
        <Text
          className={` text-center ${
            selectedSkuTemp === item.sku ? "bg-green-400" : "bg-gray-300"
          } p-2 rounded-md`}
        >
          Pilih
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ganti Barang Bonus Menjadi</Text>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari SKU atau Deskripsi..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Header Tabel */}
            <View className="flex-row justify-between p-2 bg-gray-200">
              <Text className="w-[16%] text-center font-bold">Sku</Text>
              <Text className="w-[16%] text-center font-bold">Deskripsi</Text>
              <Text className="w-[16%] text-center font-bold">Jumlah</Text>
              <Text className="w-[16%] text-center font-bold">Harga</Text>
              <Text className="w-[16%] text-center font-bold">Favorit</Text>
              <Text
                onPress={handleConfirm}
                className="w-[16%] text-center font-bold"
              >
                Pilih
              </Text>
            </View>

            {/* Inventory List */}
            <View style={styles.listContainer}>
              <FlatList
                data={filteredInventory}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                style={styles.tableList}
                keyboardShouldPersistTaps="handled"
              />
            </View>

            {/* Bottom Buttons */}
            <View style={styles.modalFooter}>
              <Button title="Batal" onPress={onClose} color="gray" />
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    width: "90%",
    maxHeight: "90%",
    flex: 1,
    marginVertical: 40,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 16,
    alignSelf: "center",
  },
  searchContainer: {
    marginBottom: 8,
    width: "100%",
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    marginVertical: 8,
    overflowY: "auto",
  },
  tableList: {
    width: "100%",
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
});

export default PilihInventoryModal;
