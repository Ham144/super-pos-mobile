import { Router } from "express";
import Invoice from "../models/invoice.model.js";
import Spg from "../models/SpgRefrensi.model.js";
import User from "../models/User.model.js";
import Outlet from "../models/Outlet.model.js";
import Inventory from "../models/InventoryRefrensi.model.js";
import Diskon from "../models/DaftarDiskon.model.js";
import Promo from "../models/DaftarPromo.model.js";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import { stackTracingSku } from "../utils/stackTracingSku.js";
import { sendWhatsappByFonnte } from "../utils/whatsappSender.js";

// total qty semua baris di currentBill
const totalQtyBill = (bills = []) =>
  bills.reduce((sum, bill) => sum + Number(bill.quantity || 0), 0);

const totalRpBill = (bills = []) =>
  bills.reduce((sum, bill) => sum + Number(bill.totalRp || 0), 0);

// selaras sync mobile: outlet += bill.total || bill.subTotal
const invoicePendapatan = (invoice) =>
  Number(invoice?.total) ||
  Number(invoice?.subTotal) ||
  totalRpBill(invoice?.currentBill);

// kasir/spg: mobile pakai subTotal item, bukan total final setelah potongan
const invoiceSubtotalPenjualan = (invoice) =>
  Number(invoice?.subTotal) || totalRpBill(invoice?.currentBill);

const router = Router();

//untuk mobile perlu kode outlet biar ga berat ambil semua
router.get("/getAllInvoice", async (req, res) => {
  try {
    const userId = req.user.userId;
    const myOutlet = await Outlet.findOne({
      kasirList: {
        $in: [userId],
      },
    });

    if (!myOutlet) {
      return res.status(400).json({
        message:
          "Gagal mencari akun anda di outlet tertentu saat pengumpulan invoice",
      });
    }

    const data = await Invoice.find({
      kodeInvoice: {
        $regex: `^${myOutlet.kodeOutlet}`,
        $options: "i", // pakai "i" jika mau case-insensitive, atau hapus jika case-sensitive
      },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ message: "berhasil mendapatkan data invoice", data });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mengambil invoice / bill billTersimpan" });
  }
});

//untuk web
router.get("/getInvoiceFilterComplex", async (req, res) => {
  try {
    const {
      kodeOutlet,
      spg,
      kasir,
      startDate,
      endDate,
      isVoid,
      done,
      search,
      limit = 50,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Buat filter dasar
    let filter = {};

    // Filter berdasarkan outlet
    if (kodeOutlet) {
      // Cari invoice yang kodeInvoice-nya dimulai dengan kodeOutlet
      filter.kodeInvoice = { $regex: `^${kodeOutlet}`, $options: "i" };
      console.log("Menggunakan filter kodeOutlet:", kodeOutlet);
    }

    // Filter berdasarkan SPG
    if (spg) {
      filter.spg = spg;
    }

    // Filter berdasarkan Kasir
    if (kasir) {
      filter.salesPerson = kasir;
    }

    // Filter kasus isVoid=true (tab dibatalkan)
    if (isVoid === "true") {
      // Hanya ambil dokumen yang punya isVoid=true
      filter.isVoid = true;
      console.log("Filter: Dibatalkan (isVoid = true)");
    }
    // Filter kasus isVoid=false (tab selesai atau tertunda)
    else if (isVoid === "false") {
      // Ambil dokumen yang punya isVoid=false ATAU yang tidak punya field isVoid sama sekali
      filter.$or = [{ isVoid: false }, { isVoid: { $exists: false } }];

      // Tab Selesai: done=true
      if (done === "true") {
        filter.done = true;
        console.log(
          "Filter: Selesai (isVoid = false atau tidak ada, done = true)",
        );
      }
      // Tab Tertunda: done=false
      else if (done === "false") {
        // Dokumen dengan done=false atau done tidak ada sama sekali
        // Kita perlu menggunakan $and karena sudah ada $or untuk isVoid
        filter.$and = [
          { $or: filter.$or }, // Tetap pertahankan $or untuk isVoid
          { $or: [{ done: false }, { done: { $exists: false } }] },
        ];
        // Hapus $or di level luar karena sudah dimasukkan ke $and
        delete filter.$or;
      }
      // Jika tidak ada done, tetap pakai filter isVoid saja
      else {
        console.log("Filter: isVoid = false atau tidak ada, tanpa nilai done");
      }
    }
    // Jika tidak ada isVoid atau done (tab semua), tidak tambahkan filter apapun

    const startDatePoint = new Date(startDate).setHours(0, 0, 0, 0);
    const endDatePoint = new Date(endDate).setHours(23, 59, 59, 999);

    // Filter berdasarkan tanggal
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: startDatePoint,
        $lte: endDatePoint,
      };
    }

    // Filter berdasarkan pencarian
    if (search) {
      filter.$or = [
        { kodeInvoice: { $regex: search?.trim(), $options: "i" },  },
        { _id: { $regex: search?.trim(), $options: "i" } },
        {
          navSalesOrderNo: {
            $regex: search?.trim(), $options: "i"
          }
        }
      ];
    }

    // Konfigurasi sort
    const sortConfig = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Konfigurasi pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = limit === "All" ? 0 : parseInt(limit);

    // Hitung total data
    const total = await Invoice.countDocuments(filter);

    // Query data
    const data = await Invoice.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limitValue)
      .populate("futureVoucher", "judulVoucher potongan");

    return res.json({
      message: "berhasil mendapatkan data invoice",
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitValue,
        totalPages: limitValue > 0 ? Math.ceil(total / limitValue) : 1,
      },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mengambil invoice / bill billTersimpan" });
  }
});

