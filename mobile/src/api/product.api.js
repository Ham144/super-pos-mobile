import AsyncStorage from "@react-native-async-storage/async-storage";
import { filterVisibleInventories, loadRemovedInventorySkus } from "../utils/inventoryFilters";
import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import { ToastAndroid } from "react-native";

//get Offline inventories
export const getAllinventoriesOffline = async (queryKey) => {
    const inventoriOffline = await AsyncStorage.getItem("inventories");
    const removedSkus = await loadRemovedInventorySkus(AsyncStorage);
  
    if (inventoriOffline) {
      const parsedData = filterVisibleInventories(
        JSON.parse(inventoriOffline).map((item) => ({
          ...item,
          terjualFromApp:
            item.terjualFromApp !== undefined ? item.terjualFromApp : 0,
        })),
        removedSkus,
      );
  
      //for libraris screen filter
      const filter = queryKey?.queryKey[1];
  
      const filteredData = parsedData.filter((item) => {
        if (filter?.searchKey === "") {
          if (
            item?.description &&
            !item.description.toLowerCase()?.includes("")
          ) {
            return false;
          }
          if (
            filter?.startDate &&
            item?.startDate &&
            new Date(item.startDate) < new Date(filter.startDate)
          ) {
            return false;
          }
          if (
            filter?.endDate &&
            item?.endDate &&
            new Date(item.endDate) > new Date(filter.endDate)
          ) {
            return false;
          }
          return true; // item passes all conditions if all conditions pass
        }
  
        // If a searchKey is provided
        else {
          let matchesSearchKey = false;
  
          // Check if SKU or description matches the search key
          if (item.sku?.includes(filter?.searchKey)) {
            matchesSearchKey = true;
          }
  
          if (
            item.description
              ?.toLowerCase()
              ?.includes(filter?.searchKey.toLowerCase())
          ) {
            matchesSearchKey = true;
          }
          if (
            item.barcodeItem
              ?.toLowerCase()
              ?.includes(filter?.searchKey.toLowerCase())
          ) {
            matchesSearchKey = true;
          }
          // Date comparisons
          const startDateCondition =
            filter?.startDate &&
            item?.startDate &&
            new Date(item.startDate) < new Date(filter.startDate);
          const endDateCondition =
            filter?.endDate &&
            item?.endDate &&
            new Date(item.endDate) > new Date(filter.endDate);
  
          // Return true if the item matches search key and date filters
          if (matchesSearchKey && !startDateCondition && !endDateCondition) {
            return true;
          }
  
          return false;
        }
      });
  
      if (filter?.limit) {
        filteredData.splice(filter.limit);
      }
      if (filter?.skip) {
        filteredData.splice(0, filter?.skip);
      }
      const response = {
        data: filteredData,
      };
  
      return response;
    } else {
      return { data: [] };
    }
  };

  
// Ambil halaman inventory dari InventoryRefrensi (bukan SOAP).
// offline: dipakai dump awal ke AsyncStorage
// stateless: dipakai live/partial di LibrariesScreen
export const getAllInventoriesOnlineInitial = async (
    page = 1,
    limit = 50,
    searchKey = "",
  ) => {
    const token = await AsyncStorage.getItem("token");
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (searchKey) params.set("searchKey", searchKey);
    
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/inventories/getAllinventoriesMobile?${params.toString()}`,
      {
        headers: await getMobileAuthHeaders(),
      },
    );
    return response?.data;
  };
  
  //offline search
export const searchInventoriesOffline = async (q) => {
    const inventoriOffline = JSON.parse(
      await AsyncStorage.getItem("inventories"),
    );
    if (!inventoriOffline) {
      ToastAndroid?.show("tidak ada inventories offline", ToastAndroid.SHORT);
    } else {
      const filteredInventoriesOffline = inventoriOffline?.filter((item) =>
        item?.sku?.toLowerCase().includes(q?.toLowerCase()),
      );
      if (!filteredInventoriesOffline?.length) {
        ToastAndroid?.show("tidak ada inventories offline", ToastAndroid.SHORT);
      } else {
        return filteredInventoriesOffline;
      }
    }
  };
  