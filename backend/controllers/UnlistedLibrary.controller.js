/**
 * Segala yang berhubungna dengan produk2 dari api pihak ketiga
 * belum tersimpan didatabase, langsung diambil dari api ke tiga itu
 * status produk adalah unlisted(hampir sama dengan isDisabled bedannya isDisabled tidak boleh dijual tapi sudah terdaftar di DB)
 *
 */

import ConfigUnlistedLibrary from "../models/ConfigUnlistedLibrary.model.js";
import axios from "axios";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import BrandRefrensi from "../models/brand.model.js";
import { stackTracingSku } from "../utils/stackTracingSku.js";

export const updateConfigUnlistedSource = async (req, res) => {
  const {
    baseEndpoint,
    getTokenEndpoint,
    getProductsEndpoint,
    stringQueries,
    start_date,
    end_date,
    cronInterval,
  } = req.body;
  if (!baseEndpoint || !getTokenEndpoint || !getProductsEndpoint) {
    return res.status(400).json({
      message: "gagal menetapkan config unlisted source, ada field yang kurang",
    });
  }
  try {
    console.log(req.body);
    const success = await ConfigUnlistedLibrary.findOneAndUpdate(
      { $or: [{ inUse: true }] },
      {
        baseEndpoint,
        getTokenEndpoint,
        getProductsEndpoint,
        stringQueries,
        start_date: start_date || "",
        end_date: end_date || "",
        cronInterval: cronInterval || 20,
      },
      { upsert: true, new: true }
    );
    if (!success) {
      return res.status(400).json({ message: "gagal menyimpan" });
    }
    return res.json({ message: "berhasil memperbarui config" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "terjadi kesalahan saat menetapkan config unlisted source",
    });
  }
};

export const resetConfigUnlisteredSource = async (req, res) => {
  try {
    const defaultConfig = await ConfigUnlistedLibrary.findOne({
      isDefault: true,
    });
    if (!defaultConfig) {
      return res
        .status(400)
        .json({ message: "default config tidak ditemukan" });
    }
    await ConfigUnlistedLibrary.updateOne(
      { inUse: true },
      {
        baseEndpoint: defaultConfig.baseEndpoint,
        getTokenEndpoint: defaultConfig.getTokenEndpoint,
        getProductsEndpoint: defaultConfig.getProductsEndpoint,
        stringQueries: defaultConfig.stringQueries,
        start_date: defaultConfig.start_date,
        end_date: defaultConfig.end_date,
        cronInterval: defaultConfig.cronInterval,
      }
    );
    return res.json({ message: "berhasil mereset config unlisted source" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "terjadi kesalahan saat mereset config unlisted source",
    });
  }
};

export const getConfigUnlistedSource = async (req, res) => {
  try {
    let config = await ConfigUnlistedLibrary.findOne({
      inUse: true,
    }).select("-latestToken");
    if (!config) {
      config = await ConfigUnlistedLibrary.findOne({
        isDefault: true,
      }).select("-latestToken");
    }
    return res.json({ message: "berhasil", data: config });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mengambil config unlisted source" });
  }
};

