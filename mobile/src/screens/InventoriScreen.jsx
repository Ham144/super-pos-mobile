import { SquareChevronRight, Search } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerActions } from "@react-navigation/native";

const InventoriScreen = ({ navigation }) => {
  const [inventories, setInventories] = useState([]);
  const [filteredInventories, setFilteredInventories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockFilter, setStockFilter] = useState("all"); // all, low, out

  useEffect(() => {
    loadInventories();
  }, []);

  const loadInventories = async () => {
    try {
      setIsLoading(true);
      const inventoriesData = await AsyncStorage.getItem("inventories");
      if (inventoriesData) {
        const parsedInventories = JSON.parse(inventoriesData);
        // Sort by description (product name) by default
        const sortedInventories = parsedInventories.sort((a, b) =>
          a.description.localeCompare(b.description),
        );
        setInventories(sortedInventories);
        setFilteredInventories(sortedInventories);
      }
    } catch (error) {
      console.error("Error loading inventories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventories();
    setRefreshing(false);
  };

  useEffect(() => {
    filterInventories();
  }, [searchQuery, stockFilter, inventories]);

  const filterInventories = () => {
    let filtered = [...inventories];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.barcodeItem && item.barcodeItem.toLowerCase().includes(query)),
      );
    }

    // Apply stock filter
    if (stockFilter === "low") {
      filtered = filtered.filter(
        (item) => item.quantity > 0 && item.quantity <= 5,
      );
    } else if (stockFilter === "out") {
      filtered = filtered.filter((item) => item.quantity === 0);
    }

    setFilteredInventories(filtered);
  };

  const renderInventoryItem = ({ item }) => {
    // Calculate price display from RpHargaDasar
    const price =
      item.RpHargaDasar && item.RpHargaDasar.$numberDecimal
        ? Number(item.RpHargaDasar.$numberDecimal).toLocaleString("id-ID")
        : "0";

    // Determine stock status for styling
    const stockStatus =
      item.quantity === 0 ? "out" : item.quantity <= 5 ? "low" : "normal";

    const stockStatusStyles = {
      out: "bg-red-100 text-red-700",
      low: "bg-yellow-100 text-yellow-700",
      normal: "bg-green-100 text-green-700",
    };

    return (
      <View className="bg-white p-4 mb-2 rounded-lg shadow-sm border border-gray-100">
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text
              className="font-bold text-gray-800"
              style={{ fontFamily: "gilroyRegular" }}
            >
              {item.description}
            </Text>
            <Text
              className="text-gray-600 text-sm"
              style={{ fontFamily: "gilroyRegular" }}
            >
              SKU: {item.sku}
            </Text>
            {item.barcodeItem && (
              <Text
                className="text-gray-500 text-xs"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Barcode: {item.barcodeItem}
              </Text>
            )}
          </View>
          <View className="justify-center">
            <Text
              className="font-bold text-gray-800"
              style={{ fontFamily: "gilroyRegular" }}
            >
              Rp {price}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mt-2 items-center">
          <View
            className={`px-2 py-1 rounded-full ${stockStatusStyles[stockStatus]}`}
          >
            <Text
              className="text-xs font-medium"
              style={{ fontFamily: "gilroyRegular" }}
            >
              Stok: {item.quantity}
            </Text>
          </View>
          <Text
            className="text-gray-500 text-xs"
            style={{ fontFamily: "gilroyRegular" }}
          >
            Terjual: {item.terjual || 0}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search and filter header */}
      <View className="bg-white px-4 pt-4 pb-2 shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Search size={18} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Cari produk (nama, SKU, barcode)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row justify-end gap-x-3 mb-2">
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              stockFilter === "all" ? "bg-blue-950" : "bg-gray-200"
            }`}
            onPress={() => setStockFilter("all")}
          >
            <Text
              className={stockFilter === "all" ? "text-white" : "text-gray-700"}
            >
              Semua
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              stockFilter === "low" ? "bg-yellow-500" : "bg-gray-200"
            }`}
            onPress={() => setStockFilter("low")}
          >
            <Text
              className={stockFilter === "low" ? "text-white" : "text-gray-700"}
            >
              Stok Menipis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              stockFilter === "out" ? "bg-red-500" : "bg-gray-200"
            }`}
            onPress={() => setStockFilter("out")}
          >
            <Text
              className={stockFilter === "out" ? "text-white" : "text-gray-700"}
            >
              Stok Habis
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inventory list */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            className="mt-2 text-gray-600"
            style={{ fontFamily: "gilroyRegular" }}
          >
            Memuat inventori...
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredInventories}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 12 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Tidak ada produk ditemukan
                </Text>
              </View>
            }
            ListHeaderComponent={
              <View className="flex-row justify-between mb-2">
                <Text
                  className="text-gray-500 text-sm"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Total: {filteredInventories.length} dari {inventories.length}{" "}
                  produk
                </Text>
              </View>
            }
          />
        </>
      )}

      <View className="absolute bottom-14 left-0">
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

export default InventoriScreen;
