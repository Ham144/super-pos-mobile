import test from "node:test";
import assert from "node:assert/strict";
import {
  billNeedsDiscountApproval,
  effectiveUnitPrice,
  DISCOUNT_APPROVAL_STATUS,
} from "../utils/statelessBill/discountGate.js";
import { parseSalesShipmentLines } from "../utils/statelessBill/parseShipmentLines.js";
import { createStatelessBillService } from "../utils/statelessBill/statelessTransaction.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

const OUTLET_ID = "outlet-stateless-1";
const OFFLINE_OUTLET_ID = "outlet-offline-1";

const baseBill = () => ({
  _id: "LOC-01-ksr-001",
  kodeInvoice: "LOKSR120001",
  currentBill: [
    {
      sku: "SKU-A",
      description: "Item A",
      quantity: 2,
      RpHargaDasar: 100000,
      RpHargaLowest: 120000,
      totalRp: 200000,
      catatan: "",
    },
  ],
  diskon: [],
  promo: [],
  subTotal: 200000,
  total: 200000,
  salesPerson: "Kasir1",
  spg: "spg-1",
  paymentMethod: "Cash",
  customer: { name: "Budi", email: "budi@test.com" },
});

const createMemoryDeps = () => {
  const invoices = new Map();
  const soapCalls = [];

  const deps = {
    findOutlet: async (id) => {
      if (id === OUTLET_ID) {
        return { _id: id, mode: "stateless", kodeOutlet: "LOC-01" };
      }
      if (id === OFFLINE_OUTLET_ID) {
        return { _id: id, mode: "offline", kodeOutlet: "OFF-01" };
      }
      return null;
    },
    findSoapConfig: async () => ({
      endpoint: "http://nav.test/WSNav",
      usernameNTLM: "user",
      passwordNTLM: "pass",
      defaults: { noSeries: "SO-RTL", sellToCustNo: "C0001" },
      operations: Object.values(NAV_SOAP_OPERATIONS).map((key) => ({
        key,
        enabled: true,
      })),
    }),
    findInventoriesBySkus: async (_outletId, skus) =>
      skus.map((sku) => ({
        sku,
        RpHargaDasar: 100000,
        RpHargaLowest: 120000,
      })),
    findInvoiceById: async (id) => invoices.get(id) || null,
    upsertInvoice: async (payload) => {
      const prev = invoices.get(payload._id) || {};
      const next = { ...prev, ...payload };
      invoices.set(payload._id, next);
      return next;
    },
    findOrCreateCustomer: async (raw) => {
      if (!raw) return null;
      if (typeof raw === "object" && raw._id) return String(raw._id);
      return "cust-mock-1";
    },
    executeNavSoap: async ({ operationKey, payload }) => {
      soapCalls.push({ operationKey, payload });

      if (operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP) {
        return {
          operationKey,
          parsed: { returnValue: "SO/RTL-TEST-1;SS/RTL-TEST-1" },
          response: {
            body: "<return_value>SO/RTL-TEST-1;SS/RTL-TEST-1</return_value>",
          },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES) {
        const docNo = payload.codDocNumber;
        const xml = `
          <SalesShipmentLines>
            <DocumentNo>${docNo}</DocumentNo>
            <LineNo>1000</LineNo>
            <Type>Item</Type>
            <No>SKU-A</No>
            <Location>LOC-01</Location>
            <Qty>2</Qty>
            <UOM>PCS</UOM>
            <Catatan></Catatan>
          </SalesShipmentLines>
          <SalesShipmentLines>
            <DocumentNo>${docNo}</DocumentNo>
            <LineNo>2000</LineNo>
            <Type>Item</Type>
            <No>SKU-B</No>
            <Location>LOC-01</Location>
            <Qty>1</Qty>
            <UOM>PCS</UOM>
            <Catatan></Catatan>
          </SalesShipmentLines>
        `;
        return {
          operationKey,
          parsed: { returnValue: xml },
          response: { body: xml },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT) {
        const docNo = payload.docNo;
        const lineNo = payload.lineNo;
        const returnValue = `${docNo};${lineNo};SKU-A;1`;
        return {
          operationKey,
          parsed: { returnValue },
          response: { body: `<return_value>${returnValue}</return_value>` },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO) {
        return {
          operationKey,
          parsed: { returnValue: "invoiced" },
          response: { body: "<return_value>invoiced</return_value>" },
        };
      }

      throw new Error(`Unexpected SOAP op in test: ${operationKey}`);
    },
    invoices,
    soapCalls,
  };

  return deps;
};

test("discountGate: effective unit price after Rp potongan", () => {
  const line = { sku: "SKU-A", RpHargaDasar: 100000 };
  const diskon = [
    {
      sku: "SKU-A",
      diskonInfo: { RpPotonganHarga: 15000 },
    },
  ];
  assert.equal(effectiveUnitPrice(line, diskon), 85000);
});

test("discountGate: needs approval when kasir diskon pushes retail below web", () => {
  const bill = {
    currentBill: [
      { sku: "SKU-A", RpHargaDasar: 100000, RpHargaLowest: 120000 },
    ],
    diskon: [
      {
        sku: "SKU-A",
        diskonInfo: { RpPotonganHarga: 30000 },
      },
    ],
  };
  assert.equal(billNeedsDiscountApproval(bill), true);
});

test("discountGate: needs approval when priceEdited below web", () => {
  const bill = {
    currentBill: [
      {
        sku: "SKU-A",
        RpHargaDasar: 90000,
        RpHargaLowest: 120000,
        priceEdited: true,
      },
    ],
    diskon: [],
  };
  assert.equal(billNeedsDiscountApproval(bill), true);
});

test("discountGate: no approval without diskon or price edit", () => {
  const bill = {
    currentBill: [
      { sku: "SKU-A", RpHargaDasar: 90000, RpHargaLowest: 120000 },
    ],
    diskon: [],
  };
  assert.equal(billNeedsDiscountApproval(bill), false);
});

test("parseSalesShipmentLines extracts rows", () => {
  const xml = `
    <return_value>
      &lt;SalesShipmentLines&gt;
        &lt;DocumentNo&gt;SO-1&lt;/DocumentNo&gt;
        &lt;LineNo&gt;1000&lt;/LineNo&gt;
        &lt;No&gt;SKU-A&lt;/No&gt;
        &lt;Qty&gt;2&lt;/Qty&gt;
      &lt;/SalesShipmentLines&gt;
    </return_value>
  `;
  const lines = parseSalesShipmentLines(xml);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].documentNo, "SO-1");
  assert.equal(lines[0].lineNo, 1000);
  assert.equal(lines[0].itemNo, "SKU-A");
  assert.equal(lines[0].qty, 2);
});

test("rejects offline outlet on stateless endpoints", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  await assert.rejects(
    () => service.cetakBill({ outletId: OFFLINE_OUTLET_ID, bill: baseBill() }),
    /mode=stateless/,
  );
  assert.equal(deps.soapCalls.length, 0);
});

