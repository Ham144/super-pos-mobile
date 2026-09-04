import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import DaftartDiskon from "../models/DaftarDiskon.model.js";
import DaftarPromo from "../models/DaftarPromo.model.js";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import Brand from "../models/brand.model.js";
import Outlet from "../models/Outlet.model.js";
import UserRefrensi from "../models/User.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { stackTracingSku } from "../utils/stackTracingSku.js";
import { parseRpHargaDasar } from "../utils/parseRpHargaDasar.js";
import { prepareBulkInventoryUpdates } from "../utils/prepareBulkInventoryUpdates.js";
import { resolveSkuFromReq } from "../utils/resolveSku.js";
import { csvCell, parseCsvFile } from "../utils/csvDelimiter.js";

const resolveUserOutlet = async (userId, userDB) => {
  const user = userDB || (await UserRefrensi.findById(userId));
  if (!user) return null;

  if (user.currentOutlet) {
    const byCurrent = await Outlet.findById(user.currentOutlet);
    if (byCurrent) return byCurrent;
  }

  return Outlet.findOne({ kasirList: { $in: [user._id] } });
};

//ini untuk buat manual inventory, jarang dipake karena biasanya sudah ada didapat dari api pihak ketiga
export const registerSingleInventori = async (req, res) => {
  //cek apakah barang sudah ada
  //simpan semuanya kedatabase
  const {
    sku,
    isDisabled = false,
    quantity,
    RpHargaDasar,
    barcodeItem,
    description,
    brand,
    promos,
    diskons,
    vouchers,
  } = req.body;

  try {
    if (!description) {
      return res.status(400).json({
        message: "gagal membuat inventory, description tidak boleh kosong",
      });
    }
    if (!brand) {
      return res.status(400).json({
        message: "gagal membuat inventory, brand tidak boleh kosong",
      });
    }
    const hargaBaru = parseRpHargaDasar(RpHargaDasar);
    if (hargaBaru === null || hargaBaru < 0) {
      return res.status(400).json({
        message:
          "gagal membuat inventory, harga tidak boleh kurang dari 0 atau tidak valid",
      });
    }

    const response = await InventoryRefrensi.create({
      _id: sku,
      sku,
      description,
      isDisabled,
      quantity: Number(quantity),
      RpHargaDasar: hargaBaru,
      barcodeItem: barcodeItem,
      brand,
    });

    await stackTracingSku(
      response._id,
      req.user.userId,
      "register single inventory: Membuat item baru dari item_library manual",
      "spawn",
      0,
      response?.quantity || 0,
    );

    if (promos) {
      const addPromos = promos.map((promoId) => {
        DaftarPromo.updateOne(
          { _id: promoId },
          { $addToSet: { skuList: sku } },
        );
      });
      await Promise.all(addPromos);
    }
    if (diskons) {
      diskons.map((diskonId) => {
        DaftartDiskon.updateOne(
          { _id: diskonId },
          { $addToSet: { skuList: sku } },
        );
      });
    }

    if (!response) return res.status(400).json({ message: "gagal menyimpan" });
    return res.json({ message: "berhasil register produk ke inventori" });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "gagal menyimpan, produk sudah ada" });
    }
    console.log(error);
    return res.status(400).json({ message: "gagal menyimpan" });
  }
};

//tidak bisa hapus karena kalau dihapus dari database, akan diambil lagi dari pihak ke tiga, disable aja
export const disableSingleInventoriToggle = async (req, res) => {
  const { sku } = req.body;
  if (!sku) {
    return res
      .status(400)
      .json({ message: "tidak berhasil disable, sku diperlukan" });
  }

  try {
    const inventory = await InventoryRefrensi.findOne({ sku });
    if (!inventory) {
      return res.status(400).json({ message: "inventory tidak ditemukan" });
    }

    inventory.isDisabled = !inventory.isDisabled;
    await inventory.save();

    return res.json({ message: "berhasil mengubah status inventory" });
  } catch (error) {
    return res.status(400).json({ message: "gagal mengubah status inventory" });
  }
};

export const toggleDisableInventory = async (req, res) => {
  const { id } = req.params;
  const inventory = await InventoryRefrensi.findOne({ sku: id });
  if (!inventory) {
    return res.status(400).json({ message: "inventory tidak ditemukan" });
  }

  inventory.isDisabled = !inventory.isDisabled;
  await inventory.save();
  return res.json({ message: "berhasil mengubah status inventory" });
};

