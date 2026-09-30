import axios from "axios";
import { BASE_URL } from "./constant";

export const getSoapConfigByOutlet = async (outletId) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/soap/outlet/${outletId}`,
    { withCredentials: true },
  );
  return response.data;
};

export const saveSoapConfigByOutlet = async (outletId, body) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/soap/outlet/${outletId}`,
    body,
    { withCredentials: true },
  );
  return response.data;
};
