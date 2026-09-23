import axios from "axios";
import mongoose from "mongoose";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import BrandRefrensi from "../models/brand.model.js";
import Outlet from "../models/Outlet.model.js";
import { parseRpHargaDasar } from "./parseRpHargaDasar.js";

/** Build request URL; always own searchKey/skip/limit (strip any baked into base URL). */
export const appendQueryParams = (baseUrl, params) => {
  const url = new URL(baseUrl);
  ["searchKey", "skip", "limit", "page"].forEach((key) => {
    url.searchParams.delete(key);
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

/** Hapus index lama yang membuat sku unique global (jika masih ada di Mongo). */
export const ensureInventoryOutletSkuIndex = async () => {
  try {
    const indexes = await InventoryRefrensi.collection.indexes();
    for (const idx of indexes) {
      const keys = Object.keys(idx.key || {});
      if (idx.unique && keys.length === 1 && keys[0] === "sku" && idx.name) {
        await InventoryRefrensi.collection.dropIndex(idx.name);
      }
    }
    await InventoryRefrensi.syncIndexes();
  } catch (error) {
    console.warn("ensureInventoryOutletSkuIndex:", error.message);
  }
};

/**
 * External product list item (muara open API):
 * { No, Brand, Description, Description_2, Retail, Web, ... }
 * RpHargaDasar ← Retail, RpHargaLowest ← Web
 */
export const normalizeExternalProduct = (item) => {
  if (!item || typeof item !== "object") return null;

  const sku = String(item.No ?? item.no ?? item.SKU ?? item.sku ?? "").trim();
  if (!sku) return null;

  const description = String(
    item.Description,
      sku,
  ).trim();

  return {
    sku,
    description,
    RpHargaDasar: parseRpHargaDasar(item.Retail ?? item.retail) ?? 0,
    RpHargaLowest: parseRpHargaDasar(item.Web ?? item.web) ?? 0,
    brand: String(item.Brand ?? item.brand ?? "").trim(),
    barcodeItem: "",
  };
};

export const extractProductList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

export const fetchAllExternalProducts = async ({
  url,
  searchKey,
  pageLimit = 1000,
  x_api_key,
  timeoutMs = 120000,
}) => {
  const headers = {};
  if (x_api_key) {
    headers["x-api-key"] = x_api_key;
  }

  const fetchPage = async (skip, limit) => {
    const pageParams = { skip, limit };
    // kosong = katalog penuh; jangan biarkan searchKey lama menempel di URL
    if (searchKey) {
      pageParams.searchKey = searchKey;
    }
    const response = await axios.get(appendQueryParams(url, pageParams), {
      headers,
      timeout: timeoutMs,
    });
    return {
      items: extractProductList(response.data),
      total:
        typeof response.data?.total === "number" ? response.data.total : null,
    };
  };

  const productsBySku = new Map();
  const collect = (items) => {
    for (const item of items) {
      const key = String(item?.No ?? item?.no ?? item?.SKU ?? item?.sku ?? "").trim();
      if (key && !productsBySku.has(key)) productsBySku.set(key, item);
    }
  };

  const limit = Math.max(1, Number(pageLimit) || 1000);
  const first = await fetchPage(0, limit);
  collect(first.items);

  // Paging skip/limit di API sumber tidak stabil (urutan acak antar halaman →
  // duplikat & SKU hilang). Jika total > 1 halaman, ambil sekaligus limit=total.
  if (first.total != null && first.total > first.items.length) {
    const full = await fetchPage(0, first.total);
    collect(full.items);
  }

  if (first.total == null && first.items.length >= limit) {
    let skip = limit;
    while (skip <= 200000) {
      const page = await fetchPage(skip, limit);
      if (!page.items.length) break;
      collect(page.items);
      if (page.items.length < limit) break;
      skip += limit;
    }
  }

  return [...productsBySku.values()];
};

const toDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(String(value ?? 0));

export const syncExternalProductsForOutlet = async ({
  outletId,
  outletKode,
  config,
  userId,
}) => {
  await ensureInventoryOutletSkuIndex();

  // searchKey API = filter teks (bukan kodeOutlet). Kosong = ambil semua (~full catalog).
  const resolvedSearchKey = config.searchKey?.trim() || "";

  const rawProducts = await fetchAllExternalProducts({
    url: config.url,
    searchKey: resolvedSearchKey,
    pageLimit: config.pageLimit || 1000,
    x_api_key: config.x_api_key,
  });

  if (!rawProducts.length) {
    throw new Error(
      `API sumber mengembalikan 0 produk (searchKey="${resolvedSearchKey || "(kosong = full catalog)"}"). ` +
        `Kosongkan searchKey untuk katalog penuh, atau isi filter (contoh: QRH092). Jangan pakai kodeOutlet.`,
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];
  const linkedBrandIds = new Set();

  for (const rawItem of rawProducts) {
    const product = normalizeExternalProduct(rawItem);
    if (!product) {
      skipped += 1;
      continue;
    }

    try {
      if (product.brand) {
        const brandDoc = await BrandRefrensi.findOneAndUpdate(
          { name: product.brand },
          { $addToSet: { skuList: product.sku } },
          { upsert: true, new: true },
        );
        if (brandDoc?._id) linkedBrandIds.add(String(brandDoc._id));
      }

      const existing = await InventoryRefrensi.findOne({
        sku: product.sku,
        outlet: outletId,
      }).select("_id");

      await InventoryRefrensi.updateOne(
        { sku: product.sku, outlet: outletId },
        {
          $set: {
            description: product.description,
            RpHargaDasar: toDecimal128(product.RpHargaDasar),
            RpHargaLowest: toDecimal128(product.RpHargaLowest),
            barcodeItem: product.barcodeItem || undefined,
            brand: product.brand || undefined,
            isDisabled: false,
          },
          $setOnInsert: {
            sku: product.sku,
            outlet: outletId,
            quantity: 0,
            terjual: 0,
          },
        },
        { upsert: true },
      );

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    } catch (error) {
      skipped += 1;
      errors.push({ sku: product.sku, reason: error.message });
    }
  }

  if (linkedBrandIds.size) {
    await Outlet.updateOne(
      { _id: outletId },
      { $addToSet: { brandIds: { $each: [...linkedBrandIds] } } },
    );
  }

  return {
    created,
    updated,
    skipped,
    totalFetched: rawProducts.length,
    searchKeyUsed: resolvedSearchKey || null,
    syncedAt: new Date(),
    userId,
    errors: errors.slice(0, 20),
  };
};
