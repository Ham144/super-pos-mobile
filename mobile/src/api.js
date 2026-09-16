import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl, getMobileAuthHeaders } from "./constant";
import { createMidtransPayment, getMidtransPaymentStatus, initializePaymentMethod, getPaymentMethodRanking, bayarStateless } from "./api/payment.api.js";
import { voidBillStateless, editLinesStateless, cetakBillStateless, approveDiscountStateless, getAllBill } from "./api/billing.api.js";
import { printTest, printCetakBillCustomer, printCetakKwitansi, printCetakHelper, printSettlement, printCetakEOD, getPrinterConfigs } from "./api/printer.api.js";
import { login, loginLdap, getUserInfo } from "./api/user.api.js";
import { getAllInventoriesOnlineInitial, searchInventoriesOffline } from "./api/product.api.js";
import { getAllPromo, getAllPromoByProduct } from "./api/promo.api.js";
import { getAllCustomer, deleteCustomer, getCustomerList } from "./api/customer.api.js";

// Re-export shared helpers so existing `from "../api"` callers keep working
export { getBaseUrl, getMobileAuthHeaders };

//--------------------DISKON---------------------
export const getAllDiskon = async () => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/diskon/getAllDiskon`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const getAllDiskonByProduct = async (sku) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/diskon/getAllDiskonByProduct/${sku}`,
    {
      headers: {
        mobile: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

//--------------------VOUCHER---------------------
export const getAllVouchers = async () => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/voucher/getAllVouchers`,
    {
      headers: await getMobileAuthHeaders(),
    },
  );
  return response.data;
};

export const getAllVoucherTerblokirByProduct = async (sku) => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/voucher/getAllVoucherTerblokirByProduct/${sku}`,
    {
      headers: await getMobileAuthHeaders(),
    },
  );
  return response.data;
};

export const deleteFromKirimNanti = async (_id) => {
  try {
    const kirimNantiBill = JSON.parse(
      await AsyncStorage.getItem("kirimNantiKwitansi"),
    );
    const updatedKirimNantiBill = kirimNantiBill.filter(
      (item) => item._id !== _id,
    );
    await AsyncStorage.setItem(
      "kirimNantiKwitansi",
      JSON.stringify(updatedKirimNantiBill),
    );
  } catch (error) {
    console.log("gagal menghapus dari kirim nanti", error);
  }
};

export const getAllSpg = async () => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/spg/spgList/mobile`,
    {
      headers: await getMobileAuthHeaders(),
    },
  );
  return response.data;
};


export const getIsEnabledFitur = async () => {
  const response = JSON.parse(await AsyncStorage.getItem("fiturEnabled"));
  return response;
};

export const getOuletByUserId = async (userId) => {
  try {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/outlet/getOutlet/${userId}`,
      {
        headers: await getMobileAuthHeaders(),
      },
    );
    return response?.data;
  } catch (error) {
    return error?.response?.data?.message;
  }
};

export const getThumbnail = async (itemId) => {
  const baseUrl = await getBaseUrl();
  const id = itemId?.$oid ?? itemId;
  try {
    const response = await axios.get(`${baseUrl}/api/v1/thumbnail/get/${id}`, {
      headers: await getMobileAuthHeaders(),
    });
    return response?.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message);
  }
};

export const extractThumbnailBase64 = (response) => {
  if (!response) return null;
  if (typeof response === "string") return response;
  return (
    response?.data?.base64 ??
    response?.base64 ??
    response?.data?.data?.base64 ??
    (typeof response?.data === "string" ? response.data : null) ??
    null
  );
};

//test URL BASE
export const pingBackend = async (BE) => {
  try {
    console.log(BE);
    const response = await axios.get(`${BE}/api/v1/ping`);
    return response?.status === 200;
  } catch (error) {
    console.error("Ping error:", error);
    return false;
  }
};

export const getisOnline = async () => {
  const response = await axios.get(`${await getBaseUrl()}/api/v1/ping`);
  const isOnline = response?.data?.online ? true : false;
  return isOnline;
};

export const voucherRedeem = async (voucherCode, outletId) => {
  const token = await AsyncStorage.getItem("token");
  const response = await axios.post(
    `${await getBaseUrl()}/api/v1/voucher/privateVoucherRedemption`,
    {
      voucherCode,
      outletId,
    },
    {
      headers: await getMobileAuthHeaders(),
    },
  );

  return response.data;
};

export const endOfDayBySku = async (params) => {
  const response = await axios.get(
    `${await getBaseUrl()}/api/v1/dashboard/end-of-day-by-sku`,
    {
      params,
      headers: await getMobileAuthHeaders(),
    },
  );
  return response.data;
};


export { createMidtransPayment, getMidtransPaymentStatus, initializePaymentMethod, getPaymentMethodRanking, bayarStateless, voidBillStateless, editLinesStateless, cetakBillStateless, approveDiscountStateless, getAllBill, printTest, printCetakBillCustomer, printCetakKwitansi, printCetakHelper, printSettlement, printCetakEOD, getPrinterConfigs, login, loginLdap, getUserInfo, getAllInventoriesOnlineInitial, getAllPromo, getAllPromoByProduct, searchInventoriesOffline, getAllCustomer, deleteCustomer, getCustomerList };

 