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
import { mapInvoiceToSalesOrderPayload } from "../utils/soapNav/buildXml.js";

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
  const navShipments = new Map();
  let shipCounter = 0;

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
    // NAV palsu yang stateful: tiap ship = SS baru, undo = line koreksi qty negatif
    executeNavSoap: async ({ operationKey, payload }) => {
      soapCalls.push({ operationKey, payload });

      if (operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP) {
        shipCounter += 1;
        const soNo = `SO/RTL-TEST-${shipCounter}`;
        const ssNo = `SS/RTL-TEST-${shipCounter}`;
        navShipments.set(
          ssNo,
          payload.lines.map((line) => ({
            documentNo: ssNo,
            lineNo: line.lineNo,
            itemNo: line.itemNo,
            qty: line.qty,
          })),
        );
        const returnValue = `${soNo};${ssNo}`;
        return {
          operationKey,
          parsed: { returnValue },
          response: { body: `<return_value>${returnValue}</return_value>` },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES) {
        const lines = navShipments.get(payload.codDocNumber) || [];
        const xml = lines
          .map(
            (l) => `
          <SalesShipmentLines>
            <DocumentNo>${l.documentNo}</DocumentNo>
            <LineNo>${l.lineNo}</LineNo>
            <Type>Item</Type>
            <No>${l.itemNo}</No>
            <Location>LOC-01</Location>
            <Qty>${l.qty}</Qty>
            <UOM>PCS</UOM>
            <Catatan></Catatan>
          </SalesShipmentLines>`,
          )
          .join("");
        return {
          operationKey,
          parsed: { returnValue: xml },
          response: { body: xml },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT) {
        const lines = navShipments.get(payload.docNo) || [];
        const original = lines.find((l) => l.lineNo === payload.lineNo);
        if (!original) throw new Error("line tidak ada di NAV");
        const maxLineNo = Math.max(...lines.map((l) => l.lineNo));
        lines.push({ ...original, lineNo: maxLineNo + 10000, qty: -original.qty });
        const returnValue = `${payload.docNo};${payload.lineNo};${original.itemNo};${original.qty}`;
        return {
          operationKey,
          parsed: { returnValue },
          response: { body: `<return_value>${returnValue}</return_value>` },
        };
      }

      if (operationKey === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO) {
        const returnValue = `SI/RTL-TEST-${soapCalls.length};${payload.docNo}`;
        return {
          operationKey,
          parsed: { returnValue },
          response: { body: `<return_value>${returnValue}</return_value>` },
        };
      }

      throw new Error(`Unexpected SOAP op in test: ${operationKey}`);
    },
    invoices,
    soapCalls,
    navShipments,
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
  assert.equal(deps.soapCalls[1].payload.docNo, "SO/RTL-TEST-1");
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
  assert.equal(voided.undone.length, 1);
  assert.deepEqual(
    deps.soapCalls.map((c) => c.operationKey),
    [
      NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
      NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
    ],
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
  // void setelah re-ship: hanya line aktif (SS ke-2) yang di-undo
  assert.equal(voided.undone.length, 1);
  assert.equal(voided.undone[0].documentNo, "SS/RTL-TEST-2");
});

const belowWebBill = (unitPrice = 90000) => ({
  ...baseBill(),
  currentBill: [
    {
      sku: "SKU-A",
      description: "Item A",
      quantity: 1,
      RpHargaDasar: unitPrice,
      RpHargaLowest: 120000,
      totalRp: unitPrice,
      priceEdited: true,
    },
  ],
  subTotal: unitPrice,
  total: unitPrice,
});

test("approveDiscount: web admin tanpa outletId → outlet dari invoice", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = belowWebBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });

  const { invoice } = await service.approveDiscount({
    invoiceId: bill._id,
    approved: true,
  });
  assert.equal(invoice.discountApprovalStatus, DISCOUNT_APPROVAL_STATUS.APPROVED);
  assert.equal(invoice.discountApprovedPrices["SKU-A"], 90000);
});

test("approveDiscount: tolak kalau invoice tidak pending", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = baseBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  await assert.rejects(
    () => service.approveDiscount({ invoiceId: bill._id, approved: true }),
    /tidak menunggu approval/,
  );
});

test("reject diskon → cetak lagi tetap pending, tanpa SOAP", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = belowWebBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  await service.approveDiscount({ invoiceId: bill._id, approved: false });

  const again = await service.cetakBill({ outletId: OUTLET_ID, bill });
  assert.equal(again.action, "pending_discount_approval");
  assert.equal(deps.soapCalls.length, 0);
});

test("harga diturunkan setelah approve → butuh approve ulang", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = belowWebBill(90000);
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  await service.approveDiscount({ invoiceId: bill._id, approved: true });

  const lower = await service.cetakBill({
    outletId: OUTLET_ID,
    bill: belowWebBill(50000),
  });
  assert.equal(lower.action, "pending_discount_approval");
  assert.equal(deps.soapCalls.length, 0);
});

