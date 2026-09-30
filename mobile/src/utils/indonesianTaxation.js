/** PPN 11% — harga di DB/bill sudah termasuk pajak (tax-inclusive). */
export const PPN_RATE = 0.11;
export const PPN_DIVISOR = 1.11;


export const pph = PPN_RATE;
export const pph_reducer = PPN_DIVISOR;

const toNum = (price) => {
  const n = Number(price);
  return Number.isFinite(n) ? n : 0;
};

/** Harga sebelum PPN (DPP) dari harga inclusive. */
export const getZeroTax = (inclusivePrice) =>
  Math.round(toNum(inclusivePrice) / PPN_DIVISOR);

/** Bagian PPN dari harga inclusive (total - DPP). */
export const extractTax = (inclusivePrice) => {
  const total = Math.round(toNum(inclusivePrice));
  return total - getZeroTax(total);
};

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