export const updateSingleInventori = async (req, res) => {
  const {
    sku,
    isDisabled,
    quantity,
    RpHargaDasar,
    barcodeItem,
    description,
    brand,
    promosToAdd,
    promosToDelete,
    diskonsToAdd,
    diskonsToDelete,
    voucherToBlock,
    voucherToOpenBlock,
  } = req.body;

  if (!sku)
    return res
      .status(400)
      .json({ message: "tidak berhasil memperbarui, sku diperlukan" });
  try {
    const item = await InventoryRefrensi.findOne({
      sku: sku.trim(),
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "SKU tidak ditemukan." });
    }

    const hargaBaru = parseRpHargaDasar(RpHargaDasar);
    if (hargaBaru === null || hargaBaru < 0) {
      return res.status(400).json({
        message:
          "gagal memperbarui inventory, harga tidak boleh kurang dari 0 atau tidak valid",
      });
    }

    const numericQuantity =
      typeof quantity === "string" ? parseInt(quantity) : quantity;

    if (numericQuantity !== undefined && numericQuantity !== item.quantity) {
      const category =
        numericQuantity > item.quantity ? "increase" : "decrease";

      if (numericQuantity != item.quantity) {
        await stackTracingSku(
          sku,
          req.user.userId,
          "update single inventory: Mengubah quantity",
          category,
          item.quantity,
          numericQuantity,
        );
      }
    }

    // Update fields
    item.quantity =
      numericQuantity !== undefined ? numericQuantity : item.quantity;
    item.RpHargaDasar = hargaBaru;
    item.isDisabled = isDisabled ?? item.isDisabled;
    item.barcodeItem = barcodeItem ?? item.barcodeItem;
    item.description = description ?? item.description;
    item.brand = brand ?? item.brand;

    await item.save();

    if (promosToDelete) {
      await Promise.all(
        promosToDelete.map((promoId) =>
          DaftarPromo.updateOne(
            { _id: promoId }, // Filter berdasarkan ID promo
            { $pull: { skuList: sku } }, // Hapus sku dari skuList jika ada
          ),
        ),
      );
    }

    if (promosToAdd) {
      await Promise.all(
        promosToAdd.map((promoId) =>
          DaftarPromo.updateOne(
            { _id: promoId }, // Filter berdasarkan ID promo
            { $addToSet: { skuList: sku } }, // Tambahkan sku ke skuList jika belum ada
          ),
        ),
      );
    }

    if (diskonsToAdd) {
      await Promise.all(
        diskonsToAdd.map((diskonId) =>
          DaftartDiskon.updateOne(
            { _id: diskonId },
            { $addToSet: { skuTanpaSyarat: sku } },
          ),
        ),
      );
    }

    if (diskonsToDelete) {
      await Promise.all(
        diskonsToDelete.map((diskonId) =>
          DaftartDiskon.updateOne(
            { _id: diskonId },
            { $pull: { skuTanpaSyarat: sku } },
          ),
        ),
      );
    }

    if (voucherToBlock) {
      await Promise.all(
        voucherToBlock.map((voucherId) =>
          DaftarVoucher.updateOne(
            { _id: voucherId },
            { $addToSet: { skuPengecualian: sku } },
          ),
        ),
      );
    }

    if (voucherToOpenBlock) {
      await Promise.all(
        voucherToOpenBlock.map((voucherId) =>
          DaftarVoucher.updateOne(
            { _id: voucherId },
            { $pull: { skuPengecualian: sku } },
          ),
        ),
      );
    }

    return res.json({ message: "berhasil memperbarui" });
  } catch (error) {
    console.log(error);
    return res.json({ message: "gagal memperbarui" });
  }
};

//(UNTUK WEB) Jangan gunakan ini untuk mobile lagi, rawan rusak karena filter complex
export const getAllinventories = async (req, res) => {
  const {
    startDate,
    endDate,
    page = 1,
    limit = 100,
    asc = false,
    searchKey,
    brandIds, //untuk mengambil brand tertentu saja (jika tidak ada outletid/brandId maka ambil semua inventory)
    //filter untuk menampilkan data item dengan field memiliki nilai saja
    requiredQuantity = false,
    requiredRpHargaDasar = false,
    requiredBarcodeItem = false,
  } = req.query;

  const complex = {};
  if (brandIds) {
    const arrayBrandIds = brandIds?.split(",");
    const brandList = await Brand.find({
      _id: { $in: arrayBrandIds },
    });
    const brandName = brandList.map((brand) => brand.name);
    complex.brand = { $in: brandName };
  }

  if (searchKey) {
    complex.$or = [
      { sku: { $regex: searchKey, $options: "i" } },
      { description: { $regex: searchKey, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    complex.updatedAt = {};
    if (startDate) {
      complex.updatedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      complex.updatedAt.$lte = new Date(endDate);
    }
  }
  if (requiredQuantity) {
    complex.quantity = { $gte: 1 };
  }
  if (requiredRpHargaDasar) {
    complex.RpHargaDasar = { $gt: mongoose.Types.Decimal128.fromString("0") };
  }
  if (requiredBarcodeItem) {
    complex.barcodeItem = { $ne: null };
  }

  const totalItems = await InventoryRefrensi.countDocuments(complex);
  const totalPages = Math.ceil(totalItems / Number(limit));
  const data = await InventoryRefrensi.find(complex)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ updatedAt: asc ? -1 : 1 });

  return res.json({ message: "berhasil", data, totalItems, totalPages });
};

// eksekusi bulk update/setelah validasi baris import
const runBulkInventoryUpdate = async (req, res, updates) => {
  const { prepared, errors, duplicatedSkus } =
    await prepareBulkInventoryUpdates(updates);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Gagal memproses data inventory",
      errors,
      duplicatedSkus,
      details: errors.map((e) => ({
        row: e.row,
        sku: e.sku,
        reason: e.reason,
      })),
    });
  }

  const traceSummary = { spawn: 0, increase: 0, decrease: 0, other: 0 };

  const updateOperations = prepared.map((item) => {
    const setFields = {
      _id: item.sku,
      sku: item.sku,
      RpHargaDasar: item.RpHargaDasar,
      description: item.description,
      quantity: item.quantity,
    };
    if (item.brand) setFields.brand = item.brand;
    if (item.barcodeItem) setFields.barcodeItem = item.barcodeItem;

    return {
      updateOne: {
        filter: { sku: item.sku },
        update: { $set: setFields },
        upsert: true,
      },
    };
  });

  const result = await InventoryRefrensi.bulkWrite(updateOperations);

  for (const item of prepared) {
    if (item.isNew) {
      traceSummary.spawn++;
      await stackTracingSku(
        item.sku,
        req.user.userId,
        "Update Bulk Price - Bulk Import",
        "spawn",
        0,
        item.quantity,
      );
      continue;
    }

    // hanya trace qty jika kolom quantity dikirim eksplisit
    if (!item.quantityProvided) continue;

    const prevQuantity = item.existing?.quantity || 0;
    const receivedQuantity = item.receivedQuantity;
    if (prevQuantity === receivedQuantity) continue;

    const category =
      receivedQuantity > prevQuantity
        ? "increase"
        : receivedQuantity < prevQuantity
          ? "decrease"
          : "other";

    traceSummary[category]++;
    await stackTracingSku(
      item.sku,
      req.user.userId,
      "Update Bulk Price - Bulk Import",
      category,
      prevQuantity,
      receivedQuantity,
    );
  }

  return res.json({
    success: true,
    message: `Berhasil memperbarui ${result.modifiedCount} item & membuat ${
      result.upsertedCount || 0
    } item baru.`,
    updatedCount: result.modifiedCount,
    insertedCount: result.upsertedCount || 0,
    traceSummary,
  });
};

