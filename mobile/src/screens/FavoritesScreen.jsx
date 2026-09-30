import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ToastAndroid,
  TextInput,
  Alert,
} from "react-native";
import RegisterInvoice from "../components/RegisterInvoice";
import AddItemLockOverlay from "../components/AddItemLockOverlay";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackageSearch, Search, X } from "lucide-react-native";
import { useCurrentBill } from "../store";
import { useIsFocused } from "@react-navigation/native";
import { getThumbnail, extractThumbnailBase64 } from "../api";
import {
  filterVisibleInventories,
  loadRemovedInventorySkus,
} from "../utils/inventoryFilters";

const FavoritesScreen = () => {
  const [favoriteItems, setFavoriteItems] = useState(null);
  const [inventoriesOffline, setInventoriesOffline] = useState();
  const [searchQuery, setSearchQuery] = useState("");
  const isFocused = useIsFocused();

  const { addToCurrentBill, createCurrentBill, _id } = useCurrentBill();

  const loadFavoritesFromSync = async (inventories) => {
    try {
      const skusRaw = await AsyncStorage.getItem("favoritedInventorySkus");
      const favoritedSkus = skusRaw ? JSON.parse(skusRaw) : [];
      const joined = (favoritedSkus ?? [])
        .map((sku) => inventories?.find((inv) => inv.sku === sku))
        .filter(Boolean);

      setFavoriteItems(joined);

      const withThumbnails = await Promise.all(
        joined.map(async (item) => {
          if (item?.thumbnail) return item;
          try {
            const response = await getThumbnail(item._id);
            const base64Data = extractThumbnailBase64(response);
            if (base64Data) {
              return { ...item, thumbnail: base64Data };
            }
          } catch (error) {
            // thumbnail optional
          }
          return item;
        })
      );

      setFavoriteItems(withThumbnails);
    } catch (error) {
      ToastAndroid?.show(
        "gagal mengambil daftar favorit",
        ToastAndroid.SHORT
      );
    }
  };

  const handleGetInventoriesOfflie = async () => {
    const inventoriesOff = filterVisibleInventories(
      JSON.parse(await AsyncStorage.getItem("inventories")),
      await loadRemovedInventorySkus(AsyncStorage)
    );
    if (!inventoriesOff) {
      return ToastAndroid?.show(
        "Inventori belum didownload, silahkan lakukan syncronize dulu"
      );
    }
    setInventoriesOffline(inventoriesOff);
    return inventoriesOff;
  };

  const filteredFavorites = favoriteItems?.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.sku?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.brand?.toLowerCase().includes(searchLower)
    );
  });

  const HandleAddToInvoice = async (item) => {
    const matchInventories = inventoriesOffline.find((inv) => {
      return inv.sku == item.sku;
    });
    if (!matchInventories) {
      ToastAndroid?.show(
        "Terjadi kesalahan, favorite yang dipilih tidak ditemukan di local inventories"
      );
      return;
    }

    const currentBillItem = useCurrentBill
      .getState()
      .currentBill?.find((bill) => bill.sku === item.sku);
    const currentQuantity = currentBillItem?.quantity || 0;
    const remainingQuantity = matchInventories.quantity;

    if (currentQuantity + 1 > remainingQuantity) {
      Alert.alert(
        "Peringatan Stok",
        `Stok tersisa hanya ${remainingQuantity} unit. Anda sudah memilih ${currentQuantity} unit.`,
        [
          {
            text: "Batal",
            style: "cancel",
          },
          {
            text: "Tetap Tambah",
            style: "destructive",
            onPress: () => {
              const bill = {
                sku: matchInventories.sku,
                description: matchInventories.description,
                quantity: 1,
                RpHargaDasar: matchInventories?.RpHargaDasar?.$numberDecimal,
                limitQuantity: matchInventories.quantity,
              };
              addToCurrentBill(bill);
            },
          },
        ]
      );
      return;
    }

    const bill = {
      sku: matchInventories.sku,
      description: matchInventories.description,
      quantity: 1,
      RpHargaDasar: matchInventories?.RpHargaDasar?.$numberDecimal,
      limitQuantity: matchInventories.quantity,
    };
    addToCurrentBill(bill);
  };

  const handleCreateCurrentBill = async (item) => {
    const matchInventories = inventoriesOffline.find((inv) => {
      return inv.sku == item.sku;
    });
    if (!matchInventories) {
      ToastAndroid?.show(
        "Terjadi kesalahan, favorite yang dipilih tidak ditemukan di local inventories"
      );
      return;
    }

    if (matchInventories.quantity <= 0) {
      Alert.alert(
        "Peringatan Stok",
        `Stok tersisa hanya ${matchInventories.quantity} unit.`,
        [
          {
            text: "Batal",
            style: "cancel",
          },
          {
            text: "Tetap Buat",
            style: "destructive",
            onPress: () => {
              const bill = {
                sku: matchInventories.sku,
                description: matchInventories.description,
                quantity: 1,
                RpHargaDasar: matchInventories?.RpHargaDasar?.$numberDecimal,
                limitQuantity: matchInventories.quantity,
              };
              createCurrentBill(bill);
            },
          },
        ]
      );
      return;
    }

    const bill = {
      sku: matchInventories.sku,
      description: matchInventories.description,
      quantity: 1,
      RpHargaDasar: matchInventories?.RpHargaDasar?.$numberDecimal,
      limitQuantity: matchInventories.quantity,
    };
    createCurrentBill(bill);
  };

  useEffect(() => {
    handleGetInventoriesOfflie().then(async (inventories) => {
      if (inventories) {
        await loadFavoritesFromSync(inventories);
      }
    });
  }, [isFocused]);

  return (
    <View className="flex-1 bg-white flex-row pt-1">
      <View className="w-1/2 border-r border-gray-300">
        <View className="px-2 py-2 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-700"
              placeholder="Cari favorit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView className="flex-1 px-2 py-1">
          {filteredFavorites?.length ? (
            <View className="flex-row flex-wrap gap-y-2">
              {filteredFavorites.map((item, index) => (
                <TouchableOpacity
                  disabled={item.isDisabled}
                  key={item._id || item.sku || index}
                  className="w-1/3  border-t border-b border-gray-300 rounded-xl relative"
                  onPress={() => {
                    if (!_id) {
                      handleCreateCurrentBill(item);
                    } else {
                      HandleAddToInvoice(item);
                    }
                  }}
                >
                  <View className="w-full justify-between flex-row gap-x-4 rounded-t-lg">
                    <Text className="font-aldrich">{item.brand}</Text>
                  </View>
                  <View className="items-center self-center">
                    {item?.thumbnail ? (
                      <Image
                        source={{
                          uri: item.thumbnail.startsWith("data:")
                            ? item.thumbnail
                            : `data:image/jpeg;base64,${item.thumbnail}`,
                        }}
                        style={{
                          width: 120,
                          height: 120,
                          resizeMode: "cover",
                        }}
                      />
                    ) : (
                      <PackageSearch
                        style={{
                          width: 120,
                          height: 120,
                        }}
                        size={90}
                        color={"black"}
                      />
                    )}
                  </View>
                  <View className="p-2">
                    <Text className="font-aldrich">
                      {item?.sku || ""}
                    </Text>
                    <View className="flex-row justify-start gap-x-2 mt-1">
                      <Text className="text-gray-600 font-aldrich">
                        Rp{" "}
                        {inventoriesOffline?.find((inv) => inv.sku == item.sku)
                          ?.RpHargaDasar?.$numberDecimal || 0}
                      </Text>
                      <Text className="text-gray-600 font-bold font-aldrich">
                        Qtty{" "}
                        {inventoriesOffline?.find((inv) => inv.sku == item.sku)
                          ?.quantity || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 h-full items-center justify-center w-full">
              <Text className="text-gray-600 font-bold font-aldrich">
                {searchQuery
                  ? "Tidak ada hasil pencarian"
                  : "Tidak ada favorite"}
              </Text>
            </View>
          )}
        </ScrollView>
        <AddItemLockOverlay />
      </View>

      <RegisterInvoice />
    </View>
  );
};

export default FavoritesScreen;
