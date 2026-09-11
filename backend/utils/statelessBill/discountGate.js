/**
 * Discount / below-web price approval gate for outlet.mode === "stateless".
 *
 * Rule (todo): if kasir sets a discount (catalog diskon OR manual price edit)
 * and the effective retail unit price is below web price (RpHargaLowest),
 * persist the bill as pending approval and do NOT call NAV SOAP.
 */

export const effectiveUnitPrice = (line, diskon = []) => {
  const base = Number(line?.RpHargaDasar);
  if (!Number.isFinite(base)) return NaN;

  const related = (diskon || []).find(
    (d) => d.sku === line.sku || d.description === line.description,
  );
  if (!related?.diskonInfo) return base;

  const rpPotongan = Number(related.diskonInfo.RpPotonganHarga);
  if (Number.isFinite(rpPotongan) && rpPotongan > 0) {
    return Math.max(0, base - rpPotongan);
  }

  const pct = Number(related.diskonInfo.percentPotonganHarga);
  if (Number.isFinite(pct) && pct > 0) {
    return Math.max(0, base * (1 - pct / 100));
  }

  return base;
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
