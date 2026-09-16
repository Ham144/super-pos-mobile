import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import { ToastAndroid } from "react-native";

//--------------------PROMO---------------------
export const getAllPromo = async () => {
    try {
      const response = await axios.get(
        `${await getBaseUrl()}/api/v1/promo/getAllPromo`,
        {
          headers: await getMobileAuthHeaders(),
        },
      );
  
      if (!response?.data) {
        ToastAndroid?.show(
          "Data promo kosong",
          ToastAndroid.SHORT,
        );
      }
  
      return response.data;
    } catch (error) {
      ToastAndroid?.show(
        error.response?.data.message || "terjadi kesalahan saat ambil data promo",
        ToastAndroid.SHORT,
      );
      throw error;
    }
  };
  
  export const getAllPromoByProduct = async (sku) => {
    try {
      const response = await axios.get(
      `${await getBaseUrl()}/api/v1/promo/getAllPromoByProduct/${sku}`,
      {
        headers: await getMobileAuthHeaders(),
      },
    );
    return response.data;
    } catch (error) {
      ToastAndroid?.show(
        error.response?.data.message || "terjadi kesalahan saat ambil data promo",
        ToastAndroid.SHORT,
      );
      throw error;
    }
  };