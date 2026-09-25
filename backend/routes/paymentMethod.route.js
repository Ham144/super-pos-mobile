import { Router } from "express";
import PaymentMethod from "../models/PaymentMethod.model.js";
import Invoice from "../models/invoice.model.js";
import Outlet from "../models/Outlet.model.js";
import {
  createPaymentTransaction,
  getMidtransTransactionStatus,
  isMidtransPaymentSuccessful,
  isMidtransProduction,
  verifyMidtransNotificationSignature,
} from "../utils/midtrans.js";
import { sendWhatsappByFonnte } from "../utils/whatsappSender.js";
import Customer from "../models/Customer.model.js";

const safeMidtransEnvLabel = () => {
  try {
    return isMidtransProduction() ? "production" : "sandbox";
  } catch {
    return "server key kosong";
  }
};

export const router = Router();

export const midtransWebhookRouter = Router();

const MIDTRANS_PENDING = "pending";
const MIDTRANS_CREATING = "creating";
const MIDTRANS_PAID = "paid";
const MIDTRANS_SYSTEM_KEY = "midtrans_default";
const MIDTRANS_SYSTEM_METHOD = "Midtrans";

const normalizeIdList = (value) =>
  [...new Set((Array.isArray(value) ? value : []).map((item) => String(item)).filter(Boolean))];

const normalizePaymentMethodPayload = (body) => {
  const discount =
    body.discount === "" || body.discount === undefined || body.discount === null
      ? undefined
      : Number(body.discount);
  const additionalFee =
    body.additional_fee === "" || body.additional_fee === undefined || body.additional_fee === null
      ? undefined
      : Number(body.additional_fee);

  if (discount !== undefined && Number.isNaN(discount)) {
    throw new Error("Diskon harus berupa angka");
  }

  if (additionalFee !== undefined && Number.isNaN(additionalFee)) {
    throw new Error("Biaya tambahan harus berupa angka");
  }

  return {
    method: String(body.method || "").trim(),
    discount,
    additional_fee: additionalFee,
    gatewayProvider: body.gatewayProvider === "midtrans" ? "midtrans" : null,
    status:
      typeof body.status === "boolean"
        ? body.status
        : String(body.status).toLowerCase() !== "false",
  };
};

const isSystemMidtransMethod = (paymentMethod) =>
  Boolean(
    paymentMethod &&
      (paymentMethod.isSystem ||
        paymentMethod.systemKey === MIDTRANS_SYSTEM_KEY ||
        paymentMethod.gatewayProvider === "midtrans"),
  );

const ensureSystemMidtransPaymentMethod = async () => {
  const existingMidtrans = await PaymentMethod.findOne({
    $or: [{ systemKey: MIDTRANS_SYSTEM_KEY }, { gatewayProvider: "midtrans" }],
  });

  const midtrans = existingMidtrans
    ? await PaymentMethod.findByIdAndUpdate(
        existingMidtrans._id,
        {
          $set: {
            method: MIDTRANS_SYSTEM_METHOD,
            discount: 0,
            additional_fee: 0,
            status: true,
            gatewayProvider: "midtrans",
            isSystem: true,
            systemKey: MIDTRANS_SYSTEM_KEY,
          },
        },
        { new: true, runValidators: true },
      )
    : await PaymentMethod.create({
        method: MIDTRANS_SYSTEM_METHOD,
        discount: 0,
        additional_fee: 0,
        status: true,
        gatewayProvider: "midtrans",
        isSystem: true,
        systemKey: MIDTRANS_SYSTEM_KEY,
      });

  await Outlet.updateMany({}, { $addToSet: { paymentList: midtrans._id } });
  return midtrans;
};

