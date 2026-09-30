import axios from "axios";
import { BASE_URL } from "./constant";

export const getInventoryStats = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/inventoryStat/getInventoryStats`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const searchInventoryByStockCategory = async (queryKey) => {
  const queries = queryKey?.queryKey[1];

  // Buat query string dari parameter
  const queryParams = new URLSearchParams();
  if (queries.category) queryParams.append("category", queries.category);
  if (queries.limit) queryParams.append("limit", queries.limit);
  if (queries.page) queryParams.append("page", queries.page);
  if (queries.search) queryParams.append("search", queries.search);

  const response = await axios.get(
    `${BASE_URL}/api/v1/inventoryStat/searchInventoryByStockCategory?${queryParams.toString()}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