export const getUnlistedLibraryByQueries = async (req, res) => {
  try {
    let config = await ConfigUnlistedLibrary.findOne({
      inUse: true,
    });
    if (!config) {
      return res.json({
        message:
          "config aktif tidak tersedia, tentukan config untuk melakukan pencarian unlisted library",
        data: config,
      });
    }
    //coba cek latestToken, kalau ga ada baru refetch token, token pihak 3 berlaku 1 tahun
    const isTokenExistInConfig = config?.latestToken;
    if (!isTokenExistInConfig) {
      try {
        // Siapkan form data untuk request token dengan kredensial hardcoded
        const formData = new URLSearchParams();
        formData.append("grant_type", "client_credentials");

        // Client credentials - STAGE
        // formData.append("client_id", "9b9f51e7-5f90-448f-b65c-34e1d2f0aad5");
        // formData.append(
        //   "client_secret",
        //   "OBHYFp6m84bmJi7eOaxBRSho96L5ieFd5WZNSij2"
        // );

        // Alternative credentials (PROD) - currently disabled
        // formData.append("client_id", "9a9ba26a-49cd-4e50-8b83-307fdc3b6595");
        // formData.append(
        //   "client_secret",
        //   "ZGC5nDglnMb35vvhtA2kxfeKy6daSU8jTksCtp0o"
        // );

        // Old middleware credentials (PROD) - currently disabled
        formData.append("client_id", "9aade7af-13d5-4a18-9881-8ab8f81d44d0");
        formData.append(
          "client_secret",
          "SefW7M5SXtR2z7ZzBIzI6zo5me1e7e4VlJES1Qtp"
        );

        // Request token dengan form data
        const response = await axios.post(
          `${config.baseEndpoint}${config.getTokenEndpoint}`,
          formData,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        // Pastikan response memiliki access_token
        if (!response?.data?.access_token) {
          console.error("Token response tidak valid:", response?.data);
          return res.status(400).json({
            message: "Gagal mendapatkan token, response tidak valid",
            error: response?.data,
          });
        }

        config.latestToken = response?.data?.access_token;
        await config.save();
      } catch (tokenError) {
        console.error("Error saat mendapatkan token:", tokenError);
        return res.status(400).json({
          message: "Gagal mendapatkan token",
          error: tokenError.message,
        });
      }
    }

    //date
    const startDate =
      config.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate = config.end_date || new Date().toISOString().split("T")[0];
    // Bangun query string untuk endpoint
    let queryString = "";
    // Definisikan limit dengan nilai default
    // Tambahkan parameter per_page (default yang sudah ada)
    queryString += config.stringQueries;
    // Tambahkan start_date jika ada
    queryString += `&start_date=${startDate}`;
    // Tambahkan end_date jika ada
    if (config.end_date) {
      queryString += `&end_date=${endDate}`;
    }
    // Tambahkan string queries lainnya jika ada
    if (config.stringQueries) {
      queryString += `&${config.stringQueries}`;
    }

    try {
      const data = await axios.get(
        `${config.baseEndpoint}${config.getProductsEndpoint}${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${config.latestToken}`,
          },
        }
      );

      const rawResult = await data?.data;

      // Validasi data yang diterima
      if (!rawResult || !rawResult.data || !Array.isArray(rawResult.data)) {
        console.error("Data produk tidak valid:", rawResult);
        return res.status(400).json({
          message: "Format data produk tidak valid atau kosong",
          error: rawResult,
        });
      }

      // Format ulang key agar mudah disimpan
      const uniqueBrand = new Set();
      const promises = rawResult?.data?.map(async (item) => {
        try {
          uniqueBrand.add(item?.manufacturer_code);
          await BrandRefrensi.findOneAndUpdate(
            { name: item?.manufacturer_code }, // Cari berdasarkan nama brand
            {
              $addToSet: { skuList: item?.no },
            },
            { upsert: true, new: true } // Buat dokumen baru jika tidak ditemukan (upsert)
          );

          const result = await InventoryRefrensi.create({
            sku: item?.no,
            quantity: 0,
            description: item?.description,
            brand: item?.manufacturer_code,
            barcodeItem: item?.barcode_item,
            RpHargaDasar: 0,
            outlet: req.userDB.currentOutlet,
          });

          console.log(
            "get Unlisted libraries: third party sumber data inventory dipanggil"
          );
          await stackTracingSku(
            result._id,
            req.user.userId,
            "get Unlisted libraries: third party sumber data inventory dipanggil",
            "spawn",
            0,
            result?.quantity || 0
          );
        } catch (error) {
          if (error.code === 11000) {
            // Skip jika duplikat
            console.log(`SKU ${item?.no} duplikat, skip`);
            return null; // Return null untuk yang duplikat
          }
          // Lempar error lain
          throw error;
        }
      });

      const result = await Promise.all(promises);

      // Filter hasil null (duplikasi)
      const filteredResult = result.filter((item) => item !== null);

      if (!filteredResult.length) {
        return res.status(400).json({
          message: "Gagal memperbarui data, semua duplikat atau gagal",
        });
      }

      return res.json({
        message: "Berhasil memperbarui data inventori",
      });
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      return res.status(500).json({
        message: "Terjadi kesalahan pada server",
        error: error.message,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: "Terjadi kesalahan" });
  }
};

export const TogglingDisableInventory = async (req, res) => {
  const { id } = req.params;
  const inventory = await InventoryRefrensi.findOne({ sku: id });
  if (!inventory) {
    return res.status(400).json({ message: "inventory tidak ditemukan" });
  }
  inventory.isDisabled = !inventory.isDisabled;
  await inventory.save();
  return res.json({ message: "berhasil mengubah status inventory" });
};
