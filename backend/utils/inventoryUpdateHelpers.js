import { parseRpHargaDasar } from "./parseRpHargaDasar.js";

export const resolveActorUserId = (req) =>
  req?.userId ||
  req?.user?.userId ||
  req?.user?._id ||
  req?.userDB?._id ||
  null;

export const parseInventoryQuantity = (value, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    return required
      ? { ok: false, error: "quantity wajib diisi" }
      : { ok: true, provided: false, value: undefined };
  }

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return { ok: false, error: "quantity harus bilangan bulat" };
  }
  if (numeric < 0) {
    return { ok: false, error: "quantity tidak boleh negatif" };
  }

  return { ok: true, provided: true, value: numeric };
};

export const parseInventoryPriceField = (
  value,
  { fieldName = "harga", required = false } = {},
) => {
  if (value === undefined || value === null || value === "") {
    return required
      ? { ok: false, error: `${fieldName} wajib diisi` }
      : { ok: true, provided: false, value: undefined };
  }

  const parsed = parseRpHargaDasar(value);
  if (parsed === null || parsed < 0) {
    return {
      ok: false,
      error: `${fieldName} tidak valid atau kurang dari 0`,
    };
  }

  return { ok: true, provided: true, value: parsed };
};

export const quantityTraceCategory = (prevQuantity, nextQuantity) => {
  if (nextQuantity > prevQuantity) return "increase";
  if (nextQuantity < prevQuantity) return "decrease";
  return "other";
};

/**
 * Build $set payload for a single inventory update (outlet-scoped).
 * Does not mutate the mongoose document.
 */
export const buildSingleInventoryUpdates = (body = {}, existing = {}) => {
  const errors = [];
  const $set = {};
  let quantityChange = null;

  const qty = parseInventoryQuantity(body.quantity);
  if (!qty.ok) errors.push(qty.error);
  else if (qty.provided) {
    $set.quantity = qty.value;
    if (qty.value !== Number(existing.quantity || 0)) {
      quantityChange = {
        prev: Number(existing.quantity || 0),
        next: qty.value,
        category: quantityTraceCategory(
          Number(existing.quantity || 0),
          qty.value,
        ),
      };
    }
  }

  // harga dasar: required when explicitly updating; if omitted keep existing
  if (
    Object.prototype.hasOwnProperty.call(body, "RpHargaDasar") ||
    Object.prototype.hasOwnProperty.call(body, "harga")
  ) {
    const harga = parseInventoryPriceField(
      body.RpHargaDasar ?? body.harga,
      { fieldName: "RpHargaDasar", required: true },
    );
    if (!harga.ok) errors.push(harga.error);
    else $set.RpHargaDasar = harga.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "RpHargaLowest")) {
    const lowest = parseInventoryPriceField(body.RpHargaLowest, {
      fieldName: "RpHargaLowest",
      required: false,
    });
    if (!lowest.ok) errors.push(lowest.error);
    else if (lowest.provided) $set.RpHargaLowest = lowest.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "isDisabled")) {
    $set.isDisabled = Boolean(body.isDisabled);
  }
  if (Object.prototype.hasOwnProperty.call(body, "barcodeItem")) {
    $set.barcodeItem = body.barcodeItem ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = String(body.description || "").trim();
    if (!description) errors.push("description tidak boleh kosong");
    else $set.description = description;
  }
  if (Object.prototype.hasOwnProperty.call(body, "brand")) {
    $set.brand = body.brand ?? "";
  }

  return { ok: errors.length === 0, errors, $set, quantityChange };
};
