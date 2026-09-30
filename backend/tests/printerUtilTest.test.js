import test from "node:test";
import assert from "node:assert/strict";
import {
  getZeroTax,
  extractTax,
  buildReceiptAmounts,
  indonesianTaxation,
  PPN_DIVISOR,
} from "../utils/indonesianTaxation.js";

test("getZeroTax: harga inclusive 111000 → DPP 100000", () => {
  assert.equal(getZeroTax(111_000), 100_000);
  assert.equal(indonesianTaxation.getZeroTax(111_000), 100_000);
});

test("extractTax: PPN dari harga inclusive (bukan price * 0.11)", () => {
  // Salah: 111000 * 0.11 = 12210 (itu menambah pajak di atas harga)
  // Benar: 111000 - 100000 = 11000
  assert.equal(extractTax(111_000), 11_000);
  assert.notEqual(extractTax(111_000), Math.round(111_000 * 0.11));
});

test("buildReceiptAmounts: Subtotal + PPN === Total (setelah diskon)", () => {
  const totalAfterDiscount = 99_900; // inclusive, sudah diskon
  const amounts = buildReceiptAmounts(totalAfterDiscount);
  assert.equal(amounts.total, totalAfterDiscount);
  assert.equal(amounts.subtotalExclTax + amounts.tax, amounts.total);
  assert.equal(amounts.subtotalExclTax, getZeroTax(totalAfterDiscount));
  assert.equal(amounts.tax, extractTax(totalAfterDiscount));
});

test("buildReceiptAmounts: rounding tidak pecah (total ganjil)", () => {
  for (const total of [100_000, 1, 50_050, 1_234_567]) {
    const { subtotalExclTax, tax, total: t } = buildReceiptAmounts(total);
    assert.equal(subtotalExclTax + tax, t, `pecah untuk total=${total}`);
  }
});

test("tanpa diskon: jumlah DPP item ≈ DPP dari subtotal inclusive", () => {
  // Item totalRp di bill = harga line inclusive (sudah termasuk PPN)
  const currentBill = [
    { sku: "A", quantity: 2, totalRp: 222_000 }, // 2 x 111000
    { sku: "B", quantity: 1, totalRp: 55_500 },
  ];
  const subtotalInclusive = currentBill.reduce((s, i) => s + i.totalRp, 0);
  assert.equal(subtotalInclusive, 277_500);

  const sumItemDpp = currentBill.reduce(
    (s, i) => s + getZeroTax(i.totalRp),
    0,
  );
  // Sum of rounded line DPPs can drift ±1 per line vs DPP(subtotal)
  assert.ok(Math.abs(sumItemDpp - getZeroTax(subtotalInclusive)) <= currentBill.length);

  // Footer harus pakai total bayar (setelah diskon), bukan jumlah item mentah
  const totalPay = subtotalInclusive; // no discount
  const footer = buildReceiptAmounts(totalPay);
  assert.equal(footer.subtotalExclTax + footer.tax, footer.total);
});

test("dengan diskon: footer berdasar total (bukan subtotal mentah)", () => {
  const subtotalInclusive = 277_500; // sebelum diskon, inclusive
  const discountInclusive = 11_100;
  const totalPay = subtotalInclusive - discountInclusive; // 266400

  const footer = buildReceiptAmounts(totalPay);
  assert.equal(footer.total, 266_400);
  assert.equal(footer.subtotalExclTax + footer.tax, 266_400);

  // DPP footer ≠ DPP(subtotal mentah) karena diskon sudah dipotong
  assert.notEqual(footer.subtotalExclTax, getZeroTax(subtotalInclusive));
});

test("cara lama extractPPH = zeroTax * 0.11 hampir sama, tapi total-DPP lebih aman", () => {
  const total = 100_000;
  const zero = getZeroTax(total); // Math.round(100000/1.11)
  const oldWay = Math.round(zero * 0.11);
  const newWay = extractTax(total);
  // Keduanya harus menjumlah ke total jika pakai newWay; oldWay bisa off 1 rupiah
  assert.equal(zero + newWay, total);
  assert.ok(Math.abs(oldWay - newWay) <= 1);
  assert.equal(PPN_DIVISOR, 1.11);
});