test("discountGate: diskon persen (pecahan 0.3 dari mobile) butuh approval", () => {
  const bill = {
    currentBill: [
      { sku: "SKU-A", quantity: 2, RpHargaDasar: 150000, RpHargaLowest: 120000 },
    ],
    diskon: [{ sku: "SKU-A", diskonInfo: { percentPotonganHarga: 0.3 } }],
  };
  assert.equal(effectiveUnitPrice(bill.currentBill[0], bill.diskon), 105000);
  assert.equal(billNeedsDiscountApproval(bill), true);
});

test("discountGate: RpPotonganHarga adalah potongan total baris (qty > 1)", () => {
  const line = { sku: "SKU-A", quantity: 2, RpHargaDasar: 150000 };
  const diskon = [{ sku: "SKU-A", diskonInfo: { RpPotonganHarga: 40000 } }];
  assert.equal(effectiveUnitPrice(line, diskon), 130000);
});

test("NAV payload: diskon persen → LineDiscountAmount rupiah total baris", () => {
  const payload = mapInvoiceToSalesOrderPayload(
    {
      _id: "LOC-01-ksr-001",
      kodeInvoice: "LOKSR120001",
      currentBill: [
        { sku: "SKU-A", quantity: 2, RpHargaDasar: 150000, totalRp: 300000 },
        { sku: "SKU-B", quantity: 1, RpHargaDasar: 50000, totalRp: 50000 },
      ],
      diskon: [
        { sku: "SKU-A", diskonInfo: { percentPotonganHarga: 0.1 } },
        { sku: "SKU-B", diskonInfo: { RpPotonganHarga: 5000 } },
      ],
    },
    { noSeries: "SO-RTL", sellToCustNo: "C0001" },
    "LOC-01",
  );
  assert.equal(payload.lines[0].lineDiscountAmount, 30000);
  assert.equal(payload.lines[1].lineDiscountAmount, 5000);
});

test("warehouseReady false kalau return_value tanpa No. Sales Shipment", async () => {
  const deps = createMemoryDeps();
  const originalExec = deps.executeNavSoap;
  deps.executeNavSoap = async (args) => {
    if (args.operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP) {
      deps.soapCalls.push(args);
      return { parsed: { returnValue: "error: lokasi kosong" }, response: {} };
    }
    return originalExec(args);
  };
  const service = createStatelessBillService(deps);
  const cetak = await service.cetakBill({ outletId: OUTLET_ID, bill: baseBill() });
  assert.equal(cetak.invoice.warehouseReady, false);
});

test("bayar: done=true dari Midtrans tapi belum WsPostInvoiceSO → tetap post, lalu idempoten", async () => {
  const deps = createMemoryDeps();
  const service = createStatelessBillService(deps);
  const bill = baseBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  // webhook Midtrans menandai lunas duluan
  deps.invoices.set(bill._id, { ...deps.invoices.get(bill._id), done: true });

  const first = await service.bayar({ outletId: OUTLET_ID, invoiceId: bill._id });
  assert.equal(first.action, "paid");
  assert.match(first.invoice.navSalesInvoiceNo, /^SI\/RTL-TEST-/);

  const second = await service.bayar({ outletId: OUTLET_ID, invoiceId: bill._id });
  assert.equal(second.action, "already_paid");
  const posts = deps.soapCalls.filter(
    (c) => c.operationKey === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
  );
  assert.equal(posts.length, 1);
});

test("bayar: klaim lock gagal (proses lain sedang post) → 409 tanpa SOAP", async () => {
  const deps = createMemoryDeps();
  deps.claimInvoicePosting = async () => false;
  const service = createStatelessBillService(deps);
  const bill = baseBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  deps.soapCalls.length = 0;

  await assert.rejects(
    () => service.bayar({ outletId: OUTLET_ID, invoiceId: bill._id }),
    (err) => err.statusCode === 409,
  );
  assert.equal(deps.soapCalls.length, 0);
});

test("bayar: SOAP gagal → lock dilepas supaya bisa dicoba lagi", async () => {
  const deps = createMemoryDeps();
  let released = 0;
  deps.claimInvoicePosting = async () => true;
  deps.releaseInvoicePosting = async () => {
    released += 1;
  };
  const originalExec = deps.executeNavSoap;
  deps.executeNavSoap = async (args) => {
    if (args.operationKey === NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO) {
      throw new Error("NAV down");
    }
    return originalExec(args);
  };
  const service = createStatelessBillService(deps);
  const bill = baseBill();
  await service.cetakBill({ outletId: OUTLET_ID, bill });
  await assert.rejects(
    () => service.bayar({ outletId: OUTLET_ID, invoiceId: bill._id }),
    /NAV down/,
  );
  assert.equal(released, 1);
  assert.equal(deps.invoices.get(bill._id).done, false);
});
