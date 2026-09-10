import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ToastAndroid,
  FlatList,
  ActivityIndicator,
} from "react-native";
import RegisterInvoice from "../components/RegisterInvoice";
import { Plus } from "lucide-react-native";
import { useCurrentBill, useInventoriesOffline, useLoading } from "../store";
import OptionInventoriesModal from "../components/OptionInventoriesModal";
import FilterInventories from "../components/FilterInventories";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  filterVisibleInventories,
  loadRemovedInventorySkus,
} from "../utils/inventoryFilters";
import { getAllInventoriesOnlineInitial } from "../api";

const PAGE_LIMIT = 50;

const LibrariesScreen = () => {
  const [showfilterModal, setshowFilterModal] = useState(false);
  const [isShowOptionsInventories, setShowOptionsInventories] = useState(false);
  const [selectedItem, setSelectedItem] = useState();
  const [favoritedInventorySkus, setFavoritedInventorySkus] = useState([]);
  const { setLoadingPrinting } = useLoading();
  const [outletMode, setOutletMode] = useState(null); // "stateless" | "offline" | null
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [livePage, setLivePage] = useState(1);
  const [liveHasMore, setLiveHasMore] = useState(true);

  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    limit: 100,
    skip: 0,
    asc: true,
    searchKey: "",
  });
  const [userInfo, setUserInfo] = useState();

  const { _id, addToCurrentBill, createCurrentBill, done } = useCurrentBill();
  const { inventoriesOffline: inventoriList, setInventoriesOffline } =
    useInventoriesOffline();

  const [filteredInventories, setFilteredInventories] = useState([]);
  const searchTimeout = useRef(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState("");
  const intervalIdRef = useRef(null);
  const isStateless = outletMode === "stateless";

  const normalizeInventories = (list = []) =>
    Array.from(
      new Map(
        (list || [])
          .filter((item) => item?.isDisabled !== true)
          .map((item) => [item._id || item.sku, item]),
      ).values(),
    );

  const fetchLiveInventories = useCallback(
    async ({ page = 1, append = false, searchKey = "" } = {}) => {
      setIsLoadingLive(true);
      try {
        const response = await getAllInventoriesOnlineInitial(
          page,
          PAGE_LIMIT,
          searchKey,
        );
        const pageData = normalizeInventories(response?.data || []);
        const totalItems = Number(response?.totalItems || 0);

        setFilteredInventories((prev) => {
          const merged = append ? [...prev, ...pageData] : pageData;
          return normalizeInventories(merged);
        });
        setLivePage(page);
        setLiveHasMore(page * PAGE_LIMIT < totalItems && pageData.length > 0);
      } catch (error) {
        console.log(error);
        ToastAndroid.show(
          error?.response?.data?.message ||
            error.message ||
            "Gagal memuat inventory",
          ToastAndroid.LONG,
        );
      } finally {
        setIsLoadingLive(false);
      }
    },
    [],
  );

  const checkInventoryUpdates = async () => {
    if (isStateless) return;
    try {
      const lastUpdate = await AsyncStorage.getItem("lastInventoryUpdate");
      if (lastUpdate && lastUpdate !== lastUpdateTimestamp) {
        setLastUpdateTimestamp(lastUpdate);

        const storedInventories = filterVisibleInventories(
          JSON.parse(await AsyncStorage.getItem("inventories")),
          await loadRemovedInventorySkus(AsyncStorage),
        );

        setInventoriesOffline(storedInventories);
        handleSearchOffline(storedInventories);
      }
    } catch (error) {
      console.log(error);
      ToastAndroid.show(error.message, ToastAndroid.LONG);
    }
  };

  const handleSearchOffline = (inventories = inventoriList) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      if (!inventories) return;

      const searchTerm = filter.searchKey.toLowerCase();

      const filtered = inventories.filter((product) => {
        return (
          product.description?.toLowerCase().includes(searchTerm) ||
          product.sku?.toLowerCase().includes(searchTerm) ||
          product.barcode?.toLowerCase().includes(searchTerm)
        );
      });

      const uniqueFiltered = Array.from(
        new Map(filtered?.map((item) => [item.sku, item])).values(),
      );

      setFilteredInventories(uniqueFiltered);
    }, 300);
  };

  const handleSearch = () => {
    if (isStateless) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        fetchLiveInventories({
          page: 1,
          append: false,
          searchKey: filter.searchKey,
        });
      }, 300);
      return;
    }
    handleSearchOffline();
  };

  useEffect(() => {
    const bootstrap = async () => {
      const lastUpdate = await AsyncStorage.getItem("lastInventoryUpdate");
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const favoritedRaw = await AsyncStorage.getItem("favoritedInventorySkus");
      const outletRaw = await AsyncStorage.getItem("outlet");

      setFavoritedInventorySkus(favoritedRaw ? JSON.parse(favoritedRaw) : []);
      setLastUpdateTimestamp(lastUpdate || "");
      setUserInfo(userInfoRaw ? JSON.parse(userInfoRaw) : null);

      let mode = null;
      try {
        mode = outletRaw ? JSON.parse(outletRaw)?.mode : null;
      } catch (_) {
        mode = null;
      }
      setOutletMode(mode || "offline");

      if (mode === "stateless") {
        await fetchLiveInventories({ page: 1, append: false, searchKey: "" });
        return;
      }

      const storedInventories = JSON.parse(
        await AsyncStorage.getItem("inventories"),
      );
      const removedSkus = await loadRemovedInventorySkus(AsyncStorage);
      const visibleInventories = filterVisibleInventories(
        storedInventories,
        removedSkus,
      );
      const uniqueInventories = normalizeInventories(visibleInventories);
      setInventoriesOffline(uniqueInventories);
      setFilteredInventories(uniqueInventories);
    };

    bootstrap();
  }, [fetchLiveInventories, setInventoriesOffline]);

  useEffect(() => {
    if (isStateless) return;

    checkInventoryUpdates();
    intervalIdRef.current = setInterval(checkInventoryUpdates, 10000);
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [filter.searchKey, isStateless, lastUpdateTimestamp]);

  useEffect(() => {
    if (isStateless) {
      handleSearch();
      return;
    }
    if (inventoriList) {
      handleSearchOffline();
    }
  }, [inventoriList, filter.searchKey, isStateless]);

  const handleLoadMore = () => {
    if (!isStateless || isLoadingLive || !liveHasMore) return;
    fetchLiveInventories({
      page: livePage + 1,
      append: true,
      searchKey: filter.searchKey,
    });
  };

  const handleCreateCurrentBill = async (item) => {
    setLoadingPrinting(false);
    if (!item?.sku || !item?.RpHargaDasar) {
      ToastAndroid?.show("Item tidak lengkap", ToastAndroid.SHORT);
      return;
    }

    const bill = {
      sku: item.sku,
      description: item?.description,
      quantity: 1,
      RpHargaDasar: item?.RpHargaDasar?.$numberDecimal ?? item?.RpHargaDasar,
      limitQuantity: item.quantity,
      user: userInfo?.username,
    };

    setTimeout(() => {
      createCurrentBill(bill);
    }, 0);
  };

  const HandleAddToInvoice = async (item) => {
    if (!item?.sku || !item?.RpHargaDasar) {
      ToastAndroid?.show("Item tidak lengkap", ToastAndroid.SHORT);
      return;
    }

    const bill = {
      sku: item.sku,
      description: item.description,
      quantity: 1,
      RpHargaDasar: item?.RpHargaDasar?.$numberDecimal ?? item?.RpHargaDasar,
      limitQuantity: item.quantity,
    };

    setTimeout(() => {
      addToCurrentBill(bill);
    }, 0);
  };

  const handleHideFilterModal = () => {
    setshowFilterModal(false);
  };

  const handleShowOptions = (item) => {
    setShowOptionsInventories(true);
    setSelectedItem(item);
  };

  const hargaDasar = (item) =>
    item?.RpHargaDasar?.$numberDecimal ?? item?.RpHargaDasar ?? 0;

  return (
    <View className="flex-1 bg-white flex-row pt-1">
      <View className="w-full absolute ">
        <FilterInventories
          filter={filter}
          setFilter={setFilter}
          handleHideFilterModal={handleHideFilterModal}
          handleSearch={handleSearch}
          showfilterModal={showfilterModal}
          key={"searchbardanfilternya"}
        />
      </View>
      <FlatList
        data={filteredInventories}
        contentContainerStyle={{ paddingBottom: 10, paddingTop: 50 }}
        maxToRenderPerBatch={30}
        initialNumToRender={20}
        keyExtractor={(item) => item?.sku}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isStateless && isLoadingLive ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={done}
            onPress={() => handleShowOptions(item)}
            className={`flex-row items-center justify-between w-full bg-white shadow-md rounded-lg mb-4 p-4 ${
              item?.isDisabled || item?.quantity <= 0 || hargaDasar(item) == 0
                ? "opacity-50"
                : ""
            }`}
          >
            <View style={{ flex: 1 }}>
              <Text
                className="text-gray-800 font-semibold"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {item?.sku || item?.description}
              </Text>

              <Text className="text-sm text-gray-500 mr-2">
                <Text
                  className="font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {favoritedInventorySkus?.includes(item.sku) && "fav"}
                </Text>
              </Text>

              <Text className="text-sm text-gray-500 mr-2">
                Brand:{" "}
                <Text
                  className="font-medium"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  {item?.description || "tidak ada desc"}
                </Text>
              </Text>
            </View>

            <View>
              <Text
                className="text-lg text-green-600 font-bold mr-2"
                style={{ fontFamily: "gilroyRegular" }}
              >
                Rp.{" "}
                {Intl.NumberFormat("id-ID", {
                  currency: "IDR",
                }).format(hargaDasar(item))}
              </Text>
            </View>

            <View className="flex-row items-center justify-center">
              <Text
                className="text-sm text-gray-600 mr-2"
                style={{ fontFamily: "gilroyRegular" }}
              >
                {item?.quantity > 0 ? (
                  <>
                    Stok:{" "}
                    <Text
                      className="font-medium"
                      style={{ fontFamily: "gilroyRegular" }}
                    >
                      {item?.quantity}
                    </Text>{" "}
                    items
                  </>
                ) : (
                  <Text
                    className="text-sm text-red-600 mr-2"
                    style={{ fontFamily: "gilroyRegular" }}
                  >
                    Stok habis {item?.quantity}
                  </Text>
                )}
              </Text>

              {item.isDisabled ? (
                <View className="gap-y-2 flex items-center">
                  <Text
                    className="text-gray-500 text-center"
                    style={{ fontFamily: "gilroyRegular" }}
                  >
                    Item Disabled
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={item?.isDisabled || hargaDasar(item) < 1 || done}
                  className="bg-blue-950 rounded-md text-center px-4 py-2 flex items-center justify-center hover:opacity-25"
                  onPress={() => {
                    setTimeout(() => {
                      if (!_id) {
                        handleCreateCurrentBill(item);
                      } else {
                        HandleAddToInvoice(item);
                      }
                    }, 0);
                  }}
                >
                  <Text
                    className="text-white"
                    style={{ fontFamily: "gilroyRegular" }}
                  >
                    <Plus size={30} color="white" />
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex items-center justify-center">
            <Text
              className="text-lg font-bold text-gray-800"
              style={{ fontFamily: "gilroyRegular" }}
            >
              {isLoadingLive
                ? "Memuat inventori..."
                : "Tidak Ada Inventori yang bisa ditampilkan"}
            </Text>
          </View>
        )}
        windowSize={5}
        removeClippedSubviews={true}
      />

      <RegisterInvoice />
      {isShowOptionsInventories && (
        <OptionInventoriesModal
          isShowOptionsInventories={isShowOptionsInventories}
          setShowOptionsInventories={setShowOptionsInventories}
          selectedItem={selectedItem}
        />
      )}
    </View>
  );
};

export default LibrariesScreen;
