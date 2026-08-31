import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllPaymentMethod = async (params = {}) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/payment/getAllPaymentMethod`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
};

export const createPaymentMethod = async (data) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/payment/createPaymentMethod`,
    data,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const updatePaymentMethod = async (id, data) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/payment/updatePaymentMethod/${id}`,
    data,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const deletePaymentMethod = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/payment/deletePaymentMethod/${id}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const togglePaymentMethodStatus = async (id) => {
  const response = await axios.patch(
    `${BASE_URL}/api/v1/payment/togglePaymentMethodStatus/${id}`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};
