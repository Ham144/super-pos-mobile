import {
  csvCell,
  csvPoErp,
  parseCsvText,
  readCsvText,
} from "./csvDelimiter.js";

const isHeaderRow = (row) => {
  const sku = csvCell(row, "SKU").toLowerCase();
  return sku === "sku";
};

// Pilih delimiter yang menghasilkan paling banyak baris SKU valid
const pickDelimiter = async (text) => {
  let bestSep = ";";
  let bestScore = 0;

  for (const sep of [";", ",", "\t"]) {
    try {
      const rows = await parseCsvText(text, sep);
      let score = 0;
      for (const row of rows) {
        if (isHeaderRow(row)) continue;
        const sku = csvCell(row, "SKU");
        if (sku) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSep = sep;
      }
    } catch {
      // coba delimiter lain
    }
  }

  return bestSep;
};

// Satu file CSV = banyak PO. Erp hanya di baris pertama tiap grup, baris lanjutan kosong = item PO yang sama
export const parsePurchaseOrdersFromCsv = async (filePath) => {
  const text = readCsvText(filePath);
  const separator = await pickDelimiter(text);
  const rows = await parseCsvText(text, separator);

  const results = [];
  let currentErp = "";
  let currentPlat = "";
  let currentItems = [];

  const flush = () => {
    if (!currentErp || !currentItems.length) return;
    results.push({
      Erp: currentErp,
      plat: currentPlat,
      items: currentItems,
    });
  };

  for (const row of rows) {
    if (isHeaderRow(row)) continue;

    const erpCell = csvPoErp(row);
    if (erpCell) {
      flush();
      currentErp = erpCell;
      currentPlat = csvCell(row, "Plat") || "";
      currentItems = [];
    }

    const sku = csvCell(row, "SKU");
    if (!sku || !currentErp) continue;

    currentItems.push({
      sku,
      request: Number(csvCell(row, "Request")) || 0,
      barcodeItem: csvCell(row, "Barcode") || "",
      keterangan: csvCell(row, "Keterangan") || "",
    });
  }

  flush();

  return { results, separator };
};
