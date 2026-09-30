import axios from "axios";
import { BASE_URL } from "./constant";

const base = `${BASE_URL}/api/v1/external-product-reference`;

export const getExternalProductConfigByOutlet = async (outletId) => {
  const response = await axios.get(`${base}/outlet/${outletId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const saveExternalProductConfigByOutlet = async (outletId, body) => {
  const response = await axios.put(`${base}/outlet/${outletId}`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const deleteExternalProductConfigByOutlet = async (outletId) => {
  const response = await axios.delete(`${base}/outlet/${outletId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const syncExternalProductByOutlet = async (outletId, body = {}) => {
  const response = await axios.post(
    `${base}/outlet/${outletId}/sync`,
    body,
    { withCredentials: true },
  );
  return response.data;
};
