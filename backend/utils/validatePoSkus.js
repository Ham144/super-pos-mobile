import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import {
  normalizeSkuChars,
  skuLookupCandidates,
} from "./normalizeSku.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Karakter dash alternatif — pakai unicode literal, bukan \u (PCRE2 MongoDB tidak support)
const DASH_CLASS = "[-\u2010\u2011\u2012\u2013\u2014\u2212]";

const buildSkuRegexPattern = (sku) => {
  const pattern = escapeRegex(sku).replace(/-/g, DASH_CLASS);
  return `^\\s*${pattern}\\s*$`;
};

const findDocByField = async (field, value) => {
  let doc = await InventoryRefrensi.findOne({ [field]: value });
  if (doc) return doc;

  return InventoryRefrensi.findOne({
    [field]: { $regex: buildSkuRegexPattern(value), $options: "i" },
  });
};

export async function findInventoryBySku(sku) {
  const candidates = skuLookupCandidates(sku);
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    let doc = await findDocByField("sku", candidate);
    if (doc) return doc;

    doc = await findDocByField("_id", candidate);
    if (doc) return doc;
  }

  return null;
}

const registerInMap = (map, doc) => {
  const keys = new Set();
  if (doc.sku) keys.add(doc.sku);
  if (doc._id) keys.add(String(doc._id));

  for (const key of keys) {
    for (const candidate of skuLookupCandidates(key)) {
      map.set(candidate.toUpperCase(), doc);
    }
  }
};

export async function buildInventorySkuMap(rawSkus = []) {
  const map = new Map();
  const candidates = [
    ...new Set(rawSkus.flatMap((s) => skuLookupCandidates(s))),
  ];

  if (!candidates.length) return map;

  const docs = await InventoryRefrensi.find({
    $or: [{ sku: { $in: candidates } }, { _id: { $in: candidates } }],
  });
  for (const doc of docs) registerInMap(map, doc);

  for (const raw of rawSkus.map((s) => normalizeSkuChars(s)).filter(Boolean)) {
    const key = raw.toUpperCase();
    if (map.has(key)) continue;
    const doc = await findInventoryBySku(raw);
    if (doc) registerInMap(map, doc);
  }

  return map;
}

export const resolveInventoryFromMap = (rawSku, map) => {
  for (const candidate of skuLookupCandidates(rawSku)) {
    const hit = map.get(candidate.toUpperCase());
    if (hit) return hit;
  }
  return null;
};

// validasi SKU ada di DB — simpan SKU persis dari CSV
export async function validatePoItems(items = []) {
  const missingSkus = [];
  const duplicatedSkus = [];
  const skuSet = new Set();
  const normalizedItems = [];

  const map = await buildInventorySkuMap(items.map((i) => i.sku));

  for (const item of items) {
    const rawSku = normalizeSkuChars(item.sku);
    if (!rawSku) {
      missingSkus.push("(kosong)");
      continue;
    }

    const dupKey = rawSku.toUpperCase();
    if (skuSet.has(dupKey)) {
      duplicatedSkus.push(rawSku);
      continue;
    }
    skuSet.add(dupKey);

    let inventory = resolveInventoryFromMap(rawSku, map);
    if (!inventory) inventory = await findInventoryBySku(rawSku);

    if (!inventory) {
      missingSkus.push(rawSku);
      continue;
    }

    normalizedItems.push({
      ...item,
      sku: rawSku,
      barcodeItem: item.barcodeItem || item.barcode || "",
    });
  }

  return {
    missingSkus: [...new Set(missingSkus)],
    duplicatedSkus: [...new Set(duplicatedSkus)],
    normalizedItems,
  };
}
