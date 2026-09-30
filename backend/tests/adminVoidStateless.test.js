import test from "node:test";
import assert from "node:assert/strict";
import { resolveWebVoidPath } from "../utils/statelessBill/webVoidStrategy.js";
import { createStatelessBillService } from "../utils/statelessBill/statelessTransaction.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

test("web void: offline → offline_mongo (tidak sentuh NAV)", () => {
  assert.equal(
    resolveWebVoidPath({ outletMode: "offline", navDocumentNo: "X" }),
    "offline_mongo",
  );
  assert.equal(
    resolveWebVoidPath({ outletMode: undefined, navShipmentNo: "SS/1" }),
    "offline_mongo",
  );
});

test("web void: stateless tanpa NAV doc → reject_mobile_only", () => {
  assert.equal(
    resolveWebVoidPath({ outletMode: "stateless" }),
    "reject_mobile_only",
  );
});

test("web void: stateless + navDocumentNo/navShipmentNo → nav_voidBill", () => {
  assert.equal(
    resolveWebVoidPath({
      outletMode: "stateless",
      navDocumentNo: "LOC-01-ksr-1",
    }),
    "nav_voidBill",
  );
  assert.equal(
    resolveWebVoidPath({
      outletMode: "stateless",
      navShipmentNo: "SS/RTL-1",
    }),
    "nav_voidBill",
  );
});

test("nav_voidBill path: voidBill undo shipment (mock SOAP)", async () => {
  const invoices = new Map();
  const soapCalls = [];
  const bill = {
    _id: "LOC-01-ksr-001",
    kodeInvoice: "LOKSR120001",
    outlet: "outlet-1",
    currentBill: [
      { sku: "SKU-A", quantity: 1, RpHargaDasar: 100000, totalRp: 100000 },
    ],
    navDocumentNo: "LOC-01-ksr-001",
    navShipmentNo: "SS/RTL-1",
    navShipReturnValue: "SO/RTL-1;SS/RTL-1",
    done: true,
  };
  invoices.set(bill._id, bill);

  const service = createStatelessBillService({
    findOutlet: async () => ({
      _id: "outlet-1",
      mode: "stateless",
      kodeOutlet: "LOC-01",
    }),
    findSoapConfig: async () => ({}),
    findInventoriesBySkus: async () => [],
    findInvoiceById: async (id) => invoices.get(id),
    upsertInvoice: async (p) => {
      const next = { ...invoices.get(p._id), ...p };
      invoices.set(p._id, next);
      return next;
    },
    executeNavSoap: async ({ operationKey, payload }) => {
      soapCalls.push({ operationKey, payload });
      if (operationKey === NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES) {
        const xml = `<SalesShipmentLines>
          <DocumentNo>SS/RTL-1</DocumentNo><LineNo>1000</LineNo>
          <No>SKU-A</No><Qty>1</Qty>
        </SalesShipmentLines>`;
        return { parsed: { returnValue: xml }, response: { body: xml } };
      }
      if (operationKey === NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT) {
        const returnValue = `${payload.docNo};${payload.lineNo};SKU-A;1`;
        return { parsed: { returnValue }, response: { body: returnValue } };
      }
      throw new Error(operationKey);
    },
  });

  assert.equal(
    resolveWebVoidPath({
      outletMode: "stateless",
      navDocumentNo: bill.navDocumentNo,
    }),
    "nav_voidBill",
  );

  const voided = await service.voidBill({
    outletId: "outlet-1",
    invoiceId: bill._id,
    confirmVoidById: "admin-1",
  });
  assert.equal(voided.invoice.isVoid, true);
  assert.ok(
    soapCalls.some((c) => c.operationKey === NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT),
  );
});
