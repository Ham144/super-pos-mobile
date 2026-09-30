// normalisasi RpHargaDasar untuk tampilan & payload API
export function parseRpHargaDasar(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object" && value?.$numberDecimal !== undefined) {
    const num = parseFloat(String(value.$numberDecimal));
    return Number.isNaN(num) ? null : num;
  }

  const num = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(num) ? null : num;
}
