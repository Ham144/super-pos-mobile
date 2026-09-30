import axios from "axios";
import { BASE_URL } from "./constant";

export const uploadDocument = async (formData) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/document/upload`,
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

export const getAllDocuments = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/document/all`, {
    withCredentials: true,
  });
  return response.data;
};

export const getDocumentById = async (id) => {
  const response = await axios.get(`${BASE_URL}/api/v1/document/${id}`, {
    withCredentials: true,
  });
  return response.data;
};
