import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllCustomer = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/customer/getAllCustomer`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const editCustomer = async (id, data) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/customer/editCustomer/${id}`,
    data,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/customer/deleteCustomer/${id}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
