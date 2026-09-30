import { Router } from "express";
import Invoice from "../models/invoice.model.js";
import Outlet from "../models/Outlet.model.js";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import Brand from "../models/brand.model.js";
import mongoose from "mongoose";
const router = Router();

//✅ Endpoint untuk mendapatkan data penjualan harian SalesPerson (kasir)
router.get("/sales-report", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      outlet,
      paymentMethod,
      transactionStatus,
      countMethod,
    } = req.query;

    // Buat filter untuk query
    const filter = {};

    // Filter tanggal berdasarkan createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const startDatePoint = new Date(startDate);
        startDatePoint.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDatePoint;
      }
      if (endDate) {
        const endDatePoint = new Date(endDate);
        endDatePoint.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDatePoint;
      }
    }

    // Filter outlet berdasarkan 2 digit pertama kodeInvoice
    if (
      outlet &&
      outlet !== "all" &&
      outlet !== "undefined" &&
      outlet !== "null"
    ) {
      filter.kodeInvoice = new RegExp(`^${outlet}`, "i");
    }

    // Filter paymentMethod
    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
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

    // Dapatkan data invoice yang sesuai filter
    let salesData = [];

    if (countMethod === "settlement" && outlet && outlet !== "all") {
      // Dapatkan informasi settlement dari Outlet
      const outletData = await Outlet.findOne({ kodeOutlet: outlet });

      if (outletData && outletData.periodeSettlement) {
        const periodeDays = outletData?.periodeSettlement || 1; // Default 1 hari jika tidak ada
        const [settlementHour, settlementMinute] = (
          outletData?.jamSettlement || "00:00"
        )
          .split(":")
          .map(Number);

        // Ambil semua invoice yang sesuai dengan filter
        const invoices = await Invoice.find(filter).sort({ createdAt: 1 });

        if (invoices.length > 0) {
          // Tentukan tanggal awal dan akhir untuk periode
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);

          // Buat array periode berdasarkan periodeDays
          const periods = [];
          let currentPeriodStart = new Date(startDateObj);

          while (currentPeriodStart <= endDateObj) {
            const currentPeriodEnd = new Date(currentPeriodStart);

            // Jika periode 1 hari, gunakan jam settlement
            if (periodeDays === 1) {
              currentPeriodStart.setHours(
                settlementHour,
                settlementMinute,
                0,
                0
              );
              currentPeriodEnd.setHours(settlementHour, settlementMinute, 0, 0);
              currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 1);
            } else {
              currentPeriodEnd.setDate(
                currentPeriodEnd.getDate() + periodeDays - 1
              );
            }

            if (currentPeriodEnd > endDateObj) {
              currentPeriodEnd.setTime(endDateObj.getTime());
            }

            periods.push({
              start: new Date(currentPeriodStart),
              end: new Date(currentPeriodEnd),
              label: `${currentPeriodStart.toISOString().split("T")[0]} - ${
                currentPeriodEnd.toISOString().split("T")[0]
              }`,
            });

            // Move to next period
            if (periodeDays === 1) {
              currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
            } else {
              currentPeriodStart.setDate(
                currentPeriodStart.getDate() + periodeDays
              );
            }
          }

          // Kelompokkan invoice berdasarkan periode
          salesData = periods.map((period) => {
            const periodInvoices = invoices.filter((invoice) => {
              const invoiceDate = new Date(invoice.createdAt);
              return invoiceDate >= period.start && invoiceDate < period.end;
            });

            // Group by salesPerson dalam periode
            const salesPersons = {};
            let totalSales = 0;
            let totalCount = 0;
            let totalItems = 0;

            periodInvoices.forEach((invoice) => {
              const salesPerson = invoice.salesPerson || "Unknown";
              if (!salesPersons[salesPerson]) {
                salesPersons[salesPerson] = {
                  name: salesPerson,
                  totalSales: 0,
                  count: 0,
                  items: 0,
                };
              }

              salesPersons[salesPerson].totalSales += invoice.total || 0;
              salesPersons[salesPerson].count += 1;

              // Hitung total items dari currentBill
              const itemCount = invoice.currentBill
                ? invoice.currentBill.reduce(
                    (sum, item) => sum + (item.quantity || 0),
                    0
                  )
                : 0;
              salesPersons[salesPerson].items += itemCount;

              totalSales += invoice.total || 0;
              totalCount += 1;
              totalItems += itemCount;
            });

            return {
              date: period.label,
              salesPersons: Object.values(salesPersons),
              totalSales,
              totalCount,
              totalItems,
            };
          });
        } 
      }
    } else {
      // Menentukan cara grouping berdasarkan countMethod standar
      let groupByDateFormat = "%Y-%m-%d"; // Default format untuk perhari
      let groupByDateField = "createdAt";

      if (countMethod === "perminggu") {
        groupByDateFormat = "%Y-%U"; // Format untuk minggu dalam tahun
      } else if (countMethod === "perbulan") {
        groupByDateFormat = "%Y-%m"; // Format untuk bulan
      } else if (countMethod === "pertahun") {
        groupByDateFormat = "%Y"; // Format untuk tahun
      }

      // Aggregate pipeline untuk mendapatkan data penjualan
      salesData = await Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: groupByDateFormat,
                  date: "$" + groupByDateField,
                },
              },
              salesPerson: "$salesPerson",
            },
            totalSales: { $sum: "$total" },
            count: { $sum: 1 },
            items: {
              $sum: {
                $reduce: {
                  input: "$currentBill",
                  initialValue: 0,
                  in: {
                    $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            salesPersons: {
              $push: {
                name: "$_id.salesPerson",
                totalSales: "$totalSales",
                count: "$count",
                items: "$items",
              },
            },
            totalSales: { $sum: "$totalSales" },
            totalCount: { $sum: "$count" },
            totalItems: { $sum: "$items" },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: "$_id",
            salesPersons: 1,
            totalSales: 1,
            totalCount: 1,
            totalItems: 1,
          },
        },
      ]);

      // If no data found, create empty data for the date range
      if (salesData.length === 0 && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d));
        }

        salesData = dates.map((date) => ({
          date: date.toISOString().split("T")[0],
          salesPersons: [],
          totalSales: 0,
          totalCount: 0,
          totalItems: 0,
        }));
      }
    }

    // Tambahkan informasi tambahan untuk frontend
    const summary = {
      totalSales: salesData.reduce((sum, item) => sum + item.totalSales, 0),
      totalTransactions: salesData.reduce(
        (sum, item) => sum + item.totalCount,
        0
      ),
      totalItems: salesData.reduce((sum, item) => sum + item.totalItems, 0),
      averageTransactionValue:
        salesData.reduce((sum, item) => sum + item.totalSales, 0) /
        (salesData.reduce((sum, item) => sum + item.totalCount, 0) || 1),
    };

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan",
      data: salesData,
      summary,
    });
  } catch (error) {
    console.error("Error getting sales report:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penjualan",
      error: error.message,
    });
  }
});