// Endpoint untuk mendapatkan invoice berdasarkan status
router.get("/getInvoiceByStatus", async (req, res) => {
  try {
    const {
      status,
      limit = 20,
      page = 1,
      startDate,
      endDate,
      search,
      isPrintedKwitansi,
    } = req.query;
    const skip = (page - 1) * limit;

    // Filter dasar
    let filter = {};

    // Filter berdasarkan status
    if (status === "completed") {
      filter.done = { $in: [true, 1, "true"] };
      filter.isVoid = { $nin: [true, 1, "true"] };
    } else if (status === "pending") {
      filter.done = { $nin: [true, 1, "true"] };
      filter.isVoid = { $nin: [true, 1, "true"] };
    } else if (status === "void") {
      filter.isVoid = { $in: [true, 1, "true"] };
    } else if (status === "kwitansi_tertunda") {
      // Status khusus untuk kwitansi tertunda
      filter.done = { $in: [true, 1, "true"] };
      filter.isVoid = { $nin: [true, 1, "true"] };
      filter.isPrintedKwitansi = { $nin: [true, 1, "true"] };
    }

    // Filter tambahan berdasarkan isPrintedKwitansi jika ada
    if (isPrintedKwitansi !== undefined) {
      const isPrintedKwitansiValue =
        isPrintedKwitansi === "true" || isPrintedKwitansi === true;
      filter.isPrintedKwitansi = {
        $in: isPrintedKwitansiValue
          ? [true, 1, "true"]
          : [false, 0, "false", null, undefined],
      };
    }

    // Filter berdasarkan tanggal
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Filter berdasarkan pencarian
    if (search) {
      filter.$or = [
        { kodeInvoice: { $regex: search, $options: "i" } },
        { salesPerson: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const data = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      message: "berhasil mendapatkan data invoice",
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mengambil invoice berdasarkan status" });
  }
});

// Endpoint untuk mendapatkan statistik invoice
router.get("/getInvoiceStats", async (req, res) => {
  try {
    console.log("masuk sini");
    const { startDate, endDate } = req.query;
    console.log(req.query);
    // Gunakan filter yang lebih sederhana yang sudah terbukti berfungsi dari debugInvoiceData
    let filter = {};

    // Tambahkan filter tanggal jika ada
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Hitung invoice berdasarkan status
    const completedCount = await Invoice.countDocuments({
      ...filter,
      done: { $in: [true, 1, "true"] },
    });

    const pendingCount = await Invoice.countDocuments({
      ...filter,
      done: { $nin: [true, 1, "true"] },
      isVoid: { $nin: [true, 1, "true"] },
    });

    const voidCount = await Invoice.countDocuments({
      ...filter,
      isVoid: { $in: [true, 1, "true"] },
    });

    // Hitung total nilai penjualan yang berhasil
    const completedInvoices = await Invoice.find({
      ...filter,
      done: { $in: [true, 1, "true"] },
    });

    let totalSales = 0;
    for (const invoice of completedInvoices) {
      const invoiceTotal = Number(invoice.total) || 0;
      totalSales += invoiceTotal;
    }

    // Top selling items - jika gagal, gunakan array kosong
    let topSellingItems = [];
    try {
      topSellingItems = await Invoice.aggregate([
        { $match: { ...filter, done: { $in: [true, 1, "true"] } } },
        {
          $unwind: { path: "$currentBill", preserveNullAndEmptyArrays: false },
        },
        {
          $group: {
            _id: "$currentBill.sku",
            description: { $first: "$currentBill.description" },
            totalQuantity: {
              $sum: { $toInt: { $ifNull: ["$currentBill.quantity", 0] } },
            },
            totalSales: {
              $sum: { $toDouble: { $ifNull: ["$currentBill.totalRp", 0] } },
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);
    } catch (err) {
      console.error("Error dalam aggregasi top sales:", err);
    }

    const responseData = {
      message: "berhasil mendapatkan statistik invoice",
      data: {
        counts: {
          completed: completedCount,
          pending: pendingCount,
          void: voidCount,
          total: completedCount + pendingCount + voidCount,
        },
        totalSales,
        topSellingItems,
      },
    };
    return res.json(responseData);
  } catch (error) {
    console.error("Error dalam getInvoiceStats:", error);
    return res.status(400).json({
      message: "gagal mengambil statistik invoice",
      error: error.message,
      stack: error.stack,
    });
  }
});

// cek perubahan setelah void :
// diskon:
// .quantitytersedia 100 (101) ✅
// promo :
// .quantityBerlaku -> belum dicek
// .barang bonus Kembali -> belum dicek
// voucher :
// quantityTersedia -> belum dicek
// terjadi -> belum dicek
// inventory:
// .quantity : 60 (61) ✅
// .terjual : 32 (31)✅
// outlet:
// .pendapatan: 3999880 (3610180) ✅
// spg:
// .totalHargaPenjualan : 2594980 (2205280)  ✅
// .totalQuantityPenjualan :  6 (5)✅
// .skuTerjual : [{else},{sku: egsa, quantity : 1}] => ([{else},{sku: egsa, quantity : 0}])  ✅
// user:
// .totalHargaPenjualan : 100000 (-289700)✅
// .totalQuantityPenjualan : 1(0) ✅
// .skuTerjual ✅
//invoice:
// isVoid : true ✅
//untuk pembatalan invoice yang telah dibayar

router.post("/voidInvoice", async (req, res) => {
  const { invoiceId } = req.body;
  const userId = req.user?.userId;

  // klaim void atomik — cegah double void paralel
  let invoiceDB;
  try {
    invoiceDB = await Invoice.findOneAndUpdate(
      { _id: invoiceId, isVoid: { $ne: true }, done: true },
      {
        $set: {
          isVoid: true,
          confirmVoidById: userId,
          tanggalVoid: new Date(),
        },
      },
      { new: false },
    ).populate(["customer"])

    if(invoiceDB?.customer?.phone){
      const cust =  invoiceDB.customer
      const voidMessage = `
      Halo *${cust.name}*, Kami ingin menginformasikan bahwa permintaan pembatalan untuk invoice Anda telah berhasil diproses dengan rincian sebagai berikut:
      
      *Nomor Invoice:* ${invoiceDB.kodeInvoice}
      *Tanggal Pembatalan:* ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      *Total Tagihan:* Rp ${Number(invoiceDB.total).toLocaleString('id-ID')}
      *Status:* VOID
      
      Jika Anda tidak merasa mengajukan pembatalan ini atau memiliki pertanyaan, silakan hubungi layanan pelanggan kami. Terima kasih.`;
      
      const wa = await sendWhatsappByFonnte(cust.phone, voidMessage);
      if(wa?.status === true || wa?.status === "true"){
        await Customer.findByIdAndUpdate(cust._id, {
          $set: { phoneIsVerified: true },
        });
      }
    }
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal membatalkan invoice", error: error.message });
  }

  if (!invoiceDB) {
    const exists = await Invoice.findById(invoiceId);
    if (!exists) {
      return res.status(404).json({ message: "Invoice Tidak ditemukan" });
    }
    if (exists.isVoid) {
      return res.status(400).json({ message: "Invoice sudah pernah di void" });
    }
    return res
      .status(400)
      .json({ message: "Invoice belum lunas, tidak bisa di void" });
  }

  const pendapatanVoid = invoicePendapatan(invoiceDB);
  const subtotalVoid = invoiceSubtotalPenjualan(invoiceDB);
  const qtyTotal = totalQtyBill(invoiceDB.currentBill);

  try {
    await Promise.all(
      (invoiceDB.currentBill || []).map(async (bill) => {
        const qty = Number(bill.quantity) || 0;
        if (!bill.sku || qty <= 0) return;

        const inventoryDB = await Inventory.findOne({ sku: bill.sku });
        if (!inventoryDB) return;

        const qtyBaru = Number(inventoryDB.quantity) + qty;
        await stackTracingSku(
          inventoryDB._id,
          userId,
          "Void: pengembalian stock karena pembatalan invoice terbayar telah di batalkan",
          "increase",
          inventoryDB.quantity,
          qtyBaru,
          invoiceDB._id,
        );

        inventoryDB.quantity = qtyBaru;
        inventoryDB.terjual = Math.max(0, Number(inventoryDB.terjual) - qty);
        await inventoryDB.save();
      }),
    );

    for (const diskon of invoiceDB.diskon || []) {
      const diskonId = diskon?.diskonInfo?.diskonId;
      if (!diskonId) continue;
      const diskonDB = await Diskon.findById(diskonId);
      if (diskonDB) {
        diskonDB.quantityTersedia += 1;
        await diskonDB.save();
      }
    }

    await Promise.all(
      (invoiceDB.promo || []).map(async (promo) => {
        const promoId = promo?.promoInfo?.promoId;
        if (!promoId) return;

        const promoDB = await Promo.findById(promoId);
        if (promoDB) {
          promoDB.quantityBerlaku += 1;
          await promoDB.save();
        }

        const bonusSku = promo.promoInfo?.skuBarangBonus;
        const bonusQty = Number(promo.promoInfo?.quantityBonus) || 0;
        if (!bonusSku || bonusQty <= 0) return;

        const inventoryDB = await Inventory.findOne({ sku: bonusSku });
        if (!inventoryDB) return;

        const qtyBaru = Number(inventoryDB.quantity) + bonusQty;
        await stackTracingSku(
          inventoryDB._id,
          userId,
          "Void: pengembalian stock barang bonus promo",
          "increase",
          inventoryDB.quantity,
          qtyBaru,
          invoiceDB._id,
        );

        inventoryDB.quantity = qtyBaru;
        inventoryDB.terjual = Math.max(
          0,
          Number(inventoryDB.terjual) - bonusQty,
        );
        await inventoryDB.save();
      }),
    );

    for (const voucher of invoiceDB.futureVoucher || []) {
      const voucherId = voucher?.voucherInfo?.voucherId;
      if (!voucherId) continue;
      const voucherDB = await DaftarVoucher.findById(voucherId);
      if (voucherDB) {
        voucherDB.quantityTersedia += 1;
        voucherDB.terjadi = Math.max(0, Number(voucherDB.terjadi) - 1);
        await voucherDB.save();
      }
    }

    const kodeKasir = invoiceDB.kodeInvoice?.slice(2, 5);
    const userDB = await User.findOne({ kodeKasir });
    if (userDB) {
      userDB.totalQuantityPenjualan = Math.max(
        0,
        Number(userDB.totalQuantityPenjualan || 0) - qtyTotal,
      );
      userDB.totalHargaPenjualan = Math.max(
        0,
        Number(userDB.totalHargaPenjualan || 0) - subtotalVoid,
      );

      if (userDB.skuTerjual?.length > 0) {
        for (const bill of invoiceDB.currentBill || []) {
          const qty = Number(bill.quantity) || 0;
          if (!bill.sku || qty <= 0) continue;
          const skuIndex = userDB.skuTerjual.findIndex(
            (item) => item.sku === bill.sku,
          );
          if (skuIndex !== -1) {
            userDB.skuTerjual[skuIndex].totalQuantityPenjualan = Math.max(
              0,
              Number(userDB.skuTerjual[skuIndex].totalQuantityPenjualan) - qty,
            );
          }
        }
      }

      await userDB.save();
    }

    if (invoiceDB.spg) {
      const spgDB = await Spg.findById(invoiceDB.spg);
      if (spgDB) {
        spgDB.totalHargaPenjualan = Math.max(
          0,
          Number(spgDB.totalHargaPenjualan || 0) - subtotalVoid,
        );

        if (spgDB.skuTerjual?.length > 0) {
          for (const bill of invoiceDB.currentBill || []) {
            const qty = Number(bill.quantity) || 0;
            if (!bill.sku || qty <= 0) continue;
            const skuIndex = spgDB.skuTerjual.findIndex(
              (item) => item.sku === bill.sku,
            );
            if (skuIndex !== -1) {
              spgDB.skuTerjual[skuIndex].quantity = Math.max(
                0,
                Number(spgDB.skuTerjual[skuIndex].quantity) - qty,
              );
            }
          }
          spgDB.totalQuantityPenjualan = spgDB.skuTerjual.reduce(
            (acc, item) => acc + Math.max(0, Number(item.quantity) || 0),
            0,
          );
        } else {
          spgDB.totalQuantityPenjualan = Math.max(
            0,
            Number(spgDB.totalQuantityPenjualan || 0) - qtyTotal,
          );
        }

        await spgDB.save();
      }
    }

    for (const voucherId of invoiceDB.implementedVoucher || []) {
      const voucherDB = await DaftarVoucher.findById(voucherId);
      if (voucherDB) {
        voucherDB.quantityTersedia += 1;
        await voucherDB.save();
      }
    }

    const kodeOutlet = invoiceDB.kodeInvoice?.slice(0, 2);
    const outletDB = await Outlet.findOne({ kodeOutlet });
    if (outletDB) {
      outletDB.pendapatan = Math.max(
        0,
        Number(outletDB.pendapatan || 0) - pendapatanVoid,
      );
      outletDB.jumlahInvoice = Math.max(0, (outletDB.jumlahInvoice || 0) - 1);
      await outletDB.save();
    }

    return res.json({
      success: true,
      message: "Berhasil dibatalkan",
    });
  } catch (error) {
    // rollback flag void jika gagal di tengah jalan
    await Invoice.findByIdAndUpdate(invoiceId, {
      $set: {
        isVoid: false,
        confirmVoidById: null,
        tanggalVoid: null,
      },
    });
    return res
      .status(400)
      .json({ message: "Gagal membatalkan invoice", error: error.message });
  }
});

// Endpoint untuk menandai invoice sebagai sudah dicetak kwitansi
router.put("/markAsPrinted/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah invoice ada
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice tidak ditemukan" });
    }

    // Update invoice
    await Invoice.findByIdAndUpdate(id, {
      $set: { isPrintedKwitansi: true },
    });

    return res.json({
      success: true,
      message: "Status invoice berhasil diubah menjadi sudah dicetak kwitansi",
    });
  } catch (error) {
    console.error("Error saat menandai invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah status invoice",
      error: error.message,
    });
  }
});

export default router;