const validateOutletIds = async (outletIds = []) => {
  const normalizedOutletIds = normalizeIdList(outletIds);

  if (!normalizedOutletIds.length) {
    return normalizedOutletIds;
  }

  const existingOutlets = await Outlet.find({
    _id: { $in: normalizedOutletIds },
  }).select("_id");

  if (existingOutlets.length !== normalizedOutletIds.length) {
    const foundIds = new Set(existingOutlets.map((item) => String(item._id)));
    const missingOutletIds = normalizedOutletIds.filter((id) => !foundIds.has(id));
    const error = new Error(`Outlet tidak ditemukan: ${missingOutletIds.join(", ")}`);
    error.status = 404;
    error.missingOutletIds = missingOutletIds;
    throw error;
  }

  return normalizedOutletIds;
};

const syncPaymentMethodOutlets = async (paymentMethodId, outletIds = []) => {
  const normalizedOutletIds = await validateOutletIds(outletIds);

  await Outlet.updateMany({}, { $pull: { paymentList: paymentMethodId } });

  if (normalizedOutletIds.length) {
    await Outlet.updateMany(
      { _id: { $in: normalizedOutletIds } },
      { $addToSet: { paymentList: paymentMethodId } }
    );
  }

  return normalizedOutletIds;
};

const getGatewayStatus = (notification) => {
  if (isMidtransPaymentSuccessful(notification)) return MIDTRANS_PAID;
  if (notification.transaction_status === "pending") return MIDTRANS_PENDING;
  return "failed";
};

const buildOrderId = (invoice, attempt) => {
  const invoiceId = String(invoice._id).replace(/[^a-zA-Z0-9]/g, "").slice(-24);
  return `POS-${invoiceId}-${attempt}-${Date.now().toString(36)}`;
};

/** Samakan dengan mobile billBelongsToOutlet — jangan andalkan findOne(kasirList). */
const billBelongsToOutlet = (billOrInvoice, outlet) => {
  if (!billOrInvoice || !outlet?.kodeOutlet) return false;
  const kode = String(outlet.kodeOutlet);
  const id = String(billOrInvoice._id || "");
  const kodeInvoice = String(billOrInvoice.kodeInvoice || "");

  if (billOrInvoice.outlet && String(billOrInvoice.outlet) === String(outlet._id)) {
    return true;
  }
  // Prefix `_id` + `-` agar kode pendek tidak nabrak (PR vs PRJ_JKT)
  if (id.startsWith(`${kode}-`)) return true;
  if (kodeInvoice.startsWith(kode)) return true;
  return false;
};

const getInvoiceForCurrentOutlet = async (req, { invoiceId, kodeInvoice }) => {
  // Pakai currentOutlet user — findOne({ kasirList }) bisa ambil outlet lain
  // kalau kasir masuk di beberapa outlet (tanpa user ganti outlet di UI).
  const currentOutletId =
    req.body?.outletId ||
    req.userDB?.currentOutlet ||
    req.user?.currentOutlet;

  let outlet = null;
  if (currentOutletId) {
    outlet = await Outlet.findById(currentOutletId).select("_id kodeOutlet mode");
  }
  // Fallback hanya jika currentOutlet kosong (akun lama)
  if (!outlet) {
    outlet = await Outlet.findOne({ kasirList: { $in: [req.userId] } }).select(
      "_id kodeOutlet mode",
    );
  }
  if (!outlet) return { error: "Outlet kasir tidak ditemukan", status: 403 };

  let invoice = null;
  if (invoiceId) {
    invoice = await Invoice.findById(invoiceId);
  }
  // Fallback: mobile _id bisa beda dari row sync lama yang sudah punya kodeInvoice sama
  if (!invoice && kodeInvoice) {
    invoice = await Invoice.findOne({ kodeInvoice });
  }

  if (!invoice) return { error: "Bill tidak terdaftar", status: 404, outlet };
  if (!billBelongsToOutlet(invoice, outlet)) {
    return { error: "Bill bukan milik outlet Anda", status: 403, outlet };
  }

  return { invoice, outlet };
};

