import axios from "axios";
import { BASE_URL } from "./constant";

const StackTraceApi = {
  getAllStackTraceSku: async ({
    from,
    to,
    limit = 100,
    page = 1,
    category = "all",
    sku,
    skip,
  } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (limit) params.limit = limit;
    if (page) params.page = page;
    if (skip) params.skip = skip;
    if (sku) params.sku = sku;
    if (category && category !== "all") params.category = category;

    const res = await axios.get(
      `${BASE_URL}/api/v1/stackTraceSku/getAllStackTraceSku`,
      {
        params,
        withCredentials: true,
      }
    );
    return res.data;
  },
};

export default StackTraceApi;
