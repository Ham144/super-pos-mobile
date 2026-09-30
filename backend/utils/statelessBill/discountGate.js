/**
 * Discount / below-web price approval gate for outlet.mode === "stateless".
 *
 * Rule (todo): if kasir sets a discount (catalog diskon OR manual price edit)
 * and the effective retail unit price is below web price (RpHargaLowest),
 * persist the bill as pending approval and do NOT call NAV SOAP.
 */

const toNum = (v) =>
  Number(v != null && typeof v === "object" ? v.$numberDecimal : v);

// Mobile menyimpan persen sebagai pecahan (0.1 = 10%); nilai > 1 dianggap persen (10 = 10%)
export const discountFraction = (pct) => {
  const n = toNum(pct);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n > 1 ? n / 100 : n);
};

/**
 * Potongan Rp untuk satu baris (total baris, sama seperti useBillCalculations mobile):
 * RpPotonganHarga = potongan total baris; percentPotonganHarga = pecahan dari total baris.
 */
export const lineDiscountAmount = (line, related) => {
  const info = related?.diskonInfo;
  if (!info) return 0;
  const qty = toNum(line?.quantity) || 1;
  const lineTotal = toNum(line?.RpHargaDasar) * qty;
  const rp = toNum(info.RpPotonganHarga);
  if (Number.isFinite(rp) && rp > 0) return Math.min(rp, lineTotal);
  const frac = discountFraction(info.percentPotonganHarga);
  if (frac > 0 && Number.isFinite(lineTotal)) return lineTotal * frac;
  return 0;
};

export const effectiveUnitPrice = (line, diskon = []) => {
  const base = toNum(line?.RpHargaDasar);
  if (!Number.isFinite(base)) return NaN;

  const related = (diskon || []).find(
    (d) => d.sku === line.sku || d.description === line.description,
  );
  if (!related?.diskonInfo) return base;

  const qty = toNum(line?.quantity) || 1;
  return Math.max(0, base - lineDiscountAmount(line, related) / qty);
};

export const lineNeedsDiscountApproval = (line, webPrice, diskon = []) => {
  const web = Number(webPrice ?? line?.RpHargaLowest);
  if (!Number.isFinite(web) || web <= 0) return false;

  const retail = effectiveUnitPrice(line, diskon);
  if (!Number.isFinite(retail)) return false;

  return retail < web;
};

/**
 * @param {{ currentBill?: Array, diskon?: Array }} bill
 * @param {Record<string, number>} [webPriceBySku]
 */
export const billNeedsDiscountApproval = (bill, webPriceBySku = {}) => {
  const currentBill = bill?.currentBill || [];
  const diskon = bill?.diskon || [];
  const hasKasirDiskon = diskon.length > 0;
  const hasManualPriceCut = currentBill.some(
    (line) => line?.priceEdited === true,
  );

  if (!hasKasirDiskon && !hasManualPriceCut) {
    return false;
  }

  return currentBill.some((line) =>
    lineNeedsDiscountApproval(
      line,
      webPriceBySku[line.sku] ?? line.RpHargaLowest,
      diskon,
    ),
  );
};

export const DISCOUNT_APPROVAL_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};
