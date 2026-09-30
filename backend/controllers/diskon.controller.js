import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import DaftartDiskon from "../models/DaftarDiskon.model.js";
import { findInventoryBySku } from "../utils/validatePoSkus.js";
import { resolveSkuFromReq } from "../utils/resolveSku.js";
import { csvCell, parseCsvFile } from "../utils/csvDelimiter.js";

// parse daftar SKU dari cell "SKU1,SKU2"
const parseSkuList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const registerDiskon = async (req, res) => {
  const {
    judulDiskon,
    description,
    berlakuHingga,
    RpPotonganHarga,
    percentPotonganHarga,
    skuTanpaSyarat,
    berlakuDari,
    quantityTersedia,
  } = req.body;
  console.log(req.body);

  if (!judulDiskon) {
    return res.status(400).json({
      message: "gagal membuat diskon, judulDiskon tidak boleh kosong",
    });
  }
  if (!description) {
    return res.status(400).json({
      message: "gagal membuat diskon, description tidak boleh kosong",
    });
  }
  if (!berlakuHingga) {
    return res.status(400).json({
      message: "gagal membuat diskon, berlakuHingga tidak boleh kosong",
    });
  }
  if (!RpPotonganHarga && !percentPotonganHarga) {
    return res.status(400).json({
      message:
        "gagal membuat diskon, RpPotonganHarga atau percentPotonganHarga tidak boleh kosong",
    });
  }

  try {
    const response = await DaftartDiskon.create({
      judulDiskon: judulDiskon,
      description: description,
      berlakuDari: berlakuDari ? new Date(berlakuDari) : new Date(),
      berlakuHingga: berlakuHingga ? new Date(berlakuHingga) : new Date(),
      RpPotonganHarga: RpPotonganHarga,
      percentPotonganHarga: percentPotonganHarga,
      skuTanpaSyarat: skuTanpaSyarat || [],
      quantityTersedia: quantityTersedia,
    });

    return res.json({ message: "berhasil register diskon" });
  } catch (error) {
    if (error.code) {
      return res
        .status(400)
        .json({ message: "Gagal register diskon, terjadi duplikasi data" });
    }
    return res.status(400).json({ message: "terjadi kesalahan", error: error });
  }
};

export const deleteDiskon = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "ID diskon diperlukan" });
  }

  try {
    const diskon = await DaftartDiskon.findById(id);
    if (!diskon) {
      return res.status(404).json({ message: "Diskon tidak ditemukan" });
    }

    await DaftartDiskon.findByIdAndDelete(id);
    return res.json({
      message: "Berhasil menghapus diskon",
      data: diskon,
    });
  } catch (error) {
    console.log("Delete error:", error);
    return res.status(400).json({
      message: "Gagal menghapus diskon",
      error: error.message,
    });
  }
};

