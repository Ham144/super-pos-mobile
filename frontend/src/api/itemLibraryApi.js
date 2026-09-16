import axios from "axios";
import { BASE_URL } from "./constant";

const buildInventoryQueryString = (extractedQuery = {}) => {
  const queries = [];
  Object.keys(extractedQuery).forEach((key) => {
    const value = extractedQuery[key];
    if (value === "" || value === null || value === undefined) return;
    // jangan kirim false — di query string "false" jadi truthy di backend lama
    if (value === false) return;
    if (Array.isArray(value) && value.length === 0) return;
    queries.push(`${key}=${encodeURIComponent(value)}`);
  });
  return queries.join("&");
};

export const getAllinventories = async (queryKeyOrParams) => {
  const extractedQuery =
    queryKeyOrParams?.queryKey?.[1] ?? queryKeyOrParams ?? {};

  const url = `${BASE_URL}/api/v1/inventories/getAllinventories?${buildInventoryQueryString(
    extractedQuery,
  )}`;

  const response = await axios.get(url, {
    withCredentials: true,
  });

  // Nested pagination shape (legacy)
  if (response?.data?.data?.data) {
    return {
      data: response?.data?.data?.data,
      total: response?.data?.data?.total,
      totalItems:
        response?.data?.data?.totalItems ?? response?.data?.data?.total,
      totalPages: response?.data?.totalPages,
      currentPage: response?.data?.currentPage,
      hasMore: response?.data?.hasMore,
      nextPage: response?.data?.nextPage,
      outletMode: response?.data?.outletMode,
      stockSource: response?.data?.stockSource,
      navError: response?.data?.navError,
    };
  }

  return response.data;
};

export const getInventoryById = async (skuId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/inventories/getInventoryById`,
      {
        params: { skuId },
        withCredentials: true,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory details:", error);
    throw error;
  }
};

export const perbaruiInventoryDariUnlisted = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/unlistedLibraries/getUnlistedLibraryByQueries`,
    {
      withCredentials: true,
    },
  );
  return response;
};

export const updateSingleInventory = async (body) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/inventories/updateSingleInventori`,
    body,
    {
      withCredentials: true,
    },
  );
  return response;
};

export const createSingleInventory = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/inventories/registerSingleInventori`,
    body,
    {
      withCredentials: true,
    },
  );
  return response;
};

export const updateBulkPrices = async (updates) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/inventories/updateBulkPrices`,
    { updates },
    { withCredentials: true },
  );
  return response.data;
};

export const importInventoryCsv = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(
    `${BASE_URL}/api/v1/inventories/importInventoryCsv`,
    formData,
    {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

export const toggleDisableInventory = async (id) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/unlistedLibraries/toggleDisableInventory/${id}`,
    {},
    {
      withCredentials: true,
    },
  );
  return response.data;
};
