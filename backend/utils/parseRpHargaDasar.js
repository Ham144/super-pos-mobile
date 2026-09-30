// normalisasi RpHargaDasar dari berbagai format (number, string, Decimal128)
export function parseRpHargaDasar(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object" && value?.$numberDecimal !== undefined) {
    const num = parseFloat(String(value.$numberDecimal));
    return Number.isNaN(num) ? null : num;
  }

  if (typeof value === "object" && typeof value.toString === "function") {
    const num = parseFloat(value.toString());
    return Number.isNaN(num) ? null : num;
  }

  const num = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(num) ? null : num;
}
