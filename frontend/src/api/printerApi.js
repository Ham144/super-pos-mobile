import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllPrinter = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/printer/getAllPrinter`, {
    withCredentials: true,
  });
  return response.data;
};

export const createPrinter = async (data) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/printer/createPrinter`,
    data,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const updatePrinter = async (id, data) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/printer/updatePrinter/${id}`,
    data,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const deletePrinter = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/printer/deletePrinter/${id}`,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const setDefaultPrinter = async (id) => {
  const response = await axios.patch(
    `${BASE_URL}/api/v1/printer/setDefaultPrinter/${id}`,
    {},
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const testPrinter = async (data) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/printer/printTest`,
    {
      printerIp: data.ipPrinter,
      printerPort: data.portPrinter,
      printerModel: data.tipePrinter,
    },
    {
      withCredentials: true,
    },
  );
  return response.data;
};
