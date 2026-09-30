import test from "node:test";
import assert from "node:assert/strict";
import { postNavInvoiceAfterGatewayPaid } from "../utils/statelessBill/postNavInvoiceAfterGatewayPaid.js";
import { createStatelessBillService } from "../utils/statelessBill/statelessTransaction.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

const OUTLET_ID = "outlet-stateless-1";

const createDeps = (initialInvoice) => {
  const invoices = new Map([[initialInvoice._id, initialInvoice]]);
  const soapCalls = [];
  let lockedBy = null;
  return {
    invoices,
    soapCalls,
    findOutlet: async (id) =>
      id === OUTLET_ID
        ? { _id: id, mode: "stateless", kodeOutlet: "LOC-01" }
        : null,
    findSoapConfig: async () => ({
      defaults: {
        noSeries: "SO",
        sellToCustNo: "CASH",
        sellToCustName: "CASH",
      },
    }),
    findInventoriesBySkus: async () => [],
    findInvoiceById: async (id) => invoices.get(id) || null,
    upsertInvoice: async (payload) => {
      const next = { ...(invoices.get(payload._id) || {}), ...payload };
      invoices.set(payload._id, next);
      return next;
    },
    claimInvoicePosting: async (id) => {
      if (lockedBy || invoices.get(id)?.navInvoicedAt) return false;
      lockedBy = id;
      return true;
    },
    releaseInvoicePosting: async () => {
      lockedBy = null;
    },
    isMidtransPaymentMethod: async (method) =>
      String(method || "").toLowerCase().includes("midtrans"),
    executeNavSoap: async ({ operationKey, payload }) => {
      soapCalls.push({ operationKey, payload });
      await new Promise((r) => setTimeout(r, 10));
      if (operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP) {
        const docNo = payload?.header?.documentNo || "DOC-1";
        return { parsed: { returnValue: `SO/RTL-1;SS/RTL-1` } };
      }
      return { parsed: { returnValue: `SI/RTL-1;${payload.docNo}` } };
    },
  };
};

const paidStatelessInvoice = () => ({
  _id: "LOC-01-ksr-260925120001",
  kodeInvoice: "LOKSR120001",
  outlet: OUTLET_ID,
  done: true,
  paymentMethod: "Midtrans",
  nomorTransaksi: "midtrans-trx-1",
  navDocumentNo: "LOC-01-ksr-260925120001",
  navSalesOrderNo: "SO/RTL-1",
  navShipmentNo: "SS/RTL-1",
  isPrintedCustomerBilling: true,
  currentBill: [{ sku: "SKU1", quantity: 1, harga: 10000 }],
});

test("Midtrans PAID sudah ship → WsPostInvoiceSO sekali, simpan SI", async () => {
  const deps = createDeps(paidStatelessInvoice());
  const service = createStatelessBillService(deps);

  const result = await postNavInvoiceAfterGatewayPaid({
    invoice: paidStatelessInvoice(),
    service,
  });

  assert.equal(result.posted, true);
  assert.equal(result.invoice.navSalesInvoiceNo, "SI/RTL-1");
  assert.equal(deps.soapCalls.length, 1);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
  );
  assert.equal(deps.soapCalls[0].payload.docNo, "SO/RTL-1");
});

test("Notification Midtrans berulang tidak post dobel", async () => {
  const deps = createDeps(paidStatelessInvoice());
  const service = createStatelessBillService(deps);

  await postNavInvoiceAfterGatewayPaid({
    invoice: paidStatelessInvoice(),
    service,
  });
  const second = await postNavInvoiceAfterGatewayPaid({
    invoice: deps.invoices.get("LOC-01-ksr-260925120001"),
    service,
  });

  assert.equal(second.posted, false);
  assert.equal(second.skipped, "already_posted");
  assert.equal(deps.soapCalls.length, 1);
});

test("Webhook + polling mobile bersamaan → hanya satu WsPostInvoiceSO", async () => {
  const deps = createDeps(paidStatelessInvoice());
  const service = createStatelessBillService(deps);

  const [a, b] = await Promise.all([
    postNavInvoiceAfterGatewayPaid({
      invoice: paidStatelessInvoice(),
      service,
    }),
    service
      .bayar({ outletId: OUTLET_ID, invoiceId: "LOC-01-ksr-260925120001" })
      .catch((err) => ({ error: err })),
  ]);

  assert.equal(deps.soapCalls.length, 1);
  assert.ok(a.posted || b.action === "paid");
});

test("Midtrans PAID belum ship → SalesOrderAutoPostingShip lalu WsPostInvoiceSO", async () => {
  const invoice = {
    ...paidStatelessInvoice(),
    navDocumentNo: undefined,
    navShipmentNo: undefined,
  };
  const deps = createDeps(invoice);
  const service = createStatelessBillService(deps);

  const result = await postNavInvoiceAfterGatewayPaid({ invoice, service });

  assert.equal(result.posted, true);
  assert.equal(result.shipped, true);
  assert.equal(deps.soapCalls.length, 2);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
  );
  assert.equal(
    deps.soapCalls[1].operationKey,
    NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
  );
  assert.ok(result.invoice.navDocumentNo);
  assert.equal(result.invoice.navSalesInvoiceNo, "SI/RTL-1");
});

test("Cetak Bill Midtrans menunda ship sampai forceShip", async () => {
  const invoice = {
    ...paidStatelessInvoice(),
    done: false,
    navDocumentNo: undefined,
    navShipmentNo: undefined,
  };
  const deps = createDeps(invoice);
  const service = createStatelessBillService(deps);

  const printed = await service.cetakBill({
    outletId: OUTLET_ID,
    bill: {
      _id: invoice._id,
      kodeInvoice: invoice.kodeInvoice,
      currentBill: invoice.currentBill,
      paymentMethod: "Midtrans",
      total: 10000,
      subTotal: 10000,
    },
  });
  assert.equal(printed.action, "printed_awaiting_gateway");
  assert.equal(deps.soapCalls.length, 0);
  assert.equal(printed.invoice.isPrintedCustomerBilling, true);
  assert.equal(printed.invoice.navDocumentNo, undefined);

  // Setelah Midtrans lunas
  deps.invoices.set(invoice._id, {
    ...deps.invoices.get(invoice._id),
    done: true,
  });
  const afterPay = await postNavInvoiceAfterGatewayPaid({
    invoice: deps.invoices.get(invoice._id),
    service,
  });
  assert.equal(afterPay.posted, true);
  assert.equal(
    deps.soapCalls[0].operationKey,
    NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
  );
});

test("NAV gagal → error dikembalikan (webhook balas 500 → Midtrans retry)", async () => {
  const deps = createDeps(paidStatelessInvoice());
  deps.executeNavSoap = async () => {
    throw new Error("NAV timeout");
  };
  const service = createStatelessBillService(deps);

  const result = await postNavInvoiceAfterGatewayPaid({
    invoice: paidStatelessInvoice(),
    service,
  });
  assert.equal(result.posted, false);
  assert.match(result.error.message, /NAV timeout/);
  assert.equal(
    deps.invoices.get("LOC-01-ksr-260925120001").navInvoicedAt,
    undefined,
  );
});
