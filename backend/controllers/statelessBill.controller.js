import Outlet from "../models/Outlet.model.js";
import Soap from "../models/Soap.model.js";
import Invoice from "../models/invoice.model.js";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import { executeNavSoap } from "../utils/soapNav/client.js";
import { createStatelessBillService } from "../utils/statelessBill/statelessTransaction.js";

const upsertInvoiceDoc = async (payload) => {
  const { _id, ...rest } = payload;
  if (!_id) {
    throw new Error("_id invoice wajib");
  }

  const attemptUpsert = async (kodeInvoice) =>
    Invoice.findByIdAndUpdate(
      _id,
      { $set: { ...rest, _id, ...(kodeInvoice ? { kodeInvoice } : {}) } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

  try {
    return await attemptUpsert(rest.kodeInvoice);
  } catch (error) {
    // E11000: kodeInvoice bentrok dengan dokumen lain (format lama outlet+kasir+YYMM)
    if (error?.code !== 11000 || !rest.kodeInvoice) {
      throw error;
    }

    const conflict = await Invoice.findOne({
      kodeInvoice: rest.kodeInvoice,
    })
      .select("_id")
      .lean();

    // Bill ini sudah ada dengan _id sama — retry update tanpa upsert race
    if (conflict && String(conflict._id) === String(_id)) {
      return Invoice.findByIdAndUpdate(
        _id,
        { $set: { ...rest, _id } },
        { new: true },
      ).lean();
    }

    // Pakai kode unik baru agar cetak/ship tetap jalan
    const uniqueKode = `${rest.kodeInvoice}${String(Date.now()).slice(-6)}`;
    console.warn(
      `kodeInvoice duplikat (${rest.kodeInvoice}) → ${uniqueKode}`,
    );
    return attemptUpsert(uniqueKode);
  }
};

export const buildDefaultStatelessBillService = () =>
  createStatelessBillService({
    findOutlet: (outletId) =>
      Outlet.findById(outletId)
        .select(
          "mode kodeOutlet namaOutlet defaultNoSeries defaultSellToCustNo defaultSellToCustName",
        )
        .lean(),
    findSoapConfig: (outletId) => Soap.findOne({ outlet: outletId }).lean(),
    findInventoriesBySkus: (outletId, skus) =>
      InventoryRefrensi.find({
        outlet: outletId,
        sku: { $in: skus },
      })
        .select("sku RpHargaLowest RpHargaDasar")
        .lean(),
    findInvoiceById: (id) => Invoice.findById(id).lean(),
    upsertInvoice: upsertInvoiceDoc,
    executeNavSoap,
  });

const getService = (req) =>
  req.statelessBillService || buildDefaultStatelessBillService();

const resolveOutletId = (req) =>
  req.body?.outletId || req.userDB?.currentOutlet || req.user?.currentOutlet;

export const cetakBillStateless = async (req, res) => {
  try {
    console.log("req.body:", req.body);
    const outletId = resolveOutletId(req);
    const bill = req.body?.bill || req.body;
    const result = await getService(req).cetakBill({ outletId, bill });
    console.log("result:", result);
    return res.status(200).json({ message: result.message, ...result });
  } catch (error) {
    console.error("cetakBillStateless gagal:", error?.message || error);
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "kodeInvoice bentrok dengan bill lain. Clear sale lalu buat bill baru, lalu cetak lagi.",
      });
    }
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

export const approveDiscountStateless = async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const { invoiceId, approved = true } = req.body || {};
    const result = await getService(req).approveDiscount({
      outletId,
      invoiceId,
      approved,
    });
    return res.status(200).json({ message: "sukses", ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

export const editLinesStateless = async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const { invoiceId, currentBill, diskon, removeSkus } = req.body || {};
    const result = await getService(req).editOrRemoveLines({
      outletId,
      invoiceId,
      currentBill,
      diskon,
      removeSkus,
    });
    return res.status(200).json({ message: "sukses", ...result });
  } catch (error) {
    console.error("stateless undo gagal:", error?.message || error);
    return res.status(error.statusCode || 500).json({
      message: error.message,
      partialUndone: error.partialUndone || [],
    });
  }
};

export const bayarStateless = async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const {
      invoiceId,
      paymentMethod,
      nomorTransaksi,
      tanggalBayar,
    } = req.body || {};
    const result = await getService(req).bayar({
      outletId,
      invoiceId,
      paymentMethod,
      nomorTransaksi,
      tanggalBayar,
    });
    return res.status(200).json({ message: result.message || "sukses", ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

export const voidStateless = async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const { invoiceId } = req.body || {};
    const result = await getService(req).voidBill({
      outletId,
      invoiceId,
      confirmVoidById: req.user?.userId || req.userDB?._id,
    });
    return res.status(200).json({ message: "sukses", ...result });
  } catch (error) {
    console.error("stateless undo gagal:", error?.message || error);
    return res.status(error.statusCode || 500).json({
      message: error.message,
      partialUndone: error.partialUndone || [],
    });
  }
};
