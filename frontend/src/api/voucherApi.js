import axios from "axios";
import { BASE_URL } from "./constant";

export const getAllVouchers = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/voucher/getAllVouchers`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const addVoucherLogic = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/voucher/addVoucherLogic`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const updateVoucherLogic = async (body) => {
  const response = await axios.put(
    `${BASE_URL}/api/v1/voucher/editVoucherLogic`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const deleteVoucher = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/api/v1/voucher/deleteVoucherLogic/${id}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const getAllVoucherByProduct = async (sku) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/voucher/getAllVoucherTerblokirByProduct`,
    {
      params: { sku },
      withCredentials: true,
    },
  );
  return response.data;
};

export const getAllGeneratedVoucher = async () => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/voucher/getAllGeneratedVoucher`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const convertVoucherPublicToGenerated = async (body) => {
  const response = await axios.post(
    `${BASE_URL}/api/v1/voucher/publicVoucherConverting`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};
