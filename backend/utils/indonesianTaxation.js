/** PPN 11% — harga di DB/bill sudah termasuk pajak (tax-inclusive). */
export const PPN_RATE = 0.11;
export const PPN_DIVISOR = 1.11;

/** Alias lama (pph) — sebenarnya PPN, bukan PPh. */
export const pph = PPN_RATE;
export const pph_reducer = PPN_DIVISOR;

const toNum = (price) => {
  const n = Number(price);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Harga sebelum PPN (DPP) dari harga yang sudah termasuk pajak.
 * Mis. 111_000 → 100_000
 */
export const getZeroTax = (inclusivePrice) =>
  Math.round(toNum(inclusivePrice) / PPN_DIVISOR);

/**
 * Bagian PPN dari harga inclusive.
 * Pakai total - DPP supaya Subtotal + PPN === Total (tanpa selisih 1 rupiah).
 */
export const extractTax = (inclusivePrice) => {
  const total = Math.round(toNum(inclusivePrice));
  return total - getZeroTax(total);
};

/**
 * Breakdown footer struk (tampilan saja; tidak mengubah kalkulasi bill).
 * @param {number} inclusiveTotal - total bayar (setelah diskon, termasuk PPN)
 */
export const buildReceiptAmounts = (inclusiveTotal) => {
  const total = Math.round(toNum(inclusiveTotal));
  const subtotalExclTax = getZeroTax(total);
  const tax = total - subtotalExclTax;
  return { subtotalExclTax, tax, total };
};

export const indonesianTaxation = {
  getZeroTax,
  extractTax,
  buildReceiptAmounts,
};
