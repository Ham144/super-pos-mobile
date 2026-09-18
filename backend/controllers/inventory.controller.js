import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import DaftartDiskon from "../models/DaftarDiskon.model.js";
import DaftarPromo from "../models/DaftarPromo.model.js";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import Brand from "../models/brand.model.js";
import Outlet from "../models/Outlet.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { stackTracingSku } from "../utils/stackTracingSku.js";
import { parseRpHargaDasar } from "../utils/parseRpHargaDasar.js";
import { prepareBulkInventoryUpdates } from "../utils/prepareBulkInventoryUpdates.js";
import { resolveSkuFromReq } from "../utils/resolveSku.js";
import { csvCell, parseCsvFile } from "../utils/csvDelimiter.js";
import { enrichInventoriesWithNavStock } from "../utils/soapNav/client.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";
import {
  buildSingleInventoryUpdates,
  resolveActorUserId,
} from "../utils/inventoryUpdateHelpers.js";

const parseQueryFlag = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const safeStackTrace = async (payload) => {
  try {
    await stackTracingSku(payload);
  } catch (error) {
    console.error("stackTracingSku:", error?.message || error);
  }
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
      sku,
      description,
      isDisabled,
      quantity: Number(quantity),
      RpHargaDasar: hargaBaru,
      barcodeItem: barcodeItem,
      brand,
      outlet: req.userDB.currentOutlet,
    });

    await safeStackTrace({
      itemId: String(response._id),
      userId: resolveActorUserId(req),
      stackDescription:
        "register single inventory: Membuat item baru dari item_library manual",
      category: "spawn",
      prevQuantity: 0,
      receivedQuantityTrace: response?.quantity || 0,
    });

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
    const inventory = await InventoryRefrensi.findOne({
      sku,
      outlet: req.userDB.currentOutlet,
    });
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
  const inventory = await InventoryRefrensi.findOne({
    sku: id,
    outlet: req.userDB.currentOutlet,
  });
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
    promosToAdd,
    promosToDelete,
    diskonsToAdd,
    diskonsToDelete,
    voucherToBlock,
    voucherToOpenBlock,
  } = req.body || {};

  if (!sku || !String(sku).trim()) {
    return res
      .status(400)
      .json({ message: "tidak berhasil memperbarui, sku diperlukan" });
  }

  const outletId = req.userDB?.currentOutlet;
  if (!outletId) {
    return res.status(400).json({
      message: "currentOutlet belum diset, switch/pilih outlet dulu",
    });
  }

  try {
    const item = await InventoryRefrensi.findOne({
      sku: String(sku).trim(),
      outlet: outletId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "SKU tidak ditemukan di outlet aktif.",
      });
    }

    const built = buildSingleInventoryUpdates(req.body, item);
    if (!built.ok) {
      return res.status(400).json({
        success: false,
        message: built.errors[0] || "data update tidak valid",
        errors: built.errors,
      });
    }

    Object.assign(item, built.$set);
    await item.save();

    if (built.quantityChange) {
      await safeStackTrace({
        itemId: String(item._id),
        userId: resolveActorUserId(req),
        stackDescription: "update single inventory: Mengubah quantity",
        category: built.quantityChange.category,
        prevQuantity: built.quantityChange.prev,
        receivedQuantityTrace: built.quantityChange.next,
      });
    }

    const skuKey = item.sku;

    if (Array.isArray(promosToDelete) && promosToDelete.length) {
      await Promise.all(
        promosToDelete.map((promoId) =>
          DaftarPromo.updateOne(
            { _id: promoId },
            { $pull: { skuList: skuKey } },
          ),
        ),
      );
    }

    if (Array.isArray(promosToAdd) && promosToAdd.length) {
      await Promise.all(
        promosToAdd.map((promoId) =>
          DaftarPromo.updateOne(
            { _id: promoId },
            { $addToSet: { skuList: skuKey } },
          ),
        ),
      );
    }

    if (Array.isArray(diskonsToAdd) && diskonsToAdd.length) {
      await Promise.all(
        diskonsToAdd.map((diskonId) =>
          DaftartDiskon.updateOne(
            { _id: diskonId },
            { $addToSet: { skuTanpaSyarat: skuKey } },
          ),
        ),
      );
    }

    if (Array.isArray(diskonsToDelete) && diskonsToDelete.length) {
      await Promise.all(
        diskonsToDelete.map((diskonId) =>
          DaftartDiskon.updateOne(
            { _id: diskonId },
            { $pull: { skuTanpaSyarat: skuKey } },
          ),
        ),
      );
    }

    if (Array.isArray(voucherToBlock) && voucherToBlock.length) {
      await Promise.all(
        voucherToBlock.map((voucherId) =>
          DaftarVoucher.updateOne(
            { _id: voucherId },
            { $addToSet: { skuPengecualian: skuKey } },
          ),
        ),
      );
    }

    if (Array.isArray(voucherToOpenBlock) && voucherToOpenBlock.length) {
      await Promise.all(
        voucherToOpenBlock.map((voucherId) =>
          DaftarVoucher.updateOne(
            { _id: voucherId },
            { $pull: { skuPengecualian: skuKey } },
          ),
        ),
      );
    }

    return res.json({
      success: true,
      message: "berhasil memperbarui",
      data: item,
    });
  } catch (error) {
    console.error("updateSingleInventori:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "gagal memperbarui",
    });
  }
};

