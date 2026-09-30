import axios from "axios";
import { BASE_URL } from "./constant";

export const getInvoices = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/invoice/getAllInvoice`, {
    withCredentials: true,
  });
  return response.data;
};

export const getInvoicesByStatus = async (queryKey) => {
  const queries = queryKey?.queryKey[1];

  // Buat query string dari parameter
  const queryParams = new URLSearchParams();
  if (queries?.status) queryParams.append("status", queries?.status);
  if (queries?.limit) queryParams.append("limit", queries?.limit);
  if (queries?.page) queryParams.append("page", queries?.page);
  if (queries?.search) queryParams.append("search", queries?.search);
  if (queries?.startDate) queryParams.append("startDate", queries?.startDate);
  if (queries?.endDate) queryParams.append("endDate", queries?.endDate);
  if (queries?.isPrintedKwitansi)
    queryParams.append("isPrintedKwitansi", queries?.isPrintedKwitansi);

  const response = await axios.get(
    `${BASE_URL}/api/v1/invoice/getInvoiceByStatus?${queryParams.toString()}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const getInvoiceStats = async (queryKey) => {
  const queries = queryKey[1];
  // Buat query string dari parameter
  const queryParams = new URLSearchParams();

  // Format tanggal dengan benar (pastikan tidak undefined)
  if (queries?.startDate) {
    queryParams.append("startDate", queries.startDate);
  }

  if (queries?.endDate) {
    queryParams.append("endDate", queries.endDate);
  }

  const url = `${BASE_URL}/api/v1/invoice/getInvoiceStats?${queryParams.toString()}`;

  try {
    const response = await axios.get(url, {
      withCredentials: true,
      timeout: 30000, // Tambahkan timeout 30 detik
    });

    // Verifikasi struktur data
    if (!response.data || !response.data.data) {
      console.error("Response structure is invalid:", response.data);
      return {
        message: "Data tidak valid",
        data: {
          counts: { completed: 0, pending: 0, void: 0 },
          totalSales: 0,
          topSellingItems: [],
        },
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error in getInvoiceStats:", error);
    console.error("Error status:", error.response?.status);
    console.error("Error details:", error.response?.data || error.message);

    // Return fallback data instead of throwing
    console.log("Returning fallback data due to error");
    return {
      message: "Terjadi kesalahan",
      error: error.message,
      data: {
        counts: { completed: 0, pending: 0, void: 0 },
        totalSales: 0,
        topSellingItems: [],
      },
    };
  }
};

export const getInvoiceFilterComplex = async (queryKey) => {
  const queries = queryKey[1];

  // Buat query string dari parameter
  const queryParams = new URLSearchParams();

  // Tambahkan semua parameter yang tidak undefined
  if (queries) {
    Object.entries(queries).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value);
      }
    });
  }

  const queryString = queryParams.toString();

  const response = await axios.get(
    `${BASE_URL}/api/v1/invoice/getInvoiceFilterComplex?${queryString}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const voidInvoice = async (invoiceId) => {
  console.log("invoiceId", invoiceId);
  const response = await axios.post(
    `${BASE_URL}/api/v1/invoice/voidInvoice`,
    {
      invoiceId,
    },
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// Stateless: approve / tolak diskon di bawah harga web (bill pending dari kasir)
export const approveDiscountStateless = async ({ invoiceId, approved }) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/stateless/approve-discount`,
    { invoiceId, approved },
    { withCredentials: true }
  );
  return response.data;
};

// Fungsi untuk mengubah status isPrintedKwitansi menjadi true
export const markInvoiceAsPrinted = async (invoiceId) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/api/v1/invoice/markAsPrinted/${invoiceId}`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getInvoicesByPaymentMethod = async (params) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/paymentMethod/getInvoicesByPaymentMethod/${params.paymentMethod}`,
    {
      withCredentials: true,
      params,
    }
  );
  return response.data;
};
