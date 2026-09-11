import {
  billNeedsDiscountApproval,
  DISCOUNT_APPROVAL_STATUS,
} from "./discountGate.js";
import { parseSalesShipmentLines } from "./parseShipmentLines.js";
import { mapInvoiceToSalesOrderPayload } from "../soapNav/buildXml.js";
import { NAV_SOAP_OPERATIONS } from "../soapNav/constants.js";

/**
 * Pure-ish orchestration for outlet.mode === "stateless" bill lifecycle.
 * Dependencies are injectable so E2E tests can mock SOAP + persistence.
 */
export const createStatelessBillService = ({
  findOutlet,
  findSoapConfig,
  findInventoriesBySkus,
  findInvoiceById,
  upsertInvoice,
  executeNavSoap,
}) => {
  const assertStatelessOutlet = async (outletId) => {
    const outlet = await findOutlet(outletId);
    if (!outlet) {
      const err = new Error("Outlet tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (outlet.mode !== "stateless") {
      const err = new Error(
        "Endpoint ini hanya untuk outlet mode=stateless. Gunakan alur offline/syncMobileRoute.",
      );
      err.statusCode = 400;
      throw err;
    }
    return outlet;
  };

  const resolveSoapDefaults = (soapConfig) => ({
    noSeries: soapConfig?.defaults?.noSeries || soapConfig?.noSeries || "",
    sellToCustNo: soapConfig?.defaults?.sellToCustNo || "",
  });

  const buildWebPriceMap = async (outletId, currentBill = []) => {
    const skus = [
      ...new Set(
        (currentBill || []).map((l) => l.sku).filter((s) => Boolean(s)),
      ),
    ];
    if (!skus.length) return {};

    const inventories = await findInventoriesBySkus(outletId, skus);
    const map = {};
    for (const inv of inventories || []) {
      if (inv?.sku != null) {
        map[inv.sku] = Number(inv.RpHargaLowest);
      }
    }
    return map;
  };

  const normalizeBillPayload = (bill, outletId) => {
    const hasCustomerData = Boolean(
      bill?.customer?.name ||
        bill?.customer?.email ||
        bill?.customer?.phone ||
        bill?.customer,
    );

    return {
      _id: bill._id,
      kodeInvoice: bill.kodeInvoice,
      currentBill: bill.currentBill || [],
      diskon: bill.diskon || bill.diskons || [],
      promo: bill.promo || bill.promos || [],
      futureVoucher: bill.futureVoucher || bill.futureVouchers || [],
      implementedVoucher: bill.implementedVoucher || [],
      subTotal: bill.subTotal ?? bill.cebelumDiskon ?? 0,
      total: bill.total ?? bill.setelahDiskon ?? 0,
      salesPerson: bill.salesPerson,
      spg: typeof bill.spg === "object" ? bill.spg?.id || bill.spg?._id : bill.spg,
      customer: hasCustomerData
        ? typeof bill.customer === "string"
          ? bill.customer
          : bill.customer?.email || bill.customer?.name || ""
        : bill.customer || "",
      paymentMethod: bill.paymentMethod,
      nomorTransaksi: bill.nomorTransaksi,
      outlet: outletId,
      isPrintedCustomerBilling: Boolean(bill.isPrintedCustomerBilling),
      isPrintedKwitansi: Boolean(bill.isPrintedKwitansi),
      done: Boolean(bill.done),
      isVoid: Boolean(bill.isVoid),
    };
  };

  /**
   * Cetak bill (customer): pending discount approval OR SalesOrderAutoPostingShip.
   */
  const cetakBill = async ({ outletId, bill }) => {
    const outlet = await assertStatelessOutlet(outletId);
    if (!bill?._id || !bill?.kodeInvoice) {
      const err = new Error("_id dan kodeInvoice wajib");
      err.statusCode = 400;
      throw err;
    }
    if (!bill?.currentBill?.length) {
      const err = new Error("currentBill kosong");
      err.statusCode = 400;
      throw err;
    }

    const existing = await findInvoiceById(bill._id);
    if (existing?.done) {
      const err = new Error("Bill sudah lunas, tidak bisa cetak ulang via ship");
      err.statusCode = 400;
      throw err;
    }
    if (existing?.isVoid) {
      const err = new Error("Bill sudah di-void");
      err.statusCode = 400;
      throw err;
    }

    const webPriceBySku = await buildWebPriceMap(outletId, bill.currentBill);
    const normalized = normalizeBillPayload(bill, outletId);
    const approvalStatus =
      existing?.discountApprovalStatus || DISCOUNT_APPROVAL_STATUS.NONE;

    const needsApproval = billNeedsDiscountApproval(
      { currentBill: normalized.currentBill, diskon: normalized.diskon },
      webPriceBySku,
    );

    if (
      needsApproval &&
      approvalStatus !== DISCOUNT_APPROVAL_STATUS.APPROVED
    ) {
      const saved = await upsertInvoice({
        ...normalized,
        ...(existing || {}),
        ...normalized,
        discountApprovalStatus: DISCOUNT_APPROVAL_STATUS.PENDING,
        warehouseReady: false,
        isPrintedCustomerBilling: false,
        done: false,
      });

      return {
        action: "pending_discount_approval",
        message:
          "Diskon membuat harga retail di bawah harga web. Bill disimpan menunggu konfirmasi approve discount (SOAP tidak dijalankan).",
        invoice: saved,
        soap: null,
      };
    }

    const soapConfig = await findSoapConfig(outletId);
    if (!soapConfig) {
      const err = new Error("Konfigurasi SOAP NAV belum ada untuk outlet ini");
      err.statusCode = 400;
      throw err;
    }

    const defaults = resolveSoapDefaults(soapConfig);
    const payload = mapInvoiceToSalesOrderPayload(
      {
        ...normalized,
        documentNo: existing?.navDocumentNo || bill.documentNo || bill._id,
        customer: { name: bill.customer?.name || bill.customer || "" },
        createdAt: bill.createdAt || existing?.createdAt || new Date(),
      },
      defaults,
      outlet.kodeOutlet,
    );

    const soapResult = await executeNavSoap({
      outletId,
      operationKey: NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
      payload,
    });

    const returnValue = soapResult?.parsed?.returnValue || "";
    const warehouseReady =
      String(returnValue).toLowerCase().includes("ready") ||
      String(returnValue) === "1" ||
      String(returnValue).toLowerCase() === "true" ||
      Boolean(returnValue);

    const saved = await upsertInvoice({
      ...(existing || {}),
      ...normalized,
      discountApprovalStatus: needsApproval
        ? DISCOUNT_APPROVAL_STATUS.APPROVED
        : approvalStatus === DISCOUNT_APPROVAL_STATUS.APPROVED
          ? DISCOUNT_APPROVAL_STATUS.APPROVED
          : DISCOUNT_APPROVAL_STATUS.NONE,
      navDocumentNo: payload.header.documentNo,
      warehouseReady,
      navShipAt: new Date(),
      navShipReturnValue: returnValue || null,
      isPrintedCustomerBilling: true,
      done: false,
    });

    return {
      action: "shipped",
      message: "SalesOrderAutoPostingShip berhasil, bill tersimpan.",
      invoice: saved,
      soap: {
        operationKey: NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
        documentNo: payload.header.documentNo,
        returnValue,
        warehouseReady,
      },
    };
  };

  const approveDiscount = async ({ outletId, invoiceId, approved = true }) => {
    await assertStatelessOutlet(outletId);
    const existing = await findInvoiceById(invoiceId);
    if (!existing) {
      const err = new Error("Invoice tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (existing.outlet && String(existing.outlet) !== String(outletId)) {
      const err = new Error("Invoice bukan milik outlet ini");
      err.statusCode = 403;
      throw err;
    }

    const saved = await upsertInvoice({
      ...existing,
      discountApprovalStatus: approved
        ? DISCOUNT_APPROVAL_STATUS.APPROVED
        : DISCOUNT_APPROVAL_STATUS.REJECTED,
    });

    return { invoice: saved };
  };

  const getShipmentLines = async ({ outletId, documentNo }) => {
    const soapResult = await executeNavSoap({
      outletId,
      operationKey: NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
      payload: { codDocNumber: documentNo },
    });

    const lines = parseSalesShipmentLines(
      soapResult?.parsed?.returnValue || soapResult?.response?.body,
    );

    return { soapResult, lines };
  };

  const undoShipmentLines = async ({ outletId, lines }) => {
    const results = [];
    for (const line of lines || []) {
      if (!line?.documentNo || line.lineNo == null) continue;
      const soapResult = await executeNavSoap({
        outletId,
        operationKey: NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
        payload: {
          docNo: line.documentNo,
          lineNo: line.lineNo,
        },
      });
      results.push({
        documentNo: line.documentNo,
        lineNo: line.lineNo,
        itemNo: line.itemNo,
        returnValue: soapResult?.parsed?.returnValue,
      });
    }
    return results;
  };

  /**
   * Optional: after ship, remove/edit SKU → GetSalesShipmentLines → WsUndoShipment
   */
  const editOrRemoveLines = async ({
    outletId,
    invoiceId,
    currentBill,
    diskon,
    removeSkus = [],
  }) => {
    await assertStatelessOutlet(outletId);
    const existing = await findInvoiceById(invoiceId);
    if (!existing) {
      const err = new Error("Invoice tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (!existing.navDocumentNo) {
      const err = new Error(
        "Invoice belum di-ship ke NAV; edit cukup lokal tanpa undo shipment",
      );
      err.statusCode = 400;
      throw err;
    }
    if (existing.done) {
      const err = new Error("Bill sudah lunas; gunakan void untuk membatalkan");
      err.statusCode = 400;
      throw err;
    }

    const { lines: shipmentLines } = await getShipmentLines({
      outletId,
      documentNo: existing.navDocumentNo,
    });

    const skusToUndo = new Set(
      [
        ...removeSkus,
        ...(currentBill || [])
          .filter((l) => l.priceEdited || l.quantityChanged)
          .map((l) => l.sku),
      ].filter(Boolean),
    );

    // If caller only passed a new bill snapshot, undo SKUs that changed vs existing
    if (!skusToUndo.size && Array.isArray(currentBill)) {
      for (const oldLine of existing.currentBill || []) {
        const next = currentBill.find((l) => l.sku === oldLine.sku);
        if (
          !next ||
          Number(next.quantity) !== Number(oldLine.quantity) ||
          Number(next.RpHargaDasar) !== Number(oldLine.RpHargaDasar)
        ) {
          skusToUndo.add(oldLine.sku);
        }
      }
      for (const next of currentBill) {
        if (!(existing.currentBill || []).some((l) => l.sku === next.sku)) {
          // new sku — no shipment line yet
        }
      }
    }

    const linesToUndo = shipmentLines.filter((line) =>
      skusToUndo.has(line.itemNo),
    );

    // If removeSkus empty and no specific edits detected but caller wants full refresh:
    const undoTargets =
      linesToUndo.length > 0
        ? linesToUndo
        : skusToUndo.size === 0
          ? []
          : shipmentLines.filter((l) => skusToUndo.has(l.itemNo));

    const undoResults = await undoShipmentLines({
      outletId,
      lines: undoTargets,
    });

    const nextBill =
      currentBill != null
        ? currentBill
        : (existing.currentBill || []).filter(
            (l) => !removeSkus.includes(l.sku),
          );

    const saved = await upsertInvoice({
      ...existing,
      currentBill: nextBill,
      diskon: diskon != null ? diskon : existing.diskon,
      warehouseReady: false,
      navShipmentLines: shipmentLines,
      navUndoAt: new Date(),
      isPrintedCustomerBilling: false,
    });

    return {
      action: "undone_lines",
      invoice: saved,
      undone: undoResults,
      shipmentLines,
    };
  };

  /**
   * Bayar berhasil: done=true + WsPostInvoiceSO
   */
  const bayar = async ({
    outletId,
    invoiceId,
    paymentMethod,
    nomorTransaksi,
    tanggalBayar,
  }) => {
    await assertStatelessOutlet(outletId);
    const existing = await findInvoiceById(invoiceId);
    if (!existing) {
      const err = new Error("Invoice tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (existing.isVoid) {
      const err = new Error("Invoice sudah di-void");
      err.statusCode = 400;
      throw err;
    }
    if (
      existing.discountApprovalStatus === DISCOUNT_APPROVAL_STATUS.PENDING
    ) {
      const err = new Error(
        "Bill masih menunggu approve discount; tidak bisa bayar",
      );
      err.statusCode = 400;
      throw err;
    }
    if (!existing.navDocumentNo) {
      const err = new Error(
        "Bill belum di-ship (SalesOrderAutoPostingShip); cetak bill dulu",
      );
      err.statusCode = 400;
      throw err;
    }
    if (existing.done) {
      return {
        action: "already_paid",
        invoice: existing,
        soap: null,
      };
    }

    const soapResult = await executeNavSoap({
      outletId,
      operationKey: NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
      payload: { docNo: existing.navDocumentNo },
    });

    const saved = await upsertInvoice({
      ...existing,
      done: true,
      isPrintedKwitansi: true,
      paymentMethod: paymentMethod || existing.paymentMethod,
      nomorTransaksi: nomorTransaksi || existing.nomorTransaksi,
      tanggalBayar: tanggalBayar ? new Date(tanggalBayar) : new Date(),
      navInvoicedAt: new Date(),
      navInvoiceReturnValue: soapResult?.parsed?.returnValue || null,
    });

    return {
      action: "paid",
      message: "WsPostInvoiceSO berhasil, bill marked done.",
      invoice: saved,
      soap: {
        operationKey: NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
        documentNo: existing.navDocumentNo,
        returnValue: soapResult?.parsed?.returnValue,
      },
    };
  };

  /**
   * Void (e.g. next day): GetSalesShipmentLines → WsUndoShipment for all lines
   */
  const voidBill = async ({ outletId, invoiceId, confirmVoidById }) => {
    await assertStatelessOutlet(outletId);
    const existing = await findInvoiceById(invoiceId);
    if (!existing) {
      const err = new Error("Invoice tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (existing.isVoid) {
      const err = new Error("Invoice sudah di-void");
      err.statusCode = 400;
      throw err;
    }

    let undone = [];
    let shipmentLines = existing.navShipmentLines || [];

    if (existing.navDocumentNo) {
      const fetched = await getShipmentLines({
        outletId,
        documentNo: existing.navDocumentNo,
      });
      shipmentLines = fetched.lines;
      undone = await undoShipmentLines({
        outletId,
        lines: shipmentLines,
      });
    }

    const saved = await upsertInvoice({
      ...existing,
      isVoid: true,
      requestingVoid: false,
      confirmVoidById: confirmVoidById || null,
      tanggalVoid: new Date(),
      navShipmentLines: shipmentLines,
      navVoidAt: new Date(),
      warehouseReady: false,
    });

    return {
      action: "voided",
      invoice: saved,
      undone,
      shipmentLines,
    };
  };

  return {
    cetakBill,
    approveDiscount,
    editOrRemoveLines,
    bayar,
    voidBill,
    getShipmentLines,
  };
};