export const updateDiskon = async (req, res) => {
  const {
    _id,
    judulDiskon,
    description,
    berlakuDari,
    berlakuHingga,
    RpPotonganHarga,
    percentPotonganHarga,
    skuTanpaSyarat,
    quantityTersedia,
  } = req.body;
  try {
    if (RpPotonganHarga && percentPotonganHarga) {
      return res.status(400).json({
        message:
          "hanya boleh salah satu RpPotonganHarga atau percentPotonganHarga",
      });
    }

    const response = await DaftartDiskon.findOneAndUpdate(
      { _id },
      {
        $set: {
          judulDiskon,
          description,
          berlakuHingga: new Date(berlakuHingga).toISOString(),
          berlakuDari,
          RpPotonganHarga: RpPotonganHarga?.$numberDecimal,
          percentPotonganHarga: percentPotonganHarga?.$numberDecimal,
          skuTanpaSyarat: skuTanpaSyarat || [],
          quantityTersedia,
        },
      }
    );

    if (!response) {
      return res
        .status(400)
        .json({ message: "gagal memperbarui diskon", error: response });
    }
    return res.json({ message: "berhasil memperbarui diskon" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Terjadi kesalahan", error: error });
  }
};

export const getAllDiskon = async (req, res) => {
  try {
    const rawData = await DaftartDiskon.find({});
    return res.json({
      message: "Berhasil mengambil data diskon",
      data: rawData,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal mendapatkan data diskon", error: error });
  }
};

// import CSV diskon (delimiter ;)
export const registerMultiDiskon = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "File CSV diperlukan" });
  }

  const filePath =
    file.path || path.join(process.cwd(), "uploads", file.filename);
  let rows = [];

  try {
    const parsed = await parseCsvFile(filePath, ["judul diskon"]);
    rows = parsed.rows
      .map((row) => ({
        judulDiskon: csvCell(row, "Judul Diskon"),
        description: csvCell(row, "Deskripsi"),
        berlakuDari: csvCell(row, "Berlaku Dari"),
        berlakuHingga: csvCell(row, "Berlaku Hingga"),
        rpPotongan: csvCell(row, "Potongan Rp"),
        percentPotongan: csvCell(row, "Potongan %"),
        skuRaw: csvCell(row, "SKU Terkait"),
        quantityTersedia: csvCell(row, "Kuota"),
      }))
      .filter((row) => row.judulDiskon);
  } catch {
    return res.status(400).json({ message: "Gagal membaca file CSV" });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  if (!rows.length) {
    return res.status(400).json({ message: "Tidak ada data valid di CSV" });
  }

  const errors = [];
  const allMissingSkus = new Set();
  const judulInFile = new Set();
  const prepared = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const judulKey = row.judulDiskon.toLowerCase();

    if (judulInFile.has(judulKey)) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Judul diskon duplikat dalam file",
      });
      continue;
    }
    judulInFile.add(judulKey);

    if (!row.description) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Deskripsi wajib diisi",
      });
      continue;
    }
    if (!row.berlakuHingga) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Berlaku Hingga wajib diisi",
      });
      continue;
    }

    const hasRp = row.rpPotongan !== "";
    const hasPercent = row.percentPotongan !== "";
    if (!hasRp && !hasPercent) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Potongan Rp atau Potongan % wajib diisi salah satu",
      });
      continue;
    }
    if (hasRp && hasPercent) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Hanya boleh mengisi Potongan Rp atau Potongan %",
      });
      continue;
    }

    let RpPotonganHarga = null;
    let percentPotonganHarga = null;

    if (hasRp) {
      const rp = Number(row.rpPotongan.replace(/[^\d]/g, ""));
      if (!Number.isFinite(rp) || rp < 0) {
        errors.push({
          row: rowNum,
          judul: row.judulDiskon,
          reason: "Potongan Rp tidak valid",
        });
        continue;
      }
      RpPotonganHarga = mongoose.Types.Decimal128.fromString(String(rp));
    } else {
      const pct = Number(row.percentPotongan);
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
        errors.push({
          row: rowNum,
          judul: row.judulDiskon,
          reason: "Potongan % harus antara 1-99",
        });
        continue;
      }
      percentPotonganHarga = mongoose.Types.Decimal128.fromString(
        String(pct / 100),
      );
    }

    const skuList = parseSkuList(row.skuRaw);
    const normalizedSkus = [];
    let skuError = false;

    for (const sku of skuList) {
      const inventory = await findInventoryBySku(sku);
      if (!inventory) {
        allMissingSkus.add(sku);
        errors.push({
          row: rowNum,
          judul: row.judulDiskon,
          reason: `SKU tidak terdaftar: ${sku}`,
        });
        skuError = true;
        break;
      }
      normalizedSkus.push(inventory.sku);
    }
    if (skuError) continue;

    const berlakuDari = row.berlakuDari
      ? new Date(row.berlakuDari)
      : new Date();
    const berlakuHingga = new Date(row.berlakuHingga);

    if (isNaN(berlakuDari.getTime()) || isNaN(berlakuHingga.getTime())) {
      errors.push({
        row: rowNum,
        judul: row.judulDiskon,
        reason: "Format tanggal tidak valid",
      });
      continue;
    }

    prepared.push({
      judulDiskon: row.judulDiskon,
      description: row.description,
      berlakuDari,
      berlakuHingga,
      RpPotonganHarga,
      percentPotonganHarga,
      skuTanpaSyarat: normalizedSkus,
      quantityTersedia: Number(row.quantityTersedia) || 0,
    });
  }

  if (errors.length) {
    return res.status(400).json({
      message: "Gagal memproses data diskon",
      details: errors,
      missingSkus: [...allMissingSkus],
    });
  }

  try {
    const skipped = [];
    const toInsert = [];

    for (const item of prepared) {
      const existing = await DaftartDiskon.findOne({
        judulDiskon: item.judulDiskon,
      });
      if (existing) {
        skipped.push(item.judulDiskon);
        continue;
      }
      toInsert.push(item);
    }

    if (toInsert.length) {
      await DaftartDiskon.insertMany(toInsert);
    }

    const createdCount = toInsert.length;
    const skippedCount = skipped.length;

    let message = `Berhasil import ${createdCount} diskon`;
    if (skippedCount) {
      message += ` (${skippedCount} dilewati karena duplikat)`;
    }
    if (!createdCount && skippedCount) {
      message = `Semua baris dilewati karena judul sudah ada (${skippedCount})`;
    }

    return res.json({
      message,
      createdCount,
      skippedCount,
      skipped,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal import diskon",
      error: error.message,
    });
  }
};

export const deleteMultiDiskon = async (req, res) => {
  const { skus } = req.body;
  if (!skus)
    return res
      .status(400)
      .json({ message: "tidak berhasil menghapus, multi sku diperlukan" });

  try {
    const success = await InventoryRefrensi.deleteMany({ sku: { $in: skus } });
    if (!success) return res.status(400).json({ message: "gagal menghapus" });
    return res.json({ message: "berhasil menghapus" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "terjadi kesalahan" });
  }
};

export const getAllDiskonByProduct = async (req, res) => {
  const sku = resolveSkuFromReq(req);
  if (!sku) {
    return res.status(400).json({ message: "sku diperlukan" });
  }

  const diskon = await DaftartDiskon.find({ skuTanpaSyarat: { $in: [sku] } });
  return res.json({ message: "berhasil", data: diskon, length: diskon.length });
};
