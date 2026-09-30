import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllKasir = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/kasir/getAllKasir`, {
    withCredentials: true,
  });
  return response.data;
};

export const editKasir = async (body) => {
  const response = await axios.put(`${BASE_URL}/api/v1/kasir/update`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const registerKasir = async (body) => {
  const response = await axios.post(`${BASE_URL}/api/v1/kasir/register`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const deleteKasir = async (userId) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/kasir/deleteKasir/${userId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
