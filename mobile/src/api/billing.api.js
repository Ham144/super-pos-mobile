import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const voidBillStateless = async ({ invoiceId }) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/void`,
      { invoiceId },
      { headers: await getMobileAuthHeaders() },
    );
    return response.data;
  };

  
export const editLinesStateless = async ({
    invoiceId,
    currentBill,
    diskon,
    removeSkus,
  }) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/edit-lines`,
      { invoiceId, currentBill, diskon, removeSkus },
      { headers: await getMobileAuthHeaders() },
    );
    return response.data;
  };
  
  /** Stateless outlet bill flow — NOT sync-offline-mode */
export const cetakBillStateless = async (bill) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/cetak-bill`,
      { bill },
      { headers: await getMobileAuthHeaders() },
    );
    return response.data;
  };
  

  
export const approveDiscountStateless = async ({ invoiceId, approved = true }) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/approve-discount`,
      { invoiceId, approved },
      { headers: await getMobileAuthHeaders() },
    );
    return response.data;
  };

  export const getAllBill = async () => {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/invoice/getAllInvoice`,
      {
        headers: {
          mobile: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  };
  

  //multi bill
export const sendKwitansiViaEmail = async () => {
  try {
    const billTersimpanOffline = JSON.parse(await AsyncStorage.getItem("bill"));
    //filter yg belum terkirim saja
    if (!billTersimpanOffline?.length) {
      return;
    }
    const filteredBillTersimpanOffline = billTersimpanOffline?.filter(
      (item) => !item?.isPrintedKwitansi || item?.isPrintedKwitansi == false,
    );
    if (!filteredBillTersimpanOffline?.length) {
      return;
    }
    await axios
      .post(
        `${await getBaseUrl()}/api/v1/kwitansi/sendKwitansiViaEmail`,
        filteredBillTersimpanOffline,
        {
          headers: await getMobileAuthHeaders(),
        },
      )
      .then((response) => {})
      .catch((error) => {
        console.log(error);
        Platform.OS == "android" &&
          ToastAndroid?.show(
            "error di sendKwitansiViaEmail",
            ToastAndroid.SHORT,
          );
      });
    Platform.OS == "android" &&
      ToastAndroid?.show(response?.data?.message, ToastAndroid.SHORT);
  } catch (error) {
    return error?.response?.data?.message;
  }
};
