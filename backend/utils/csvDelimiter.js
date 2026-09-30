import fs from "fs";
import { Readable } from "stream";
import csv from "csv-parser";

// Bersihkan nilai cell dari quote Excel, BOM, dan karakter tersembunyi
export const normalizeCsvCell = (val) => {
  if (val === undefined || val === null) return "";
  let s = String(val).trim().replace(/^\uFEFF/, "").replace(/\r$/, "");
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

const headerKeys = (row) =>
  Object.keys(row || {}).map((k) =>
    k.replace(/^\uFEFF/, "").trim().toLowerCase(),
  );

// Baca file .csv dari Excel (UTF-8 / UTF-16)
export const readCsvText = (filePath) => {
  const buf = fs.readFileSync(filePath);

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const body = buf.subarray(2);
    const swapped = Buffer.alloc(body.length);
    for (let i = 0; i < body.length - 1; i += 2) {
      swapped[i] = body[i + 1];
      swapped[i + 1] = body[i];
    }
    return swapped.toString("utf16le");
  }

  const sample = buf.subarray(0, Math.min(buf.length, 400));
  let utf16Hint = 0;
  for (let i = 1; i < sample.length; i += 2) {
    if (sample[i] === 0) utf16Hint++;
  }
  if (utf16Hint > 30) {
    return buf.toString("utf16le");
  }

  const utf8 = buf.toString("utf8");
  // fallback latin1 untuk CSV Excel Windows yang bukan UTF-8
  if (/sku/i.test(utf8)) return utf8;
  const latin1 = buf.toString("latin1");
  if (/sku/i.test(latin1)) return latin1;
  return utf8;
};

// Deteksi delimiter ; , atau tab dari baris pertama (fallback)
export const detectCsvSeparator = (firstLine = "") => {
  const line = firstLine.replace(/^\uFEFF/, "");
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs > 0 && tabs >= semicolons && tabs >= commas) return "\t";
  if (semicolons > commas) return ";";
  if (commas > semicolons) return ",";
  return ";";
};

export const detectCsvSeparatorFromFile = (filePath) => {
  const text = readCsvText(filePath);
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  return detectCsvSeparator(firstLine);
};

const rowMatchesHeaders = (row, requiredHeaders = []) => {
  const keys = headerKeys(row);
  return requiredHeaders.every((h) => {
    const target = h.toLowerCase();
    // exact match — hindari delimiter salah yang menggabung semua kolom jadi 1 header
    return keys.some((k) => k === target);
  });
};

export const parseCsvText = async (text, separator) => {
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(text)
      .pipe(
        csv({
          separator,
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim(),
        }),
      )
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  return rows;
};

// Coba ; , tab — pilih yang header-nya punya kolom wajib (mis. SKU)
export const detectBestCsvSeparator = async (
  text,
  requiredHeaders = ["sku"],
) => {
  const sample = text.split(/\r?\n/).slice(0, 15).join("\n");

  for (const sep of [";", ",", "\t"]) {
    try {
      const rows = await parseCsvText(sample, sep);
      if (rows.length && rowMatchesHeaders(rows[0], requiredHeaders)) {
        return sep;
      }
    } catch {
      // coba delimiter berikutnya
    }
  }

  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || "";
  return detectCsvSeparator(firstLine);
};

export const parseCsvFile = async (filePath, requiredHeaders = ["sku"]) => {
  const text = readCsvText(filePath);
  const separator = await detectBestCsvSeparator(text, requiredHeaders);
  const rows = await parseCsvText(text, separator);
  return { rows, separator };
};

// Ambil nilai cell CSV (header case-insensitive + strip BOM)
export const csvCell = (row, key) => {
  const raw =
    row[key] ??
    row[
      Object.keys(row).find(
        (k) =>
          k.replace(/^\uFEFF/, "").trim().toLowerCase() === key.toLowerCase(),
      )
    ];
  return normalizeCsvCell(raw);
};

// Alias header ERP untuk import PO (template vs export download)
export const csvPoErp = (row) =>
  csvCell(row, "Purchase Code (Erp)") ||
  csvCell(row, "Erp") ||
  csvCell(row, "Purchase Code");