// Endpoint untuk mendapatkan data penjualan per SPG
router.get("/spg-sales", async (req, res) => {
  try {
    const { startDate, endDate, outlet } = req.query;

    // Buat filter untuk query
    const filter = { done: true, isVoid: { $ne: true } };

    // Filter hanya invoice yang memiliki spg
    filter.spg = { $exists: true, $ne: null };

    // Tambahkan filter tanggal jika ada
    if (startDate || endDate) {
      filter.tanggalBayar = {};
      if (startDate) {
        filter.tanggalBayar.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.tanggalBayar.$lte = endDateTime;
      }
    }

    // Tambahkan filter outlet jika ada dan valid
    if (
      outlet &&
      outlet !== "all" &&
      outlet !== "undefined" &&
      outlet !== "null"
    ) {
      filter.outlet = outlet;
    }

    // Dapatkan data penjualan dikelompokkan berdasarkan SPG
    const spgSalesData = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$spg",
          totalSales: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "spgRefrensi",
          localField: "_id",
          foreignField: "_id",
          as: "spgInfo",
        },
      },
      {
        $unwind: {
          path: "$spgInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$spgInfo.name", "Unknown SPG"] },
          totalSales: 1,
          count: 1,
          targetSales: "$spgInfo.targetHargaPenjualan",
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    // Konversi _id ke string untuk memastikan perbandingan yang benar
    const formattedData = spgSalesData.map((item) => ({
      ...item,
      _id: item._id.toString(),
      spgInfo: item.spgInfo
        ? {
            ...item.spgInfo,
            _id: item.spgInfo._id.toString(),
          }
        : null,
    }));

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan SPG",
      data: formattedData,
    });
  } catch (error) {
    console.error("Error getting SPG sales data:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penjualan SPG",
      error: error.message,
    });
  }
});

