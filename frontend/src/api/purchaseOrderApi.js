import axios from "axios";
import { BASE_URL } from "./constant";

export const importCsvPo = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/importPurchaseOrder`,
    formData,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const getPurchaseOrderList = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/purchaseOrder/getAllPurchaseOrder`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const updatePurchaseOrder = async (body) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/purchaseOrder/updatePurchaseOrder`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const createPurchaseOrder = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/createPurchaseOrder`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const deletePurchaseOrder = async (orderId) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/v1/purchaseOrder/deletePurchaseOrder/${orderId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

//purcahseOrder receive
export const scanErp = async (body) => {
  const resposne = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/scanErp`,
    body,
    {
      withCredentials: true,
    }
  );
  return resposne.data;
};

export const scanBarcode = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/scanBarcode`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const completeAllPurchaseOrder = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/completeAllPurchaseOrder`,
    body,
    {
      withCredentials: true,
    }
  );
  return response?.data;
};

export const manualEditPurchaseOrder = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/purchaseOrder/manualEditPurchaseOrder`,
    body,
    {
      withCredentials: true,
    }
  );
  return response?.data;
};

export const getPurchaseOrderByStatus = async (queryKey) => {
  // Buat query string dari parameter
  const queryParams = new URLSearchParams();
  if (queryKey?.status) queryParams.append("status", queryKey?.status);
  if (queryKey?.limit) queryParams.append("limit", queryKey?.limit);
  if (queryKey?.page) queryParams.append("page", queryKey?.page);
  if (queryKey?.search) queryParams.append("search", queryKey?.search);

  const response = await axios.get(
    `${BASE_URL}/api/v1/purchaseOrder/getPurchaseOrderByStatus?${queryParams.toString()}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
