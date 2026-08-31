import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllBrands = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/brand/getAllBrands`, {
    withCredentials: true,
  });
  return response;
};

export const getBrandByOutletId = async (outletId) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/brand/getBrandByOutletId/${outletId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};