import { parseRpHargaDasar } from "./parseRpHargaDasar.js";
import { findInventoryBySku } from "./validatePoSkus.js";
import { normalizeSkuChars } from "./normalizeSku.js";

// validasi & normalisasi baris import inventory sebelum bulk write
export async function prepareBulkInventoryUpdates(updates = []) {
  const errors = [];
  const prepared = [];
  const seen = new Set();

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const rowNum = update._row ?? i + 2;
    const rawSku = normalizeSkuChars(update.sku);

    if (!rawSku) {
      errors.push({ row: rowNum, reason: "SKU kosong" });
      continue;
    }

    const skuKey = rawSku.toUpperCase();
    if (seen.has(skuKey)) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        reason: "SKU duplikat dalam file",
      });
      continue;
    }
    seen.add(skuKey);

    const harga = parseRpHargaDasar(update.RpHargaDasar);
    if (harga === null || harga < 0) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        reason: "Harga dasar tidak valid",
      });
      continue;
    }

    const existing = await findInventoryBySku(rawSku);
    const description = update.description?.trim();
    const brand = update.brand?.trim();
    const barcodeItem = update.barcodeItem?.trim();

    if (!existing && !description) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        reason:
          "SKU tidak terdaftar di database — isi deskripsi jika ingin membuat item baru",
      });
      continue;
    }

    prepared.push({
      sku: rawSku,
      RpHargaDasar: harga,
      description: description || existing?.description || "",
      brand: brand ? brand.toUpperCase() : existing?.brand || "",
      barcodeItem: barcodeItem || existing?.barcodeItem || "",
      quantity: existing?.quantity ?? 0,
      existing,
      isNew: !existing,
      quantityProvided: update.quantity !== undefined && update.quantity !== null,
      receivedQuantity: update.quantity,
    });
  }

  const duplicatedSkus = [
    ...new Set(
      errors
        .filter((e) => e.reason === "SKU duplikat dalam file")
        .map((e) => e.sku)
        .filter(Boolean),
    ),
  ];

  return { prepared, errors, duplicatedSkus };
}
