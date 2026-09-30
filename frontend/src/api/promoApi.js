import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllBarangPromo = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/promo/getAllPromo`, {
    withCredentials: true,
  });
  return response.data;
};

export const buatPromoBaru = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/promo/registerPromo`,
    body,
    {
      withCredentials: true,
    }
  );
  return response;
};

export const updatePromo = async (body) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/promo/updatePromo`,
    body,
    {
      withCredentials: true,
    }
  );
  return response;
};

export const deletePromo = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/promo/deletePromo/${id}`,
    {
      withCredentials: true,
    }
  );
  return response;
};

export const getAllPromoByProduct = async (sku) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/promo/getAllPromoByProduct`,
    {
      params: { sku },
      withCredentials: true,
    },
  );
  return response;
};

export const importPromoCsv = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(
    `${BASE_URL}/api/v1/promo/importPromoCsv`,
    formData,
    {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }
  );
  return response.data;
};
