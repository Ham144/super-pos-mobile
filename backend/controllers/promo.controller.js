import fs from "fs";
import path from "path";
import DaftarPromo from "../models/DaftarPromo.model.js";
import Outlet from "../models/Outlet.model.js";
import {
  buildInventorySkuMap,
  resolveInventoryFromMap,
} from "../utils/validatePoSkus.js";
import { normalizeSkuChars } from "../utils/normalizeSku.js";
import { parseRpHargaDasar } from "../utils/parseRpHargaDasar.js";
import { parseCsvDate } from "../utils/parseCsvDate.js";
import { resolveSkuFromReq } from "../utils/resolveSku.js";
import { csvCell, parseCsvFile } from "../utils/csvDelimiter.js";

const parseCommaList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

// parse bilangan bulat positif dari cell CSV
const parsePositiveInt = (raw) => {
  const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const getAllPromo = async (req, res) => {
  const promos = await DaftarPromo.find({});
  return res.json({ message: "berhasil", data: promos, length: promos.length });
};

export const registerPromo = async (req, res) => {
  const {
    judulPromo,
    skuList,
    quantityBerlaku,
    berlakuDari,
    berlakuHingga,
    syaratQuantity,
    syaratTotalRp,
    skuBarangBonus,
    quantityBonus,
    authorizedOutlets,
    mode,
  } = req.body;

  try {
    // Validate required fields
    if (!judulPromo) {
      return res.status(400).json({ message: "judulPromo is required" });
    }
    if (!quantityBerlaku) {
      return res.status(400).json({ message: "quantityBerlaku is required" });
    }
    if (!berlakuHingga) {
      return res.status(400).json({ message: "berlakuHingga is required" });
    }
    if (!skuBarangBonus) {
      return res.status(400).json({ message: "skuBarangBonus is required" });
    }

    const promoData = {
      judulPromo,
      skuList: skuList || [],
      quantityBerlaku: parseInt(quantityBerlaku),
      berlakuDari: berlakuDari ? new Date(berlakuDari) : new Date(),
      berlakuHingga: new Date(berlakuHingga),
      syaratQuantity: syaratQuantity || null,
      syaratTotalRp: syaratTotalRp || null,
      skuBarangBonus,
      quantityBonus: parseInt(quantityBonus) || 1,
      authorizedOutlets,
      mode,
    };

    const response = await DaftarPromo.create(promoData);

    return res.json({
      message: "berhasil register promo baru",
      data: response,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(500).json({
        message: "gagal register promo, duplikat judulPromo",
        error: error,
      });
    }
    console.log("Error creating promo:", error);
    return res
      .status(400)
      .json({ message: "terjadi kesalahan", error: error.message });
  }
};

export const updatePromo = async (req, res) => {
  const {
    _id,
    judulPromo,
    skuList,
    quantityBerlaku,
    berlakuDari,
    berlakuHingga,
    syaratQuantity,
    syaratTotalRp,
    skuBarangBonus,
    quantityBonus,
    authorizedOutlets,
    mode,
  } = req.body;

  if (!mode) return res.status(400).json({ message: "ga ada mode" });

  await DaftarPromo.findByIdAndUpdate(
    _id,
    {
      judulPromo: judulPromo,
      skuList,
      quantityBerlaku,
      berlakuDari,
      berlakuHingga,
      syaratQuantity,
      syaratTotalRp,
      skuBarangBonus,
      quantityBonus,
      authorizedOutlets,
      mode: mode,
    },
    { new: true }
  );

  return res.json({ message: "berhasil update" });
};

export const getAllPromoByProduct = async (req, res) => {
  const sku = resolveSkuFromReq(req);
  if (!sku) {
    return res.status(400).json({ message: "sku diperlukan" });
  }

  const promos = await DaftarPromo.find({ skuList: { $in: [sku] } });
  return res.json({ message: "berhasil", data: promos, length: promos.length });
};

export const deletePromo = async (req, res) => {
  const { id } = req.params;
  await DaftarPromo.findByIdAndDelete(id);
  return res.json({ message: "berhasil menghapus promo" });
};

// import CSV promo (delimiter ;)
export const importPromoCsv = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "File CSV diperlukan" });
    }

    const filePath =
      file.path || path.join(process.cwd(), "uploads", file.filename);
    let rows = [];

    try {
      const parsed = await parseCsvFile(filePath, ["judul promo"]);
      rows = parsed.rows
        .map((row) => ({
          judulPromo: csvCell(row, "Judul Promo"),
          mode: csvCell(row, "Mode"),
          skuRaw: csvCell(row, "SKU Terkait"),
          outletRaw: csvCell(row, "Outlet"),
          quantityBerlaku: csvCell(row, "Kuota"),
          berlakuDari: csvCell(row, "Berlaku Dari"),
          berlakuHingga: csvCell(row, "Berlaku Hingga"),
          syaratQuantity: csvCell(row, "Syarat Quantity"),
          syaratTotalRp: csvCell(row, "Syarat Total Rp"),
          skuBarangBonus: csvCell(row, "SKU Barang Bonus"),
          quantityBonus: csvCell(row, "Quantity Bonus"),
        }))
        .filter((row) => row.judulPromo);
    } catch {
      return res.status(400).json({ message: "Gagal membaca file CSV" });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (!rows.length) {
      return res.status(400).json({ message: "Tidak ada data valid di CSV" });
    }

    // prefetch SKU & outlet sekali agar tidak N+1 query
    const allSkus = [];
    for (const row of rows) {
      for (const sku of parseCommaList(row.skuRaw)) allSkus.push(sku);
      if (row.skuBarangBonus) allSkus.push(row.skuBarangBonus);
    }
    const skuMap = await buildInventorySkuMap(allSkus);

    const allOutletNames = [
      ...new Set(rows.flatMap((r) => parseCommaList(r.outletRaw))),
    ];
    const outletDocs = allOutletNames.length
      ? await Outlet.find({ namaOutlet: { $in: allOutletNames } })
      : [];
    const outletMap = new Map(
      outletDocs.map((o) => [o.namaOutlet, o._id]),
    );

    const errors = [];
    const allMissingSkus = new Set();
    const judulInFile = new Set();
    const prepared = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const judulKey = row.judulPromo.toLowerCase();

      if (judulInFile.has(judulKey)) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Judul promo duplikat dalam file",
        });
        continue;
      }
      judulInFile.add(judulKey);

      const quantityBerlaku = parsePositiveInt(row.quantityBerlaku);
      if (!row.quantityBerlaku || quantityBerlaku === null) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: !row.quantityBerlaku
            ? "Kuota wajib diisi"
            : "Kuota tidak valid",
        });
        continue;
      }
      if (!row.berlakuHingga) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Berlaku Hingga wajib diisi",
        });
        continue;
      }
      if (!row.skuBarangBonus) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "SKU Barang Bonus wajib diisi",
        });
        continue;
      }
      if (!row.quantityBonus) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Quantity Bonus wajib diisi",
        });
        continue;
      }

      const quantityBonus = parsePositiveInt(row.quantityBonus);
      if (quantityBonus === null) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Quantity Bonus tidak valid",
        });
        continue;
      }

      const hasSyaratQty = row.syaratQuantity !== "";
      const hasSyaratRp = row.syaratTotalRp !== "";
      if (!hasSyaratQty && !hasSyaratRp) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Syarat Quantity atau Syarat Total Rp wajib diisi salah satu",
        });
        continue;
      }
      if (hasSyaratQty && hasSyaratRp) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Hanya boleh mengisi Syarat Quantity atau Syarat Total Rp",
        });
        continue;
      }

      let syaratQuantity = null;
      let syaratTotalRp = null;

      if (hasSyaratQty) {
        syaratQuantity = parsePositiveInt(row.syaratQuantity);
        if (syaratQuantity === null) {
          errors.push({
            row: rowNum,
            judul: row.judulPromo,
            reason: "Syarat Quantity tidak valid",
          });
          continue;
        }
      }
      if (hasSyaratRp) {
        syaratTotalRp = parseRpHargaDasar(row.syaratTotalRp);
        if (syaratTotalRp === null || syaratTotalRp < 0) {
          errors.push({
            row: rowNum,
            judul: row.judulPromo,
            reason: "Syarat Total Rp tidak valid",
          });
          continue;
        }
      }

      const mode = row.mode || "particular";
      if (!["simple_total", "particular"].includes(mode)) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Mode harus particular atau simple_total",
        });
        continue;
      }

      const skuListRaw = parseCommaList(row.skuRaw);
      const normalizedSkus = [];
      let rowError = false;

      for (const sku of skuListRaw) {
        const rawSku = normalizeSkuChars(sku);
        if (!resolveInventoryFromMap(rawSku, skuMap)) {
          allMissingSkus.add(sku);
          errors.push({
            row: rowNum,
            judul: row.judulPromo,
            reason: `SKU tidak terdaftar: ${sku}`,
          });
          rowError = true;
          break;
        }
        normalizedSkus.push(rawSku);
      }
      if (rowError) continue;

      const bonusRaw = normalizeSkuChars(row.skuBarangBonus);
      if (!resolveInventoryFromMap(bonusRaw, skuMap)) {
        allMissingSkus.add(row.skuBarangBonus);
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: `SKU Barang Bonus tidak terdaftar: ${row.skuBarangBonus}`,
        });
        continue;
      }

      const outletNames = parseCommaList(row.outletRaw);
      const authorizedOutlets = [];
      for (const nama of outletNames) {
        const outletId = outletMap.get(nama);
        if (!outletId) {
          errors.push({
            row: rowNum,
            judul: row.judulPromo,
            reason: `Outlet tidak ditemukan: ${nama}`,
          });
          rowError = true;
          break;
        }
        authorizedOutlets.push(outletId);
      }
      if (rowError) continue;

      const berlakuDari = row.berlakuDari
        ? parseCsvDate(row.berlakuDari)
        : new Date();
      const berlakuHingga = parseCsvDate(row.berlakuHingga);

      if (
        !berlakuHingga ||
        !berlakuDari ||
        isNaN(berlakuDari.getTime()) ||
        isNaN(berlakuHingga.getTime())
      ) {
        errors.push({
          row: rowNum,
          judul: row.judulPromo,
          reason: "Format tanggal tidak valid",
        });
        continue;
      }

      prepared.push({
        judulPromo: row.judulPromo,
        mode,
        skuList: normalizedSkus,
        authorizedOutlets,
        quantityBerlaku,
        berlakuDari,
        berlakuHingga,
        syaratQuantity,
        syaratTotalRp,
        skuBarangBonus: bonusRaw,
        quantityBonus,
      });
    }

    if (errors.length) {
      return res.status(400).json({
        message: "Gagal memproses data promo",
        details: errors,
        missingSkus: [...allMissingSkus],
      });
    }

    const skipped = [];
    const toInsert = [];

    for (const item of prepared) {
      const existing = await DaftarPromo.findOne({
        judulPromo: item.judulPromo,
      });
      if (existing) {
        skipped.push(item.judulPromo);
        continue;
      }
      toInsert.push(item);
    }

    if (toInsert.length) {
      await DaftarPromo.insertMany(toInsert);
    }

    const createdCount = toInsert.length;
    const skippedCount = skipped.length;

    let message = `Berhasil import ${createdCount} promo`;
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
      message: "Gagal import promo",
      error: error.message,
    });
  }
};