/** Upsert invoice dari snapshot bill mobile (offline sync belum jalan / midtrans butuh row di Mongo). */
const upsertInvoiceFromBillSnapshot = async (bill, outlet) => {
  if (!bill?._id || !bill?.kodeInvoice) {
    const error = new Error("Snapshot bill wajib punya _id dan kodeInvoice");
    error.status = 400;
    throw error;
  }

  if (!billBelongsToOutlet(bill, outlet)) {
    const error = new Error("Bill bukan milik outlet Anda");
    error.status = 403;
    throw error;
  }

  const spgId =
    typeof bill.spg === "object" ? bill.spg?._id || bill.spg?.id : bill.spg;
  const customerValue =
    typeof bill.customer === "string"
      ? bill.customer
      : bill.customer?.name || bill.customer?.phone || "";

  const payload = {
    currentBill: Array.isArray(bill.currentBill) ? bill.currentBill : [],
    diskon: bill.diskon || bill.diskons || [],
    promo: bill.promo || bill.promos || [],
    futureVoucher: bill.futureVoucher || bill.futureVouchers || [],
    implementedVoucher: bill.implementedVoucher || [],
    subTotal: Number(bill.subTotal ?? bill.cebelumDiskon ?? 0),
    total: Number(bill.total ?? bill.setelahDiskon ?? 0),
    salesPerson: bill.salesPerson,
    spg: spgId ? String(spgId) : "",
    customer: customerValue,
    paymentMethod: bill.paymentMethod,
    nomorTransaksi: bill.nomorTransaksi,
    outlet: outlet._id,
    isPrintedCustomerBilling: Boolean(bill.isPrintedCustomerBilling),
    isPrintedKwitansi: Boolean(bill.isPrintedKwitansi),
    done: Boolean(bill.done),
    isVoid: Boolean(bill.isVoid),
  };

  // Hindari E11000: kodeInvoice unik bisa sudah ada di _id lain (hasil sync)
  const existing =
    (await Invoice.findById(bill._id)) ||
    (await Invoice.findOne({ kodeInvoice: bill.kodeInvoice }));

  if (existing) {
    return Invoice.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          ...payload,
          // Pertahankan kodeInvoice yang sudah di DB
          kodeInvoice: existing.kodeInvoice || bill.kodeInvoice,
        },
      },
      { new: true },
    );
  }

  return Invoice.create({
    _id: bill._id,
    kodeInvoice: bill.kodeInvoice,
    ...payload,
  });
};

const validateInvoiceForMidtrans = async (invoice) => {
  await ensureSystemMidtransPaymentMethod();

  if (invoice.done) return "Bill telah selesai";
  if (invoice.isVoid || invoice.requestingVoid) {
    return "Bill telah dibatalkan atau sedang dalam proses pembatalan";
  }
  if (!invoice.isPrintedCustomerBilling) {
    return "Bill customer harus dicetak terlebih dahulu sebelum pembayaran gateway";
  }
  if (!invoice.currentBill?.length) return "Bill tidak memiliki barang di dalamnya";
  if (!Number.isInteger(Number(invoice.total)) || Number(invoice.total) <= 0) {
    return "Total bill harus berupa nominal Rupiah bulat dan lebih dari nol";
  }

  const paymentMethod = await PaymentMethod.findOne({
    method: invoice.paymentMethod,
    status: true,
  });
  if (paymentMethod?.gatewayProvider !== "midtrans") {
    return "Metode pembayaran bill ini tidak dikonfigurasi untuk Midtrans";
  }

  return null;
};

