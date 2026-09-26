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
  findOrCreateCustomer,
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

  const resolveSoapDefaults = (soapConfig, outlet) => ({
    noSeries:
      soapConfig?.defaults?.noSeries ||
      soapConfig?.noSeries ||
      outlet?.defaultNoSeries ||
      "",
    sellToCustNo:
      soapConfig?.defaults?.sellToCustNo ||
      outlet?.defaultSellToCustNo ||
      "",
    sellToCustName:
      soapConfig?.defaults?.sellToCustName ||
      outlet?.defaultSellToCustName ||
      "",
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

  const normalizeBillPayload = (bill, outletId, customerId = undefined) => {
    const payload = {
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
      paymentMethod: bill.paymentMethod,
      nomorTransaksi: bill.nomorTransaksi,
      outlet: outletId,
      isPrintedCustomerBilling: Boolean(bill.isPrintedCustomerBilling),
      isPrintedKwitansi: Boolean(bill.isPrintedKwitansi),
      done: Boolean(bill.done),
      isVoid: Boolean(bill.isVoid),
    };
    // Hanya set customer bila ObjectId valid — jangan simpan nama string
    if (customerId) {
      payload.customer = customerId;
    }
    return payload;
  };

  const resolveCustomerId = async (bill) => {
    if (typeof findOrCreateCustomer !== "function") return undefined;
    try {
      return (await findOrCreateCustomer(bill?.customer)) || undefined;
    } catch (error) {
      console.error("findOrCreateCustomer gagal:", error?.message || error);
      return undefined;
    }
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

    // Bill sisa outlet lama (setelah switch) tidak boleh di-ship ke NAV outlet aktif.
    // Pakai prefix `_id` + `-` (sama mobile) — split("-")[0] salah kalau kodeOutlet punya `_`.
    const kode = String(outlet.kodeOutlet || "");
    const billId = String(bill._id || "");
    const belongsToOutlet =
      (kode && billId.startsWith(`${kode}-`)) ||
      String(bill.kodeInvoice || "").startsWith(kode);
    if (!belongsToOutlet) {
      const err = new Error(
        `Bill ini milik outlet lain (${billId || bill.kodeInvoice}), sedangkan outlet aktif Anda ${outlet.kodeOutlet}. Buat bill baru / Clear sale dulu.`,
      );
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
    // isPrintedCustomerBilling di-reset false oleh editOrRemoveLines setelah undo
    if (
      (existing?.navShipmentNo || existing?.navShipReturnValue) &&
      existing?.isPrintedCustomerBilling
    ) {
      return {
        action: "already_shipped",
        message:
          "Bill sudah ter-ship ke NAV dan belum di-undo; SalesOrderAutoPostingShip tidak dikirim ulang.",
        invoice: existing,
        soap: null,
      };
    }

    const webPriceBySku = await buildWebPriceMap(outletId, bill.currentBill);
    const customerId = await resolveCustomerId(bill);
    const normalized = normalizeBillPayload(bill, outletId, customerId);
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

    // Cetak ulang setelah sudah pernah ship: kirim hanya SKU yang belum punya line aktif
    // di NAV (item baru / SKU yang sudah di-undo). Kirim ulang semua = stok NAV terpotong dobel.
    const previousShipments = shipmentsOf(existing);
    let linesToShip = normalized.currentBill;
    if (previousShipments.length) {
      const activeLines = activeShipmentLines(
        await getInvoiceShipmentLines({ outletId, invoice: existing }),
      );
      const navQty = sumQtyBySku(activeLines, (l) => l.itemNo, (l) => l.qty);
      const billQty = sumQtyBySku(
        normalized.currentBill,
        (l) => l.sku,
        (l) => l.quantity,
      );
      const outOfSync = Object.keys(navQty).filter(
        (sku) => (billQty[sku] || 0) !== navQty[sku],
      );
      if (outOfSync.length) {
        const err = new Error(
          `Qty di NAV berbeda dengan bill untuk SKU: ${outOfSync.join(", ")}. Undo shipment SKU tersebut dulu sebelum cetak ulang.`,
        );
        err.statusCode = 409;
        throw err;
      }
      linesToShip = normalized.currentBill.filter(
        (l) => !navQty[normSku(l.sku)],
      );
      if (!linesToShip.length) {
        const saved = await upsertInvoice({
          ...existing,
          ...normalized,
          isPrintedCustomerBilling: true,
          done: false,
        });
        return {
          action: "already_shipped",
          message: "Semua item sudah ter-ship di NAV; hanya cetak ulang.",
          invoice: saved,
          soap: null,
        };
      }
    }

    const defaults = resolveSoapDefaults(soapConfig, outlet);
    const customerName =
      bill.customer?.name ||
      (typeof bill.customer === "string" ? bill.customer : "") ||
      defaults.sellToCustName ||
      "";
    const payload = mapInvoiceToSalesOrderPayload(
      {
        ...normalized,
        currentBill: linesToShip,
        documentNo: existing?.navDocumentNo || bill.documentNo || bill._id,
        customer: { name: customerName },
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
    // return_value: "<No. Sales Order>;<No. Sales Shipment>", mis. "SO/RTL-26/09/00020;SS/RTL-26/09/00020"
    const [navSalesOrderNo, navShipmentNo] = String(returnValue)
      .split(";")
      .map((part) => part.trim());
    const warehouseReady =
      String(returnValue).toLowerCase().includes("ready") ||
      String(returnValue) === "1" ||
      String(returnValue).toLowerCase() === "true" ||
      Boolean(returnValue);

    // Marker NAV dulu — wajib tersimpan supaya cetak ulang tidak ship dobel
    const navMarkers = {
      navDocumentNo: payload.header.documentNo,
      navSalesOrderNo: navSalesOrderNo || existing?.navSalesOrderNo || null,
      navShipmentNo: navShipmentNo || existing?.navShipmentNo || null,
      navShipments: [
        ...previousShipments,
        ...(navShipmentNo
          ? [
              {
                salesOrderNo: navSalesOrderNo || null,
                shipmentNo: navShipmentNo,
                returnValue: returnValue || null,
                shippedAt: new Date(),
              },
            ]
          : []),
      ],
      warehouseReady,
      navShipAt: new Date(),
      navShipReturnValue: returnValue || null,
      isPrintedCustomerBilling: true,
      done: false,
    };

    let saved;
    try {
      saved = await upsertInvoice({
        ...(existing || {}),
        ...normalized,
        discountApprovalStatus: needsApproval
          ? DISCOUNT_APPROVAL_STATUS.APPROVED
          : approvalStatus === DISCOUNT_APPROVAL_STATUS.APPROVED
            ? DISCOUNT_APPROVAL_STATUS.APPROVED
            : DISCOUNT_APPROVAL_STATUS.NONE,
        ...navMarkers,
      });
    } catch (saveError) {
      console.error(
        "upsert setelah ship gagal, simpan marker NAV saja:",
        saveError?.message || saveError,
      );
      saved = await upsertInvoice({
        _id: bill._id,
        kodeInvoice: normalized.kodeInvoice || existing?.kodeInvoice,
        ...(existing || {}),
        ...navMarkers,
        ...(customerId ? { customer: customerId } : {}),
      });
    }

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

  const normSku = (s) => String(s ?? "").trim().toUpperCase();
  const toNum = (v) => Number(String(v?.$numberDecimal ?? v ?? ""));
  const sumQtyBySku = (lines, skuOf, qtyOf) => {
    const map = {};
    for (const line of lines || []) {
      const sku = normSku(skuOf(line));
      if (!sku) continue;
      map[sku] = (map[sku] || 0) + (Number(qtyOf(line)) || 0);
    }
    return map;
  };

  // Tiap SalesOrderAutoPostingShip menghasilkan SO & SS baru (cetak ulang setelah
  // tambah item = shipment ke-2, dst). Invoice lama hanya punya navShipmentNo/navShipReturnValue.
  const shipmentsOf = (invoice) => {
    const list = [...(invoice?.navShipments || [])];
    const [legacySo, legacySs] = String(invoice?.navShipReturnValue || "")
      .split(";")
      .map((p) => p.trim());
    const legacyShipmentNo = invoice?.navShipmentNo || legacySs;
    if (legacyShipmentNo && !list.some((s) => s.shipmentNo === legacyShipmentNo)) {
      list.unshift({
        salesOrderNo: invoice?.navSalesOrderNo || legacySo || null,
        shipmentNo: legacyShipmentNo,
        returnValue: invoice?.navShipReturnValue || null,
        shippedAt: invoice?.navShipAt || null,
      });
    }
    return list.filter((s) => s?.shipmentNo);
  };

  const getShipmentLines = async ({ outletId, documentNo }) => {
    const soapResult = await executeNavSoap({
      outletId,
      operationKey: NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
      payload: { codDocNumber: documentNo },
    });

    // Baris ada di <xML_SSL> body response; return_value hanya fallback
    let lines = parseSalesShipmentLines(soapResult?.response?.body);
    if (!lines.length && soapResult?.parsed?.returnValue) {
      lines = parseSalesShipmentLines(soapResult.parsed.returnValue);
    }

    return { soapResult, lines };
  };

  // GetSalesShipmentLines butuh No. Sales Shipment dari NAV (SS/...), bukan DocumentNo yang kita kirim
  const getInvoiceShipmentLines = async ({ outletId, invoice }) => {
    const shipments = shipmentsOf(invoice);
    if (!shipments.length) {
      const err = new Error(
        "No. Sales Shipment NAV tidak ada di invoice (return_value SalesOrderAutoPostingShip kosong). Tidak bisa undo shipment.",
      );
      err.statusCode = 409;
      throw err;
    }
    const lines = [];
    for (const shipment of shipments) {
      const fetched = await getShipmentLines({
        outletId,
        documentNo: shipment.shipmentNo,
      });
      lines.push(...fetched.lines);
    }
    return lines;
  };

  const lineKey = (line) => `${line?.documentNo}:${line?.lineNo}`;

  // Setelah WsUndoShipment, NAV tidak menghapus line asli tapi menambah line koreksi
  // (Qty negatif, LineNo baru) di shipment yang sama. Line asli yang sudah punya
  // pasangan koreksi dan line koreksi itu sendiri tidak bisa di-undo lagi.
  const activeShipmentLines = (lines = []) => {
    const sorted = [...lines].sort((a, b) => a.lineNo - b.lineNo);
    const cancelled = new Set();
    for (const neg of sorted) {
      if (!(neg.qty < 0)) continue;
      const original = sorted
        .filter(
          (pos) =>
            pos.lineNo < neg.lineNo &&
            pos.qty === -neg.qty &&
            pos.itemNo === neg.itemNo &&
            pos.documentNo === neg.documentNo &&
            !cancelled.has(lineKey(pos)),
        )
        .pop();
      if (original) cancelled.add(lineKey(original));
    }
    return sorted.filter(
      (line) => line.qty > 0 && !cancelled.has(lineKey(line)),
    );
  };

  const undoShipmentLines = async ({ outletId, lines, alreadyUndone = [] }) => {
    const skipKeys = new Set((alreadyUndone || []).map(lineKey));
    const results = [];
    for (const line of lines || []) {
      if (!line?.documentNo || line.lineNo == null) continue;
      if (skipKeys.has(lineKey(line))) continue;
      const fail = (reason) => {
        const err = new Error(
          `WsUndoShipment gagal untuk ${line.itemNo} (line ${line.lineNo}): ${reason}`,
        );
        err.statusCode = 502;
        err.undone = results;
        return err;
      };

      let soapResult;
      try {
        soapResult = await executeNavSoap({
          outletId,
          operationKey: NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
          payload: {
            docNo: line.documentNo,
            lineNo: line.lineNo,
          },
        });
      } catch (error) {
        throw fail(error.message);
      }

      // Sukses: return_value "<DocNo>;<LineNo>;<ItemNo>;<Qty>", mis. "SS/RTL-26/09/00020;20000;BL151GF;1"
      const returnValue = String(soapResult?.parsed?.returnValue || "").trim();
      const [retDocNo, retLineNo] = returnValue.split(";").map((p) => p.trim());
      if (
        retDocNo !== String(line.documentNo).trim() ||
        Number(retLineNo) !== Number(line.lineNo)
      ) {
        throw fail(`return_value tidak sesuai: "${returnValue || "(kosong)"}"`);
      }

      results.push({
        documentNo: line.documentNo,
        lineNo: line.lineNo,
        itemNo: line.itemNo,
        returnValue,
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

    const shipmentLines = await getInvoiceShipmentLines({
      outletId,
      invoice: existing,
    });
    const activeLines = activeShipmentLines(shipmentLines);

    const nextBill =
      currentBill != null
        ? currentBill
        : (existing.currentBill || []).filter(
            (l) => !removeSkus.includes(l.sku),
          );

    // Undo hanya SKU yang masih aktif di NAV lalu dihapus / qty berubah / harga berubah.
    // SKU baru (belum ada line di NAV) tidak perlu undo — cukup ikut cetak ulang.
    const navQty = sumQtyBySku(activeLines, (l) => l.itemNo, (l) => l.qty);
    const billQty = sumQtyBySku(nextBill, (l) => l.sku, (l) => l.quantity);
    const removeSet = new Set(removeSkus.map(normSku));
    const priceOf = (bill, sku) =>
      toNum((bill || []).find((l) => normSku(l.sku) === sku)?.RpHargaDasar);
    const priceChanged = (sku) => {
      const before = priceOf(existing.currentBill, sku);
      const after = priceOf(nextBill, sku);
      return Number.isFinite(before) && Number.isFinite(after) && before !== after;
    };
    const skusToUndo = new Set(
      Object.keys(navQty).filter(
        (sku) =>
          removeSet.has(sku) ||
          (billQty[sku] || 0) !== navQty[sku] ||
          priceChanged(sku),
      ),
    );

    const undoTargets = activeLines.filter((line) =>
      skusToUndo.has(normSku(line.itemNo)),
    );

    let undoResults;
    try {
      undoResults = await undoShipmentLines({
        outletId,
        lines: undoTargets,
        alreadyUndone: existing.navUndoneLines,
      });
    } catch (error) {
      // Line yang sempat ter-undo sebelum gagal tetap dicatat supaya tidak di-undo dua kali
      if (error.undone?.length) {
        await upsertInvoice({
          ...existing,
          navUndoneLines: [...(existing.navUndoneLines || []), ...error.undone],
          navUndoAt: new Date(),
          warehouseReady: false,
          isPrintedCustomerBilling: false,
        });
      }
      error.partialUndone = error.undone || [];
      throw error;
    }

    const saved = await upsertInvoice({
      ...existing,
      currentBill: nextBill,
      diskon: diskon != null ? diskon : existing.diskon,
      warehouseReady: false,
      navShipmentLines: shipmentLines,
      navUndoneLines: [...(existing.navUndoneLines || []), ...undoResults],
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

    const returnValue = soapResult?.parsed?.returnValue || null;
    const navSalesInvoiceNo = returnValue
      ? String(returnValue).split(";")[0].trim() || null
      : null;

    const saved = await upsertInvoice({
      ...existing,
      done: true,
      isPrintedKwitansi: true,
      paymentMethod: paymentMethod || existing.paymentMethod,
      nomorTransaksi: nomorTransaksi || existing.nomorTransaksi,
      tanggalBayar: tanggalBayar ? new Date(tanggalBayar) : new Date(),
      navInvoicedAt: new Date(),
      navInvoiceReturnValue: returnValue,
      navSalesInvoiceNo: navSalesInvoiceNo || existing.navSalesInvoiceNo || null,
    });

    return {
      action: "paid",
      message: "WsPostInvoiceSO berhasil, bill marked done.",
      invoice: saved,
      soap: {
        operationKey: NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
        documentNo: existing.navDocumentNo,
        returnValue,
        salesInvoiceNo: navSalesInvoiceNo,
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
      shipmentLines = await getInvoiceShipmentLines({
        outletId,
        invoice: existing,
      });
      try {
        undone = await undoShipmentLines({
          outletId,
          lines: activeShipmentLines(shipmentLines),
          alreadyUndone: existing.navUndoneLines,
        });
      } catch (error) {
        if (error.undone?.length) {
          await upsertInvoice({
            ...existing,
            navShipmentLines: shipmentLines,
            navUndoneLines: [
              ...(existing.navUndoneLines || []),
              ...error.undone,
            ],
            navUndoAt: new Date(),
            warehouseReady: false,
          });
        }
        error.partialUndone = error.undone || [];
        throw error;
      }
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
