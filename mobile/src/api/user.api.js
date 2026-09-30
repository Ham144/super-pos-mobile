import axios from "axios";
import { getBaseUrl, getMobileAuthHeaders } from "../constant";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const login = async (username, password) => {
    try {
      const body = {
        username,
        password,
      };
  
      const response = await axios.post(
        `${await getBaseUrl()}/api/v1/auth/loginMobile`,
        body,
      );
  
      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          throw new Error("Username atau password salah");
        } else if (error.response.status === 404) {
          throw new Error(
            "Server tidak ditemukan. Periksa koneksi atau URL server",
          );
        } else {
          throw new Error(
            error.response.data?.message || "Terjadi kesalahan saat login",
          );
        }
      } else if (error.request) {
        // Request was made but no response
        throw new Error(
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda",
        );
      } else {
        // Error in request setup
        throw new Error("Terjadi kesalahan saat memproses permintaan");
      }
    }
  };
  
  export const loginLdap = async (username, password) => {
    try {
      const body = {
        username,
        password,
      };
  
      const response = await axios.post(
        `${await getBaseUrl()}/api/v1/auth/ldapMobile`,
        body,
      );
  
      return response.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 400) {
          throw new Error(
            error.response.data?.message || "Username atau password LDAP salah",
          );
        } else if (error.response.status === 404) {
          throw new Error(
            "Server tidak ditemukan. Periksa koneksi atau URL server",
          );
        } else {
          throw new Error(
            error.response.data?.message || "Terjadi kesalahan saat login LDAP",
          );
        }
      } else if (error.request) {
        throw new Error(
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda",
        );
      } else {
        throw new Error("Terjadi kesalahan saat memproses permintaan");
      }
    }
  };
  
  export const getUserInfo = async () => {
    try {
      const response = await axios.get(
        `${await getBaseUrl()}/api/v1/auth/getUserInfo`,
        {
          headers: await getMobileAuthHeaders(),
        },
      );
      return response?.data;
    } catch (error) {
      const code = error?.response?.data?.code;
      const message =
        error?.response?.data?.message ||
        "Error getUserInfo, gagal mendapatkan userInfo — login ulang";
      console.log(error, message);
      if (code === "OUTLET_REQUIRED" || code === "OUTLET_ACCESS_REVOKED") {
        return {
          userInfo: null,
          outlet: null,
          code,
          message,
        };
      }
      return null;
    }
  };
  