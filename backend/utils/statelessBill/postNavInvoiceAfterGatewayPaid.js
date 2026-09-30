/**
 * Setelah payment gateway (Midtrans) PAID:
 * 1) SalesOrderAutoPostingShip (jika belum di-ship — alur Midtrans: bayar dulu baru ship)
 * 2) WsPostInvoiceSO lewat service.bayar (idempoten via navInvoicedAt + lock)
 *
 * @returns {{ posted: boolean, skipped?: string, invoice?: object, error?: Error, shipped?: boolean }}
 */

const invoiceAsBill = (invoice) => ({
  _id: invoice._id,
  kodeInvoice: invoice.kodeInvoice,
  currentBill: invoice.currentBill || [],
  diskon: invoice.diskon || [],
  promo: invoice.promo || [],
  futureVoucher: invoice.futureVoucher || [],
  implementedVoucher: invoice.implementedVoucher || [],
  subTotal: invoice.subTotal,
  total: invoice.total,
  salesPerson: invoice.salesPerson,
  spg: invoice.spg,
  customer: invoice.customer,
  paymentMethod: invoice.paymentMethod,
  nomorTransaksi: invoice.nomorTransaksi,
  isPrintedCustomerBilling: true,
  isPrintedKwitansi: Boolean(invoice.isPrintedKwitansi),
  done: Boolean(invoice.done),
  createdAt: invoice.createdAt,
  documentNo: invoice.navDocumentNo || invoice._id,
});

export const postNavInvoiceAfterGatewayPaid = async ({ invoice, service }) => {
  if (!invoice) return { posted: false, skipped: "no_invoice" };
  if (!invoice.done) return { posted: false, skipped: "not_paid" };
  if (invoice.isVoid) return { posted: false, skipped: "void" };
  if (invoice.navInvoicedAt || invoice.navSalesInvoiceNo) {
    return { posted: false, skipped: "already_posted", invoice };
  }

  const outletId = invoice.outlet?._id || invoice.outlet;
  let current = invoice;
  let shipped = false;

  try {
    // Midtrans: ship NAV setelah lunas (bukan di Cetak Bill)
    if (!current.navDocumentNo) {
      if (typeof service?.cetakBill !== "function") {
        return { posted: false, skipped: "not_stateless", invoice: current };
      }
      const shipResult = await service.cetakBill({
        outletId,
        bill: invoiceAsBill(current),
        forceShip: true,
      });
      current = shipResult?.invoice || current;
      shipped = shipResult?.action === "shipped" || Boolean(current.navDocumentNo);
      if (!current.navDocumentNo) {
        return {
          posted: false,
          skipped: shipResult?.action || "ship_incomplete",
          invoice: current,
        };
      }
    }

    const result = await service.bayar({
      outletId,
      invoiceId: current._id,
      paymentMethod: current.paymentMethod,
      nomorTransaksi: current.nomorTransaksi,
      tanggalBayar: current.tanggalBayar,
    });
    return {
      posted: result?.action === "paid",
      skipped: result?.action === "paid" ? undefined : result?.action,
      invoice: result?.invoice || current,
      shipped,
    };
  } catch (error) {
    console.error(
      `NAV setelah Midtrans PAID gagal (${invoice._id}):`,
      error?.message || error,
    );
    return { posted: false, error, invoice: current, shipped };
  }
};