test("E2E happy path: cetak ship → bayar invoice (no discount)", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = baseBill();

  const cetak = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(cetak.action, "shipped");
  assert.equal(cetak.invoice.warehouseReady, true);
  assert.equal(cetak.invoice.navDocumentNo, bill._id);
  assert.equal(cetak.invoice.isPrintedCustomerBilling, true);
  assert.equal(cetak.invoice.done, false);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
  );

  const bayar = await service.bayar({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    paymentMethod: "Cash",
    nomorTransaksi: "TRX-1",
  });
  assert.equal(bayar.action, "paid");
  assert.equal(bayar.invoice.done, true);
  assert.equal(
    deps.soapCalls[1].operationKey,
    NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
  );
  assert.equal(deps.soapCalls[1].payload.docNo, bill._id);
});

test("E2E discount gate: pending approval skips SOAP until approved then ships", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = {
    ...baseBill(),
    currentBill: [
      {
        sku: "SKU-A",
        description: "Item A",
        quantity: 1,
        RpHargaDasar: 80000,
        RpHargaLowest: 120000,
        totalRp: 80000,
        priceEdited: true,
      },
    ],
    diskon: [],
    subTotal: 80000,
    total: 80000,
  };

  const pending = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(pending.action, "pending_discount_approval");
  assert.equal(
    pending.invoice.discountApprovalStatus,
    DISCOUNT_APPROVAL_STATUS.PENDING,
  );
  assert.equal(deps.soapCalls.length, 0);

  await assert.rejects(
    () =>
      service.bayar({
        outletId: OUTLET_ID,
        invoiceId: bill._id,
      }),
    /menunggu approve discount/,
  );

  await service.approveDiscount({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    approved: true,
  });

  const shipped = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(shipped.action, "shipped");
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
  );

  const paid = await service.bayar({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
  });
  assert.equal(paid.action, "paid");
  assert.equal(paid.invoice.done, true);
});

