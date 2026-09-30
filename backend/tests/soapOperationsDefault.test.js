import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultNavOperations,
  resolveSoapOperations,
} from "../utils/soapNav/templates.js";
import { getEnabledOperation } from "../utils/soapNav/client.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

test("resolveSoapOperations: empty incoming → full defaults", () => {
  const ops = resolveSoapOperations([], null);
  const defaults = createDefaultNavOperations();
  assert.equal(ops.length, defaults.length);
  for (const key of Object.values(NAV_SOAP_OPERATIONS)) {
    assert.ok(
      ops.some((op) => op.key === key && op.enabled !== false),
      `missing ${key}`,
    );
  }
});

test("resolveSoapOperations: undefined incoming + empty existing → defaults", () => {
  const ops = resolveSoapOperations(undefined, []);
  assert.ok(ops.length >= 5);
  assert.ok(
    getEnabledOperation({ operations: ops }, NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP),
  );
  assert.ok(
    getEnabledOperation({ operations: ops }, NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT),
  );
  assert.ok(
    getEnabledOperation({ operations: ops }, NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO),
  );
  assert.ok(
    getEnabledOperation(
      { operations: ops },
      NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    ),
  );
});

test("resolveSoapOperations: partial list digabung dengan default yang belum ada", () => {
  const partial = [
    {
      key: NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
      enabled: true,
      soapAction: "custom-ship",
    },
  ];
  const ops = resolveSoapOperations(partial, null);
  assert.equal(
    ops.find((o) => o.key === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP)
      .soapAction,
    "custom-ship",
  );
  assert.ok(
    ops.some((o) => o.key === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO),
  );
});

test("resolveSoapOperations: enabled:false pada existing tetap dipertahankan", () => {
  const existing = [
    {
      key: NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY,
      enabled: false,
      soapAction: "disabled-op",
    },
  ];
  const ops = resolveSoapOperations(undefined, existing);
  const inv = ops.find(
    (o) => o.key === NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY,
  );
  assert.equal(inv.enabled, false);
  assert.equal(inv.soapAction, "disabled-op");
  // operasi wajib lain tetap ada
  assert.ok(
    getEnabledOperation({ operations: ops }, NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT),
  );
});
