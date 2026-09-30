import axios from "axios";
import { BASE_URL } from "./constant";

//this files is deleted, use dashboardApi.js instead

// Get sales report
export const getSalesReport = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/sales-report`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};

// Get SPG sales
export const getSpgSales = async (params) => {
  const response = await axios.get(`${BASE_URL}/api/v1/dashboard/spg-sales`, {
    withCredentials: true,
    params,
  });
  return response.data;
};

// Get sales rankings
export const getSalesRankings = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/sales-rankings`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};

// Get sales summary
export const getSalesSummary = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/dashboard/sales-summary`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};

// Get daily sales
export const getDailySales = async (params) => {
  const response = await axios.get(`${BASE_URL}/api/v1/dashboard/daily-sales`, {
    withCredentials: true,
    params,
  });
  return response.data;
};