const applyMidtransStatus = async (notification) => {
  const orderId = notification.order_id;
  const invoice = await Invoice.findOne({ "paymentGateway.orderId": orderId }).populate(['customer']);
  if (!invoice) return null;

  const expectedAmount = Number(invoice.paymentGateway?.grossAmount);
  if (Number(notification.gross_amount) !== expectedAmount) {
    throw new Error("Nominal notification Midtrans tidak cocok dengan invoice");
  }

  const gatewayStatus = getGatewayStatus(notification);
  if (invoice.paymentGateway?.status === MIDTRANS_PAID && gatewayStatus !== MIDTRANS_PAID) {
    return invoice;
  }

  const gatewayUpdate = {
    "paymentGateway.status": gatewayStatus,
    "paymentGateway.transactionId": notification.transaction_id || "",
    "paymentGateway.paymentType": notification.payment_type || "",
    "paymentGateway.transactionStatus": notification.transaction_status || "",
    "paymentGateway.statusCode": String(notification.status_code || ""),
    "paymentGateway.fraudStatus": notification.fraud_status || "",
    "paymentGateway.transactionTime": notification.transaction_time
      ? new Date(notification.transaction_time)
      : undefined,
    "paymentGateway.settlementTime": notification.settlement_time
      ? new Date(notification.settlement_time)
      : undefined,
    "paymentGateway.notificationAt": new Date(),
  };

  const update = { $set: gatewayUpdate };
  if (gatewayStatus === MIDTRANS_PAID) {
    update.$set.done = true;
    update.$set.tanggalBayar = notification.settlement_time
      ? new Date(notification.settlement_time)
      : new Date();
    update.$set.nomorTransaksi = notification.transaction_id || orderId;
  }

  await Invoice.findOneAndUpdate(
    { _id: invoice._id, "paymentGateway.orderId": orderId },
    update,
    { new: true },
  );
  
  const updated = await Invoice.findOneAndUpdate(
    { _id: invoice._id, "paymentGateway.orderId": orderId },
    update,
    { new: true },
  ).populate("customer");
  
  // Hanya kirim saat baru lunas (hindari spam kalau notification Midtrans berulang)
  if (
    gatewayStatus === MIDTRANS_PAID &&
    invoice.paymentGateway?.status !== MIDTRANS_PAID
  ) {
    try {
      const cust = updated?.customer;
      if (cust?.phone) {
        const message = `Halo *${cust.name}*, pembayaran invoice *${updated.kodeInvoice}* berhasil. Total: Rp ${Number(updated.total).toLocaleString("id-ID")}. Terima kasih.`;
        const wa = await sendWhatsappByFonnte(cust.phone, message);
        if (wa?.status === true || wa?.status === "true") {
          await Customer.findByIdAndUpdate(cust._id, {
            $set: { phoneIsVerified: true },
          });
        }
      }
    } catch (waErr) {
      console.error("WA pembayaran gagal:", waErr.message);
    }
  }
  
  return updated;
};

const sendPaymentStatus = (res, invoice) => {
  const gateway = invoice.paymentGateway || {};
  return res.json({
    data: {
      invoiceId: invoice._id,
      kodeInvoice: invoice.kodeInvoice,
      status: gateway.status || "not_started",
      paid: gateway.status === MIDTRANS_PAID && invoice.done === true,
      transactionId: gateway.transactionId || null,
      paymentType: gateway.paymentType || null,
      orderId: gateway.orderId || null,
    },
  });
};

