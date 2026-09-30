import { normalizeCsvCell } from "./csvDelimiter.js";

// Bersihkan karakter aneh Excel — format SKU dari CSV tidak diubah
export const normalizeSkuChars = (raw) => {
  let s = normalizeCsvCell(raw);
  return s
    .replace(/\uFF0F/g, "/")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();
};

// Hanya untuk lookup DB — SKU disimpan tetap dari CSV/import
export const skuLookupCandidates = (raw) => {
  const base = normalizeSkuChars(raw);
  if (!base) return [];

  const set = new Set([base]);
  if (/^D-/i.test(base)) {
    set.add(base.slice(2).trim());
  } else {
    set.add(`D-${base}`);
  }
  return [...set].filter(Boolean);
};