// update harga massal + buat item baru jika belum ada di DB
export const updateBulkPrices = async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Format tidak valid. Harap masukkan array yang tidak kosong.",
    });
  }

  try {
    return await runBulkInventoryUpdate(req, res, updates);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui harga",
      error: error.message,
    });
  }
};

// import CSV inventory (delimiter ;)
export const importInventoryCsv = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "File CSV diperlukan" });
  }

  const filePath =
    file.path || path.join(process.cwd(), "uploads", file.filename);
  let rows = [];

  try {
    const parsed = await parseCsvFile(filePath, ["sku"]);
    rows = parsed.rows
      .map((row) => ({
        sku: csvCell(row, "Sku") || csvCell(row, "SKU"),
        RpHargaDasar: csvCell(row, "Harga Dasar"),
        description: csvCell(row, "Deskripsi"),
        brand: csvCell(row, "Brand"),
        barcodeItem: csvCell(row, "Barcode"),
      }))
      .filter((row) => row.sku);
  } catch {
    return res.status(400).json({ message: "Gagal membaca file CSV" });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  if (!rows.length) {
    return res.status(400).json({ message: "Tidak ada data valid di CSV" });
  }

  try {
    return await runBulkInventoryUpdate(req, res, rows);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal import inventory",
      error: error.message,
    });
  }
};

export const getInventoryById = async (req, res) => {
  try {
    const skuId = resolveSkuFromReq(req);
    if (!skuId) {
      return res.status(400).json({ message: "sku diperlukan" });
    }

    const inventory = await InventoryRefrensi.findOne({
      sku: skuId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Successfully retrieved inventory",
      data: inventory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve inventory",
      error: error.message,
    });
  }
};

// mobile: halaman inventory dari InventoryRefrensi (sumber katalog).
// offline: dipakai dump ke AsyncStorage; stateless: fetch partial/live per page.
export const getAllinventoriesMobile = async (req, res) => {
  const {
    startDate,
    endDate,
    page = 1,
    limit = 50,
    searchKey,
  } = req.query;

  const userDB = await UserRefrensi.findById(req.userId);
  const myOutlet = await resolveUserOutlet(req.userId, userDB);
  const brandIds = myOutlet?.brandIds;
  const brandList = await Brand.find({
    _id: { $in: brandIds },
  });
  const brandName = brandList.map((brand) => brand.name);

  const complex = {
    isDisabled: { $ne: true },
  };
  if (brandName.length > 0) {
    complex.brand = { $in: brandName };
  }
  if (searchKey) {
    complex.$or = [
      { sku: { $regex: searchKey, $options: "i" } },
      { description: { $regex: searchKey, $options: "i" } },
    ];
  }
  if (startDate || endDate) {
    complex.updatedAt = {};
    if (startDate) {
      complex.updatedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      complex.updatedAt.$lte = new Date(endDate);
    }
  }

  const totalItems = await InventoryRefrensi.countDocuments(complex);
  const data = await InventoryRefrensi.find(complex)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ updatedAt: -1 });

  return res.json({
    message: "berhasil",
    data,
    totalItems,
    outletMode: myOutlet?.mode || null,
  });
};