// Endpoint Ini tidak pakai filter outlet
//endpint untuk mengurutkan ranking/distribusi SPG dengan kasir
router.get("/ranking-spg-kasir", async (req, res) => {
  try {
    const { startDate, endDate, transactionStatus } = req.query;

    // Buat filter untuk query
    const filter = {};

    // Filter tanggal berdasarkan createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
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

    // Dapatkan data sales Ranking yang sesuai filter
    const invoiceDBSumUpTotalSalesForKasir = await Invoice.aggregate([
      { $match: filter }, // Step 1: Filter data invoice
      {
        $group: {
          _id: "$salesPerson", // group by salesPerson (e.g. username)
          totalSales: { $sum: "$total" },
          jumlahInvoice: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "userrefrensis", // pastikan ini nama koleksi di MongoDB (lowercase & plural biasanya)
          localField: "_id", // ini hasil group (_id = salesPerson)
          foreignField: "username", // field di koleksi UserRefrensi untuk dicocokkan
          as: "kasir", // hasilnya akan ada di field ini
        },
      },
      {
        $unwind: "$kasir",
      },
      {
        $group: {
          _id: null, // Untuk menghitung total keseluruhan sales
          totalSalesOverall: { $sum: "$totalSales" }, // Total penjualan keseluruhan
          kasirs: { $push: "$$ROOT" }, // Menyimpan hasil group kasir dalam array
        },
      },
      {
        $unwind: "$kasirs",
      },
      {
        $project: {
          _id: "$kasirs._id",
          jumlahInvoice: "$kasirs.jumlahInvoice",
          totalSales: "$kasirs.totalSales",
          "kasir.username": "$kasirs.kasir.username",
          "kasir.roleName": "$kasirs.kasir.roleName",
          "kasir.kodeKasir": "$kasirs.kasir.kodeKasir",
          "kasir.totalHargaPenjualan": "$kasirs.kasir.totalHargaPenjualan",
          "kasir.totalQuantityPenjualan":
            "$kasirs.kasir.totalQuantityPenjualan",
          percentage: {
            $multiply: [
              { $divide: ["$kasirs.totalSales", "$totalSalesOverall"] },
              100,
            ],
          },
        },
      },
      {
        $sort: {
          totalSales: -1,
        },
      },
    ]);

    const invoiceDBSumUpTotalSalesForSpg = await Invoice.aggregate([
      { $match: filter },
      {
        $addFields: {
          spgObjectId: {
            $convert: {
              input: "$spg",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $group: {
          _id: "$spgObjectId",
          totalSales: { $sum: "$total" },
          jumlahInvoice: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "spgrefrensis",
          localField: "_id",
          foreignField: "_id",
          as: "spg",
        },
      },
      { $unwind: "$spg" },
      {
        $group: {
          _id: null, // Untuk menghitung total keseluruhan sales
          totalSalesOverall: { $sum: "$totalSales" }, // Total penjualan keseluruhan
          spgs: { $push: "$$ROOT" }, // Menyimpan hasil group spg dalam array
        },
      },
      {
        $unwind: "$spgs",
      },
      {
        $project: {
          _id: "$spgs._id",
          "spg.name": "$spgs.spg.name",
          "spg.totalHargaPenjualan": "$spgs.spg.totalHargaPenjualan",
          "spg.totalQuantityPenjualan": "$spgs.spg.totalQuantityPenjualan",
          totalSales: "$spgs.totalSales",
          jumlahInvoice: "$spgs.jumlahInvoice",
          percentage: {
            $multiply: [
              { $divide: ["$spgs.totalSales", "$totalSalesOverall"] },
              100,
            ],
          },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    // Tambahkan informasi tambahan untuk frontend
    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan",
      data: {
        kasirRank: invoiceDBSumUpTotalSalesForKasir,
        spgRank: invoiceDBSumUpTotalSalesForSpg,
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan salesrangking:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penjualan",
      error: error.message,
    });
  }
});

//ini dashboard/home
router.get("/simple-overview", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const myOutlet = await Outlet.findOne({
      kasirList: { $in: [req.user.userId] },
    });

    const penjualanHariIni = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          done: true,
          isVoid: { $ne: true },
          kodeInvoice: { $regex: `^${myOutlet.kodeOutlet}` },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
        },
      },
    ]);

    const totalTransaksiHariIni = await Invoice.countDocuments({
      done: true,
      isVoid: { $ne: true },
      tanggalBayar: { $gte: startOfDay, $lte: endOfDay },
      kodeInvoice: { $regex: `^${myOutlet.kodeOutlet}` },
    });

    // Dapatkan daftar brand name
    const brandList = await Brand.find({
      _id: { $in: myOutlet.brandIds },
    });
    const brandNames = brandList.map((brand) => brand.name);

    const stokMenipis = await InventoryRefrensi.countDocuments({
      quantity: { $lte: 10 },
      brand: { $in: brandNames },
    });

    const transaksiBatalHariIni = await Invoice.countDocuments({
      done: true,
      isVoid: true,
      tanggalBayar: { $gte: startOfDay, $lte: endOfDay },
      kodeInvoice: { $regex: `^${myOutlet.kodeOutlet}` },
    });

    const outletTerlarisHariIni = await Invoice.aggregate([
      {
        $match: {
          tanggalBayar: { $gte: startOfDay, $lte: endOfDay },
          done: true,
          isVoid: { $ne: true },
        },
      },
      {
        // Ambil 2 karakter pertama dari kodeInvoice sebagai kodeOutlet
        $project: {
          kodeOutlet: { $substr: ["$kodeInvoice", 0, 2] },
        },
      },
      {
        $group: {
          _id: "$kodeOutlet",
          jumlahTransaksi: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "outlets",
          localField: "_id",
          foreignField: "kodeOutlet",
          as: "outlet",
        },
      },
      { $unwind: "$outlet" },
      { $sort: { jumlahTransaksi: -1 } },
      { $limit: 1 },
    ]);

    const barangTerlarisHariIni = await Invoice.aggregate([
      {
        $match: {
          tanggalBayar: { $gte: startOfDay, $lte: endOfDay },
          done: true,
          isVoid: { $ne: true },
          kodeInvoice: { $regex: `^${myOutlet.kodeOutlet}` },
        },
      },
      {
        $unwind: "$currentBill",
      },
      {
        $group: {
          _id: "$currentBill.sku",
          totalQuantityTerjual: { $sum: "$currentBill.quantity" },
        },
      },
      {
        $lookup: {
          from: "inventoryrefrensis", // harus sesuai dengan nama koleksi di MongoDB (case-sensitive)
          localField: "_id",
          foreignField: "sku",
          as: "barang",
          pipeline: [
            {
              $match: {
                quantity: { $gte: 1 },
                RpHargaDasar: {
                  $gt: mongoose.Types.Decimal128.fromString("0"),
                },
              },
            },
          ],
        },
      },
      {
        $unwind: "$barang",
      },
      {
        $sort: { totalQuantityTerjual: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan",
      data: {
        penjualanHariIni,
        totalTransaksiHariIni,
        stokMenipis,
        transaksiBatalHariIni,
        outletTerlarisHariIni,
        barangTerlarisHariIni,
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan data penjualan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penjualan",
      error: error.message,
    });
  }
});

router.get("/rangking-payment-method", async (req, res) => {
  try {
    //outlet kirim kodeOutlet
    const { startDate, endDate, transactionStatus, outlet } = req.query;

    // Buat filter untuk query
    const filter = {};

    if (outlet != "all") {
      filter.kodeInvoice = { $regex: `^${outlet}` };
    }

    // Filter tanggal berdasarkan createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
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

    // Dapatkan data payment method Ranking yang sesuai filter
    const paymentMethodRanking = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$paymentMethod", // group by paymentMethod
          totalSales: { $sum: "$total" },
          jumlahInvoice: { $sum: 1 },
          totalItems: {
            $sum: {
              $reduce: {
                input: "$currentBill",
                initialValue: 0,
                in: {
                  $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "paymentmethods", // pastikan ini nama koleksi di MongoDB
          localField: "_id",
          foreignField: "method",
          as: "paymentMethodInfo",
        },
      },
      {
        $unwind: "$paymentMethodInfo",
      },
      {
        $group: {
          _id: null, // Untuk menghitung total keseluruhan sales
          totalSalesOverall: { $sum: "$totalSales" }, // Total penjualan keseluruhan
          paymentMethods: { $push: "$$ROOT" }, // Menyimpan hasil group payment method dalam array
        },
      },
      {
        $unwind: "$paymentMethods",
      },
      {
        $project: {
          _id: "$paymentMethods._id",
          jumlahInvoice: "$paymentMethods.jumlahInvoice",
          totalSales: "$paymentMethods.totalSales",
          totalItems: "$paymentMethods.totalItems",
          "paymentMethod.name": "$paymentMethods.paymentMethodInfo.name",
          "paymentMethod.description":
            "$paymentMethods.paymentMethodInfo.description",
          "paymentMethod.icon": "$paymentMethods.paymentMethodInfo.icon",
          percentage: {
            $multiply: [
              { $divide: ["$paymentMethods.totalSales", "$totalSalesOverall"] },
              100,
            ],
          },
        },
      },
      {
        $sort: {
          totalSales: -1,
        },
      },
    ]);

    // Tambahkan informasi tambahan untuk frontend
    return res.json({
      success: true,
      message: "Berhasil mendapatkan data ranking payment method",
      data: {
        paymentMethodRank: paymentMethodRanking,
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan payment method ranking:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data ranking payment method",
      error: error.message,
    });
  }
});

router.get("/end-of-day-by-sku", async (req, res) => {
  try {
    const { startDate, endDate, transactionStatus, outlet } = req.query;

    // Buat filter untuk query
    const filter = {};

if (outlet != "all") {
      filter.kodeInvoice = { $regex: `^${outlet}` };
    }
    
    // Filter tanggal berdasarkan createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
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

    // Dapatkan data sku Ranking yang sesuai filter
    const skuRanking = await Invoice.aggregate([
      { $match: filter },
      { $unwind: "$currentBill" },
      {
        $group: {
          _id: "$currentBill.sku", // Group by SKU
          totalQuantity: { $sum: "$currentBill.quantity" },
          totalSales: { $sum: "$currentBill.totalRp" },
          jumlahInvoice: { $sum: 1 }, // Berapa kali SKU ini muncul di invoice
        },
      },
      {
        $sort: {
          totalSales: -1,
        },
      },
    ]);

    // Tambahkan informasi tambahan untuk frontend
    return res.json({
      success: true,
      message: "Berhasil mendapatkan data ranking penjualan berdasarkan SKU",
      data: {
        skuRank: skuRanking,
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan payment method ranking:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data ranking payment sku",
      error: error.message,
    });
  }
});

export default router;