//(UNTUK WEB) Jangan gunakan ini untuk mobile offline dump.
// Stateless: qty di-overlay dari NAV (halaman yang terlihat saja).
export const getAllinventories = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 100,
      asc = false,
      searchKey,
      brandIds, // filter sekunder di dalam outlet
      requiredQuantity = false,
      requiredRpHargaDasar = false,
      requiredRpHargaLowest = false,
      requiredBarcodeItem = false,
    } = req.query;

    const outletId = req.userDB?.currentOutlet;
    if (!outletId) {
      return res.status(400).json({
        message: "currentOutlet belum diset, switch/pilih outlet dulu",
      });
    }

    const outlet = await Outlet.findById(outletId)
      .select("mode namaOutlet kodeOutlet")
      .lean();
    const outletMode = outlet?.mode || null;
    const isStateless = outletMode === "stateless";

    const wantQty = parseQueryFlag(requiredQuantity);
    const wantPrice = parseQueryFlag(requiredRpHargaDasar);
    const wantPriceLowest = parseQueryFlag(requiredRpHargaLowest);
    const wantBarcode = parseQueryFlag(requiredBarcodeItem);
    const sortAsc = parseQueryFlag(asc);

    // multi-tenant: inventory selalu scoped ke outlet aktif
    const complex = { outlet: outletId };

    if (brandIds) {
      const arrayBrandIds = String(brandIds)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (arrayBrandIds.length > 0) {
        const brandList = await Brand.find({
          _id: { $in: arrayBrandIds },
        });
        const brandName = brandList.map((brand) => brand.name);
        if (brandName.length > 0) {
          complex.brand = { $in: brandName };
        }
      }
    }

    if (searchKey) {
      const escaped = String(searchKey).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      complex.$or = [
        { sku: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
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
    // Mongo qty biasanya 0 untuk katalog seed; filter stok lokal hanya untuk offline
    if (wantQty && !isStateless) {
      complex.quantity = { $gte: 1 };
    }
    if (wantPrice) {
      complex.RpHargaDasar = {
        $gt: mongoose.Types.Decimal128.fromString("0"),
      };
    } if (wantPriceLowest) {
      complex.RpHargaLowest = {
        $gt: mongoose.Types.Decimal128.fromString("0"),
      };
    }
    if (wantBarcode) {
      complex.barcodeItem = { $nin: [null, ""] };
    }
   

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.max(1, Number(limit) || 100);
    const totalItems = await InventoryRefrensi.countDocuments(complex);
    const totalPages = Math.ceil(totalItems / pageLimit) || 0;
    const hasMore = pageNum * pageLimit < totalItems;

    let data = await InventoryRefrensi.find(complex)
      .populate("outlet", "namaOutlet kodeOutlet")
      .limit(pageLimit)
      .skip((pageNum - 1) * pageLimit)
      .sort({ updatedAt: sortAsc ? 1 : -1 })
      .lean();

    let stockSource = "local";
    let navError = null;

    if (isStateless && data.length) {
      const enriched = await enrichInventoriesWithNavStock(outletId, data, {
        // GetStatelessInventory invalid di NAV CSI — pakai multiple
        operationKey: NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
      });
      data = enriched.inventories;
      stockSource = enriched.stockSource;
      navError = enriched.navError;
    }

    return res.json({
      message: "berhasil",
      data,
      totalItems,
      totalPages,
      page: pageNum,
      limit: pageLimit,
      hasMore,
      nextPage: hasMore ? pageNum + 1 : null,
      outletMode,
      stockSource,
      ...(navError ? { navError } : {}),
    });
  } catch (error) {
    console.error("getAllinventories:", error);
    return res.status(500).json({
      message: error.message || "gagal mengambil inventories",
    });
  }
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
      sku: item.sku,
      RpHargaDasar: item.RpHargaDasar,
      description: item.description,
      quantity: item.quantity,
      outlet: req.userDB.currentOutlet,
    };
    if (item.brand) setFields.brand = item.brand;
    if (item.barcodeItem) setFields.barcodeItem = item.barcodeItem;

    return {
      updateOne: {
        filter: { sku: item.sku, outlet: req.userDB.currentOutlet },
        update: {
          $set: setFields,
          $setOnInsert: {
            terjual: 0,
            isDisabled: false,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await InventoryRefrensi.bulkWrite(updateOperations);

  for (const item of prepared) {
    if (item.isNew) {
      traceSummary.spawn++;
      await safeStackTrace({
        itemId: item.sku,
        userId: resolveActorUserId(req),
        stackDescription: "Update Bulk Price - Bulk Import",
        category: "spawn",
        prevQuantity: 0,
        receivedQuantityTrace: item.quantity,
      });
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
    await safeStackTrace({
      itemId: item.sku,
      userId: resolveActorUserId(req),
      stackDescription: "Update Bulk Price - Bulk Import",
      category,
      prevQuantity,
      receivedQuantityTrace: receivedQuantity,
    });
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
      outlet: req.userDB.currentOutlet,
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
// offline: dump ke AsyncStorage (Mongo qty) — JANGAN enrich SOAP di sini saat dump penuh.
// stateless: fetch partial/live per page + overlay qty NAV.
export const getAllinventoriesMobile = async (req, res) => {
  const {
    startDate,
    endDate,
    page = 1,
    limit = 50,
    searchKey,
  } = req.query;

  const outletId = req.userDB.currentOutlet;
  const myOutlet = await Outlet.findById(outletId).select("mode").lean();
  const outletMode = myOutlet?.mode || null;
  const isStateless = outletMode === "stateless";

  const complex = {
    isDisabled: { $ne: true },
    outlet: outletId,
  };

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

  const pageNum = Math.max(1, Number(page) || 1);
  const pageLimit = Math.max(1, Number(limit) || 50);
  const totalItems = await InventoryRefrensi.countDocuments(complex);
  const totalPages = Math.ceil(totalItems / pageLimit) || 0;
  const hasMore = pageNum * pageLimit < totalItems;

  let data = await InventoryRefrensi.find(complex)
    .limit(pageLimit)
    .skip((pageNum - 1) * pageLimit)
    .sort({ updatedAt: -1 });

  let stockSource = "local";
  let navError = null;

  // Hanya live page stateless — offline dump tetap Mongo quantity.
  // Todo: gunakan GetInventoryByLocationMultiple untuk partial yang terlihat di layar.
  if (isStateless && data.length) {
    const enriched = await enrichInventoriesWithNavStock(outletId, data, {
      operationKey: NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    });
    data = enriched.inventories;
    stockSource = enriched.stockSource;
    navError = enriched.navError;
  }

  return res.json({
    message: "berhasil",
    data,
    totalItems,
    totalPages,
    page: pageNum,
    limit: pageLimit,
    hasMore,
    nextPage: hasMore ? pageNum + 1 : null,
    outletMode,
    stockSource,
    ...(navError ? { navError } : {}),
  });
};