test("E2E edit/remove SKU after ship: GetSalesShipmentLines → WsUndoShipment", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = baseBill();

  await service.cetakBill({ outletId: OUTLET_ID, bill });
  deps.soapCalls.length = 0;

  const edited = await service.editOrRemoveLines({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    currentBill: [
      {
        ...bill.currentBill[0],
        quantity: 1,
        totalRp: 100000,
        quantityChanged: true,
      },
    ],
  });

  assert.equal(edited.action, "undone_lines");
  assert.equal(edited.invoice.warehouseReady, false);
  assert.equal(edited.invoice.isPrintedCustomerBilling, false);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
  );
  assert.equal(
    deps.soapCalls[1].operationKey,
    NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
  );
  assert.equal(deps.soapCalls[1].payload.lineNo, 1000);
});

test("E2E void next day: shipment lines + undo all", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = baseBill();

  await service.cetakBill({ outletId: OUTLET_ID, bill });
  await service.bayar({ outletId: OUTLET_ID, invoiceId: bill._id });
  deps.soapCalls.length = 0;

  const voided = await service.voidBill({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    confirmVoidById: "supervisor-1",
  });

  assert.equal(voided.action, "voided");
  assert.equal(voided.invoice.isVoid, true);
  assert.equal(voided.undone.length, 2);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
  );
  assert.equal(
    deps.soapCalls[1].operationKey,
    NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
  );
  assert.equal(
    deps.soapCalls[2].operationKey,
    NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
  );
});

test("E2E full transaction with optional layers in order", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);

  // 1) price-edited below web → pending
  const bill = {
    ...baseBill(),
    currentBill: [
      {
        sku: "SKU-A",
        description: "Item A",
        quantity: 2,
        RpHargaDasar: 90000,
        RpHargaLowest: 120000,
        totalRp: 180000,
        priceEdited: true,
      },
    ],
    subTotal: 180000,
    total: 180000,
  };

  const pending = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(pending.action, "pending_discount_approval");

  // 2) approve
  await service.approveDiscount({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    approved: true,
  });

  // 3) cetak → ship
  const shipped = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(shipped.action, "shipped");
  assert.ok(shipped.invoice.warehouseReady);

  // 4) edit qty → undo
  await service.editOrRemoveLines({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    removeSkus: ["SKU-A"],
    currentBill: [],
  });

  // Re-add and re-ship
  const reBill = {
    ...bill,
    currentBill: [
      {
        sku: "SKU-A",
        description: "Item A",
        quantity: 1,
        RpHargaDasar: 90000,
        RpHargaLowest: 120000,
        totalRp: 90000,
        priceEdited: true,
      },
    ],
    subTotal: 90000,
    total: 90000,
  };
  const reship = await service.cetakBill({ outletId: OUTLET_ID, bill: reBill });
  assert.equal(reship.action, "shipped");

  // 5) bayar
  const paid = await service.bayar({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
    paymentMethod: "EDC",
  });
  assert.equal(paid.invoice.done, true);

  // 6) void next day
  const voided = await service.voidBill({
    outletId: OUTLET_ID,
    invoiceId: bill._id,
  });
  assert.equal(voided.invoice.isVoid, true);

  const ops = deps.soapCalls.map((c) => c.operationKey);
  assert.ok(ops.includes(NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP));
  assert.ok(ops.includes(NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES));
  assert.ok(ops.includes(NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT));
  assert.ok(ops.includes(NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO));
  assert.ok(!ops.includes("sync-offline-mode"));
});
