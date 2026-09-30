import axios from "axios";
import { BASE_URL } from "./constant";

export const getDashboardData = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/dashboard`, {
    withCredentials: true,
  });
  return response.data;
};

export const getSalesReportData = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/sales-report`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};

export const getSpgSalesData = async (params) => {
  const response = await axios.get(`${BASE_URL}/api/v1/dashboard/spg-sales`, {
    withCredentials: true,
    params,
  });
  return response.data;
};

export const getRankingSpgKasir = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/ranking-spg-kasir`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};

export const getSimpleOverview = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/dashboard/simple-overview`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getPaymentMethodRanking = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/rangking-payment-method`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};
//endpoint untuk mendapatkan pengelompokan paymentmethod beserta detail transaksi invoicenya
export const downloadRangkingPaymentMethodDetail = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/dashboard/download-rangking-payment-method-detail`,
    {
      body,
    },
    { withCredentials: true }
  );
  return response.data;  
};

export const endOfDayBySku = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/end-of-day-by-sku`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};
