import axios from "axios";
import { BASE_URL } from "./constant";

export const login = async (body) => {
  const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, body, {
    withCredentials: true,
  });
  return response?.data;
};

export const loginLdap = async (body) => {
  const response = await axios.post(`${BASE_URL}/api/v1/auth/ldap`, body, {
    withCredentials: true,
  });
  return response?.data;
};

export const createNewUser = async (body) => {
  if (body.roleName === "SPG") {
    throw new Error(
      "Error: SPG Bukanlah jenis akun, pergi kehalaman spg untuk mendaftar spg"
    );
  }
  const response = await axios.post(
    `${BASE_URL}/api/v1/auth/createNewUser`,
    body,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

export const getUserInfo = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/getUserInfo`, {
      withCredentials: true,
    });
    return response.data; 
  } catch (error) {
    if (error?.response?.data?.code === "OUTLET_ACCESS_REVOKED") {
      throw error;
    }
    console.log(error);
    return false;
  }
};

export const getAllAccount = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/auth/getAllAccount`, {
    withCredentials: true,
  });
  return response.data;
};

export const updateUser = async (body) => {
  if (body.type != "SPG" && body.roleName === "") {
    throw new Error("Role name diperlukan");
  }

  // Pastikan kodeKasir tersedia dan valid
  if (body.kodeKasir && body.kodeKasir.length !== 3) {
    throw new Error("Kode Kasir harus terdiri dari 3 karakter");
  }

  const response = await axios.put(`${BASE_URL}/api/v1/auth/updateUser`, body, {
    withCredentials: true,
  });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await axios.get(
    `${BASE_URL}/api/v1/auth/getUserById/${id}`,
    {
      withCredentials: true,
    }
  );
  return response?.data;
};

export const logout = async () => {
  const response = await axios.delete(`${BASE_URL}/api/v1/auth/logout`, {
    withCredentials: true,
  });
  return response.data;
};
