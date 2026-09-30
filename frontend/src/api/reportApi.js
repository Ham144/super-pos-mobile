import axios from "axios";
import { BASE_URL } from "./constant";

export const createReport = async (reportData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/v1/report/createReport`,
      reportData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const getAllReports = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/report/getAllReport`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const updateReport = async (_id, resolved) => {
  const body = { resolved };
  try {
    const response = await axios.put(
      `${BASE_URL}/api/v1/report/updateReport/${_id}`,
      body
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const deleteReport = async (_id) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/v1/report/deleteReport/${_id}`
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
