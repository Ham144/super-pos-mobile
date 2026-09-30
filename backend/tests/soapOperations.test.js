import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultNavOperations,
  resolveSoapOperations,
} from "../utils/soapNav/templates.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

const allKeys = createDefaultNavOperations().map((op) => op.key);

test("operations kosong & belum ada config → semua default", () => {
  const ops = resolveSoapOperations([], undefined);
  assert.deepEqual(
    ops.map((op) => op.key),
    allKeys,
  );
  assert.ok(ops.every((op) => op.enabled === true && op.soapAction));
});

test("operations undefined → pakai yang sudah tersimpan, bukan dihapus", () => {
  const existing = [
    { key: NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO, soapAction: "custom", enabled: false },
  ];
  const ops = resolveSoapOperations(undefined, existing);
  const post = ops.find((op) => op.key === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO);
  assert.equal(post.soapAction, "custom");
  assert.equal(post.enabled, false);
  assert.equal(ops.length, allKeys.length);
});

test("config lama tanpa WsPostInvoiceSO → ditambahkan default", () => {
  const ops = resolveSoapOperations([
    { key: NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP, enabled: true },
  ]);
  assert.ok(ops.some((op) => op.key === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO));
  assert.equal(new Set(ops.map((op) => op.key)).size, ops.length);
});