const createMidtransTransaction = async (req, res) => {
  const { invoiceId, kodeInvoice, bill } = req.body;
  let orderId;
  let externalRequestStarted = false;

  try {
    if (!invoiceId && !kodeInvoice) {
      return res.status(400).json({ message: "invoiceId atau kodeInvoice wajib diisi" });
    }

    let result = await getInvoiceForCurrentOutlet(req, {
      invoiceId,
      kodeInvoice: bill?.kodeInvoice || kodeInvoice,
    });

    // Offline bill hidup di AsyncStorage dulu — kalau belum ada di Mongo, upsert dari snapshot mobile
    if (result.error === "Bill tidak terdaftar" && bill && result.outlet) {
      const upserted = await upsertInvoiceFromBillSnapshot(bill, result.outlet);
      result = { invoice: upserted, outlet: result.outlet };
    }

    if (result.error) return res.status(result.status).json({ message: result.error });

    const { invoice } = result;
    const validationError = await validateInvoiceForMidtrans(invoice);
    if (validationError) return res.status(400).json({ message: validationError });

    const gateway = invoice.paymentGateway || {};
    if (gateway.status === MIDTRANS_PAID) {
      return res.status(409).json({ message: "Bill telah dibayar melalui Midtrans" });
    }
    if (gateway.status === MIDTRANS_PENDING) {
      if (gateway.snapToken && gateway.redirectUrl) {
        return res.json({
          message: "Menggunakan transaksi Midtrans yang masih menunggu pembayaran",
          data: { token: gateway.snapToken, redirectUrl: gateway.redirectUrl, orderId: gateway.orderId },
        });
      }
      return res.status(409).json({
        message: "Transaksi Midtrans sebelumnya masih menunggu. Hubungi administrator sebelum membuat transaksi baru.",
      });
    }
    if (gateway.status === MIDTRANS_CREATING) {
      return res.status(409).json({ message: "Pembuatan transaksi pembayaran masih diproses" });
    }

    const attempt = Number(gateway.attempt || 0) + 1;
    orderId = buildOrderId(invoice, attempt);
    const lock = await Invoice.findOneAndUpdate(
      { _id: invoice._id, done: { $ne: true }, "paymentGateway.status": { $ne: MIDTRANS_CREATING } },
      {
        $set: {
          paymentGateway: {
            provider: "midtrans",
            orderId,
            attempt,
            status: MIDTRANS_CREATING,
            grossAmount: Number(invoice.total),
            creatingAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!lock) return res.status(409).json({ message: "Bill tidak dapat diproses untuk pembayaran" });

    externalRequestStarted = true;
    const customerLabel =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.name || "";
    const transaction = await createPaymentTransaction({
      orderId,
      grossAmount: Number(invoice.total),
      customerDetails: customerLabel
        ? { first_name: String(customerLabel).slice(0, 50) }
        : undefined,
    });

    await Invoice.findOneAndUpdate(
      { _id: invoice._id, "paymentGateway.orderId": orderId },
      {
        $set: {
          "paymentGateway.status": MIDTRANS_PENDING,
          "paymentGateway.snapToken": transaction.token,
          "paymentGateway.redirectUrl": transaction.redirect_url,
        },
      },
    );

    return res.json({
      message: "Berhasil generate token pembayaran",
      data: { token: transaction.token, redirectUrl: transaction.redirect_url, orderId },
    });
  } catch (error) {
    console.error(
      `Gagal membuat transaksi Midtrans (env: ${safeMidtransEnvLabel()}, http: ${error?.httpStatusCode ?? "-"}):`,
      error,
    );
    // Once a request reached Midtrans, an uncertain network/storage failure must
    // remain locked. Retrying with a new order could charge the customer twice.
    // A 4xx from Midtrans is a definite rejection (no transaction created), so it's safe to unlock.
    const httpStatus = Number(error?.httpStatusCode);
    const rejectedByMidtrans = httpStatus >= 400 && httpStatus < 500;
    if ((!externalRequestStarted || rejectedByMidtrans) && (invoiceId || kodeInvoice)) {
      await Invoice.findOneAndUpdate(
        invoiceId ? { _id: invoiceId, "paymentGateway.status": MIDTRANS_CREATING } : { kodeInvoice, "paymentGateway.status": MIDTRANS_CREATING },
        { $set: { "paymentGateway.status": "failed" } },
      );
    }
    return res.status(error.status || 500).json({
      message: error?.message || "Gagal generate token payment gateway",
    });
  }
};

router.post("/midtrans/transaction", createMidtransTransaction);
// Compatibility path for the endpoint created previously.
router.post("/request-token", createMidtransTransaction);

router.get("/midtrans/status/:invoiceId", async (req, res) => {
  try {
    const result = await getInvoiceForCurrentOutlet(req, {
      invoiceId: req.params.invoiceId,
    });
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    let { invoice } = result;
    const gateway = invoice.paymentGateway || {};

    if (
      gateway.provider === "midtrans" &&
      gateway.orderId &&
      gateway.status === MIDTRANS_PENDING
    ) {
      try {
        const status = await getMidtransTransactionStatus(gateway.orderId);
        invoice = (await applyMidtransStatus(status)) || invoice;
      } catch (midtransError) {
        // Snap token sudah dibuat, tapi Core API /v2/{order_id}/status sering 404
        // sampai customer memilih metode / transaksi benar-benar terbentuk.
        // Anggap masih pending — jangan gagalkan polling mobile.
        const midtrans404 =
          midtransError?.httpStatusCode == 404 ||
          midtransError?.ApiResponse?.status_code == "404" ||
          /Transaction doesn't exist/i.test(
            midtransError?.ApiResponse?.status_message ||
              midtransError?.message ||
              "",
          );

        if (!midtrans404) {
          throw midtransError;
        }
      }
    }

    return sendPaymentStatus(res, invoice);
  } catch (error) {
    console.error("Gagal memeriksa status Midtrans:", error);
    return res
      .status(502)
      .json({ message: "Gagal memeriksa status pembayaran Midtrans" });
  }
});

midtransWebhookRouter.post("/notification", async (req, res) => {
  try {
    if (!verifyMidtransNotificationSignature(req.body)) {
      return res.status(403).json({ message: "Signature notification Midtrans tidak valid" });
    }
    const invoice = await applyMidtransStatus(req.body);
    if (!invoice) return res.status(404).json({ message: "Order Midtrans tidak ditemukan" });
    return res.status(200).json({ message: "Notification diterima" });
  } catch (error) {
    console.error("Gagal memproses notification Midtrans:", error);
    return res.status(500).json({ message: "Gagal memproses notification Midtrans" });
  }
});

// old payment offline fallback

router.get("/getAllPaymentMethod", async (req, res) => {
  try {
    await ensureSystemMidtransPaymentMethod();
    const { outletId } = req.query;

    if (outletId && outletId !== "all") {
      const outlet = await Outlet.findById(outletId).select("paymentList");
      if (!outlet) {
        return res.status(404).json({ message: "Outlet tidak ditemukan" });
      }

      const paymentMethodIds = normalizeIdList(outlet.paymentList);
      const paymentMethods = await PaymentMethod.find({
        _id: { $in: paymentMethodIds },
      });
      return res.status(200).json(paymentMethods);
    }

    const paymentMethods = await PaymentMethod.find();
    res.status(200).json(paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post("/createPaymentMethod", async (req, res) => {
  let createdPaymentMethod = null;
  try {
    await ensureSystemMidtransPaymentMethod();
    const payload = normalizePaymentMethodPayload(req.body);
    if (!payload.method) {
      return res.status(400).json({ message: "Nama metode pembayaran wajib diisi" });
    }

    if (payload.gatewayProvider === "midtrans") {
      return res.status(400).json({
        message:
          "Midtrans adalah metode sistem dan tidak dibuat manual dari halaman ini",
      });
    }

    const outletIds = await validateOutletIds(req.body?.outletIds);
    createdPaymentMethod = await PaymentMethod.create({
      ...payload,
      isSystem: false,
      systemKey: null,
    });
    await syncPaymentMethodOutlets(createdPaymentMethod._id, outletIds);
    res.status(201).json(createdPaymentMethod);
  } catch (error) {
    if (createdPaymentMethod?._id) {
      await PaymentMethod.findByIdAndDelete(createdPaymentMethod._id);
    }
    const status = error?.status || 500;
    res.status(status).json({ message: error.message });
  }
});

router.put("/updatePaymentMethod/:id", async (req, res) => {
  try {
    await ensureSystemMidtransPaymentMethod();
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(404).json({ message: "Metode pembayaran tidak ditemukan" });
    }

    if (isSystemMidtransMethod(paymentMethod)) {
      return res.status(400).json({
        message:
          "Metode pembayaran sistem Midtrans tidak bisa diubah dari halaman ini",
      });
    }

    const payload = normalizePaymentMethodPayload(req.body);
    if (!payload.method) {
      return res.status(400).json({ message: "Nama metode pembayaran wajib diisi" });
    }

    if (payload.gatewayProvider === "midtrans") {
      return res.status(400).json({
        message:
          "Midtrans adalah metode sistem dan tidak bisa dijadikan metode manual",
      });
    }

    const outletIds = await validateOutletIds(req.body?.outletIds);
    const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(
      id,
      {
        $set: {
          ...payload,
          isSystem: false,
          systemKey: null,
        },
      },
      { new: true }
    );

    await syncPaymentMethodOutlets(updatedPaymentMethod._id, outletIds);

    res.status(200).json(updatedPaymentMethod);
  } catch (error) {
    const status = error?.status || 500;
    res.status(status).json({ message: error.message });
  }
});

// Route untuk menghapus metode pembayaran
router.delete("/deletePaymentMethod/:id", async (req, res) => {
  try {
    await ensureSystemMidtransPaymentMethod();
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res
        .status(404)
        .json({ message: "Metode pembayaran tidak ditemukan" });
    }

    if (isSystemMidtransMethod(paymentMethod)) {
      return res.status(400).json({
        message: "Metode pembayaran sistem Midtrans tidak bisa dihapus",
      });
    }

    const deletedPaymentMethod = await PaymentMethod.findByIdAndDelete(id);

    if (!deletedPaymentMethod) {
      return res
        .status(404)
        .json({ message: "Metode pembayaran tidak ditemukan" });
    }

    await Outlet.updateMany({}, { $pull: { paymentList: id } });

    res.status(200).json({ message: "Metode pembayaran berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route untuk mengaktifkan/menonaktifkan metode pembayaran
router.patch("/togglePaymentMethodStatus/:id", async (req, res) => {
  try {
    await ensureSystemMidtransPaymentMethod();
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res
        .status(404)
        .json({ message: "Metode pembayaran tidak ditemukan" });
    }

    if (isSystemMidtransMethod(paymentMethod)) {
      return res.status(400).json({
        message:
          "Metode pembayaran sistem Midtrans tidak bisa dinonaktifkan",
      });
    }

    // Toggle status (true menjadi false atau sebaliknya)
    paymentMethod.status = !paymentMethod.status;
    await paymentMethod.save();

    const statusMessage = paymentMethod.status ? "diaktifkan" : "dinonaktifkan";
    res.status(200).json({
      message: `Metode pembayaran berhasil ${statusMessage}`,
      paymentMethod,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//endpoint untuk get invoices by payment method saat diklik di page sales report
router.get("/getInvoicesByPaymentMethod/:id", async (req, res) => {
  try {
    const { id } = req.params; // payment method id
    const { startDate, endDate, transactionStatus, outlet } = req.query;

    console.log(id, startDate, endDate, transactionStatus, outlet);

    // Buat filter untuk query
    const filter = {
      paymentMethod: id, // Filter berdasarkan payment method dari params
    };

    // Filter outlet berdasarkan kode invoice
    if (
      outlet &&
      outlet !== "all" &&
      outlet !== "undefined" &&
      outlet !== "null"
    ) {
      filter.kodeInvoice = new RegExp(`^${outlet}`, "i");
    }

    // Filter tanggal
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDateObj;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }

    // Filter berdasarkan transactionStatus
    if (transactionStatus && transactionStatus !== "all") {
      if (transactionStatus === "success") {
        filter.done = true;
        filter.isVoid = { $ne: true };
      } else if (transactionStatus === "void") {
        filter.isVoid = true;
      } else if (transactionStatus === "pending") {
        filter.done = false;
        filter.isVoid = { $ne: true };
      }
    }

    // Logging filter untuk debugging
    console.log(
      "Filter invoices by payment method:",
      JSON.stringify(filter, null, 2)
    );

    // Find invoices with the filter
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .populate("spg", "name"); // Populate spg info jika diperlukan

    // Count total amount
    const totalAmount = invoices.reduce(
      (total, invoice) => total + (invoice.total || 0),
      0
    );

    // Return response
    res.status(200).json({
      success: true,
      count: invoices.length,
      totalAmount,
      data: invoices,
    });
  } catch (error) {
    console.error("Error getting invoices by payment method:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan invoice berdasarkan metode pembayaran",
      error: error.message,
    });
  }
});


export default router;
