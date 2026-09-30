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
export const cetakBillStateless = async (bill, outletId = null) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/cetak-bill`,
      { bill, ...(outletId ? { outletId } : {}) },
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
  