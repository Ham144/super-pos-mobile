import axios from "axios";
import mongoose from "mongoose";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import BrandRefrensi from "../models/brand.model.js";
import { parseRpHargaDasar } from "./parseRpHargaDasar.js";

const buildInventoryId = (outletId, sku) => `${outletId}__${sku}`;

const appendQueryParams = (baseUrl, params) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

export const normalizeExternalProduct = (item) => {
  const sku = String(
    item?.no ?? item?.sku ?? item?.code ?? item?.itemNo ?? "",
  ).trim();

  if (!sku) return null;

  const rawPrice =
    item?.retail ??
    item?.price ??
    item?.unitPrice ??
    item?.RpHargaDasar ??
    0;

  return {
    sku,
    description: String(
      item?.description ?? item?.name ?? item?.itemName ?? sku,
    ).trim(),
    RpHargaDasar: parseRpHargaDasar(rawPrice) ?? 0,
    brand: String(
      item?.manufacturer_code ??
        item?.brand ??
        item?.manufacturerCode ??
        "",
    ).trim(),
    barcodeItem: String(
      item?.barcode_item ?? item?.barcode ?? item?.barcodeItem ?? "",
    ).trim(),
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
  timeoutMs = 60000,
}) => {
  const headers = {};
  if (x_api_key) {
    headers["x-api-key"] = x_api_key;
  }

  const products = [];
  let skip = 0;

  while (true) {
    const pageUrl = appendQueryParams(url, {
      searchKey,
      skip,
      limit: pageLimit,
    });

    const response = await axios.get(pageUrl, {
      headers,
      timeout: timeoutMs,
    });

    const pageItems = extractProductList(response.data);
    if (!pageItems.length) break;

    products.push(...pageItems);

    if (pageItems.length < pageLimit) break;
    skip += pageLimit;
  }

  return products;
};

export const syncExternalProductsForOutlet = async ({
  outletId,
  outletKode,
  config,
  userId,
}) => {
  const resolvedSearchKey = config.searchKey?.trim() || outletKode;
  if (!resolvedSearchKey) {
    throw new Error("searchKey atau kodeOutlet wajib untuk sinkronisasi produk");
  }

  const rawProducts = await fetchAllExternalProducts({
    url: config.url,
    searchKey: resolvedSearchKey,
    pageLimit: config.pageLimit || 1000,
    x_api_key: config.x_api_key,
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const rawItem of rawProducts) {
    const product = normalizeExternalProduct(rawItem);
    if (!product) {
      skipped += 1;
      continue;
    }

    if (product.brand) {
      await BrandRefrensi.findOneAndUpdate(
        { name: product.brand },
        { $addToSet: { skuList: product.sku } },
        { upsert: true, new: true },
      );
    }

    const inventoryId = buildInventoryId(outletId, product.sku);
    const existing = await InventoryRefrensi.findOne({
      sku: product.sku,
      outlet: outletId,
    }).lean();

    const updateFields = {
      description: product.description,
      RpHargaDasar: mongoose.Types.Decimal128.fromString(
        String(product.RpHargaDasar),
      ),
      barcodeItem: product.barcodeItem || undefined,
      brand: product.brand || undefined,
      isDisabled: false,
    };

    if (existing) {
      await InventoryRefrensi.updateOne(
        { _id: existing._id },
        { $set: updateFields },
      );
      updated += 1;
      continue;
    }

    await InventoryRefrensi.create({
      _id: inventoryId,
      sku: product.sku,
      outlet: outletId,
      quantity: 0,
      terjual: 0,
      ...updateFields,
      RpHargaDasar: product.RpHargaDasar,
    });
    created += 1;
  }
  
  return {
    created,
    updated,
    skipped,
    totalFetched: rawProducts.length,
    syncedAt: new Date(),
    userId,
  };
};
