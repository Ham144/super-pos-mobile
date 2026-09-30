import axios from "axios";
import { BASE_URL } from "./constant";

export const registerSpg = async (body) => {
  const response = await axios.post(`${BASE_URL}/api/v1/spg/register`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const editSpg = async (body) => {
  const response = await axios.put(`${BASE_URL}/api/v1/spg/edit`, body, {
    withCredentials: true,
  });
  return response?.data;
};

export const getAllSpg = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/spg/spgList`, {
    withCredentials: true,
  });
  return response.data;
};

export const deleteSpg = async (spgId) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/spg/disable/${spgId}`,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const getSpgById = async (spgId) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/spg/getSpgById`,
    {
      id: spgId,
    },
    {
      withCredentials: true,
    },
  );
  return response.data;
};
