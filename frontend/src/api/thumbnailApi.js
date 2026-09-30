import axios from "axios";
import { BASE_URL } from "./constant";

export const uploadThumbail = async (body) => {
  const { sku, file } = body;
  const formData = new FormData();
  formData.append("image", file);
  formData.append("sku", sku);
  const response = await axios.post(
    `${BASE_URL}/api/v1/thumbnail/upload`,
    formData,
    {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

export const getImage = async (sku) => {
  if (!sku) return;
  const response = await axios.get(`${BASE_URL}/api/v1/thumbnail/get`, {
    params: { sku },
    withCredentials: true,
  });
  return response.data;
};
