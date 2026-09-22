import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const createMidtransPayment = async (invoiceId, bill = null) => {
  const response = await axios.post(
    `${await getBaseUrl()}/api/v1/payment/midtrans/transaction`,
    { invoiceId, ...(bill ? { bill } : {}) },
    { headers: await getMobileAuthHeaders(), timeout: 30000 },
  );
  return response.data?.data;
};


export const getMidtransPaymentStatus = async (invoiceId) => {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/payment/midtrans/status/${encodeURIComponent(invoiceId)}`,
      { headers: await getMobileAuthHeaders(), timeout: 30000 },
    );
    return response.data?.data;
  };
  
  //untuk mengambil data metode pembayaran
export const initializePaymentMethod = async () => {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/payment/getAllPaymentMethod`,
      {
        headers: await getMobileAuthHeaders(),
      },
    );
    return response?.data;
  };
  
  export const getPaymentMethodRanking = async (params) => {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/dashboard/rangking-payment-method`,
      {
        params,
        headers: await getMobileAuthHeaders(),
      },
    );
    return response.data;
  };
  
  
export const bayarStateless = async ({
    invoiceId,
    paymentMethod,
    nomorTransaksi,
    tanggalBayar,
  }) => {
    const response = await axios.post(
      `${await getBaseUrl()}/api/v1/stateless/bayar`,
      { invoiceId, paymentMethod, nomorTransaksi, tanggalBayar },
      { headers: await getMobileAuthHeaders() },
    );
    return response.data;
  };
  