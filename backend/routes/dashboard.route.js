import { Router } from "express";
import Invoice from "../models/invoice.model.js";
import SpgRefrensi from "../models/SpgRefrensi.model.js";
import UserRefrensi from "../models/User.model.js";

const router = Router();

// Endpoint untuk mendapatkan data penjualan harian SalesPerson (kasir)
router.get("/sales-report", async (req, res) => {
  try {
    const { startDate, endDate, outlet } = req.query;

    // Buat filter untuk query
    const filter = { done: true, isVoid: { $ne: true } };

    // Tambahkan filter tanggal jika ada
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

    // Tambahkan filter outlet jika ada
    if (outlet && outlet !== "all") {
      // Asumsikan ada field outlet di Invoice
      filter.outlet = outlet;
    }

    // Dapatkan data penjualan yang dikelompokkan berdasarkan tanggal
    const salesData = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            // Format tanggal: YYYY-MM-DD
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            salesPerson: "$salesPerson", // Kasir
          },
          totalSales: { $sum: "$total" },
          count: { $sum: 1 },
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
            },
          },
          totalSales: { $sum: "$totalSales" },
        },
      },
      { $sort: { _id: 1 } }, // Urutkan berdasarkan tanggal
      {
        $project: {
          _id: 0,
          date: "$_id",
          salesPersons: 1,
          totalSales: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan",
      data: salesData,
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

    // Tambahkan filter outlet jika ada
    if (outlet && outlet !== "all") {
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
          from: "spgRefrensis", // Collection name untuk SpgRefrensi
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
          spgName: "$spgInfo.name",
          totalSales: 1,
          count: 1,
          targetSales: "$spgInfo.targetHargaPenjualan",
        },
      },
      { $sort: { totalSales: -1 } }, // Urutkan dari terbesar
    ]);

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data penjualan SPG",
      data: spgSalesData,
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

// Endpoint untuk mendapatkan peringkat penjualan (gabungan kasir dan SPG)
router.get("/sales-rankings", async (req, res) => {
  try {
    const { startDate, endDate, outlet } = req.query;

    // Buat filter untuk query invoice
    const invoiceFilter = { done: true, isVoid: { $ne: true } };

    // Tambahkan filter tanggal jika ada
    if (startDate || endDate) {
      invoiceFilter.createdAt = {};
      if (startDate) {
        invoiceFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        invoiceFilter.createdAt.$lte = endDateTime;
      }
    }

    // Tambahkan filter outlet jika ada
    if (outlet && outlet !== "all") {
      invoiceFilter.outlet = outlet;
    }

    // Dapatkan total penjualan keseluruhan untuk menghitung persentase
    const totalSalesResult = await Invoice.aggregate([
      { $match: invoiceFilter },
      {
        $group: {
          _id: null,
          grandTotal: { $sum: "$total" },
        },
      },
    ]);

    const grandTotal =
      totalSalesResult.length > 0 ? totalSalesResult[0].grandTotal : 0;

    // Dapatkan data penjualan kasir (salesPerson)
    const kasirSalesData = await Invoice.aggregate([
      {
        $match: {
          ...invoiceFilter,
          salesPerson: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$salesPerson",
          totalSales: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "userRefrensis", // Collection name untuk User
          localField: "_id",
          foreignField: "username",
          as: "userInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: "$_id", // Username sebagai name jika tidak ada di userInfo
          role: "KASIR",
          totalSales: 1,
          count: 1,
          percentage: {
            $multiply: [{ $divide: ["$totalSales", grandTotal] }, 100],
          },
          targetSales: "$userInfo.targetHargaPenjualan",
        },
      },
    ]);

    // Dapatkan data penjualan SPG
    const spgSalesData = await Invoice.aggregate([
      {
        $match: {
          ...invoiceFilter,
          spg: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$spg",
          totalSales: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "spgRefrensis", // Collection name untuk SpgRefrensi
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
          _id: 0,
          id: "$_id",
          name: "$spgInfo.name",
          role: "SPG",
          totalSales: 1,
          count: 1,
          percentage: {
            $multiply: [{ $divide: ["$totalSales", grandTotal] }, 100],
          },
          targetSales: "$spgInfo.targetHargaPenjualan",
        },
      },
    ]);

    // Gabungkan hasil dan urutkan
    const combinedRankings = [...kasirSalesData, ...spgSalesData].sort(
      (a, b) => b.totalSales - a.totalSales
    );

    return res.json({
      success: true,
      message: "Berhasil mendapatkan data peringkat penjualan",
      data: combinedRankings,
      totalSales: grandTotal,
    });
  } catch (error) {
    console.error("Error getting sales rankings:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data peringkat penjualan",
      error: error.message,
    });
  }
});

// Helper function untuk menghitung rata-rata
const calculateAverage = (total, count) => {
  return count > 0 ? total / count : 0;
};

// Get sales summary
router.get("/sales-summary", async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, transactionStatus } = req.query;

    // Query untuk mendapatkan data kasir
    const cashierData = await UserRefrensi.find({
      roleName: "KASIR",
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    // Query untuk mendapatkan data SPG
    const spgData = await SpgRefrensi.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    // Hitung total dan rata-rata untuk kasir
    const cashierTotalSales = cashierData.reduce(
      (sum, item) => sum + (item.totalHargaPenjualan || 0),
      0
    );
    const cashierAvgSales = calculateAverage(
      cashierTotalSales,
      cashierData.length
    );

    // Hitung total dan rata-rata untuk SPG
    const spgTotalSales = spgData.reduce(
      (sum, item) => sum + (item.totalHargaPenjualan || 0),
      0
    );
    const spgAvgSales = calculateAverage(spgTotalSales, spgData.length);

    res.json({
      success: true,
      data: {
        cashierAvgSales,
        spgAvgSales,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get daily sales
router.get("/daily-sales", async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, transactionStatus } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Tanggal mulai dan tanggal akhir harus diisi",
      });
    }

    const matchQuery = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      done: true,
      isVoid: { $ne: true },
    };

    if (paymentMethod) matchQuery.paymentMethod = paymentMethod;
    if (transactionStatus) matchQuery.status = transactionStatus;

    const result = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            isSpg: { $cond: [{ $ifNull: ["$spg", false] }, true, false] },
          },
          totalSales: { $sum: "$total" },
          totalQuantity: {
            $sum: {
              $reduce: {
                input: "$currentBill",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.quantity"] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          cashierTotalSales: {
            $sum: { $cond: [{ $eq: ["$_id.isSpg", false] }, "$totalSales", 0] },
          },
          cashierTotalQuantity: {
            $sum: {
              $cond: [{ $eq: ["$_id.isSpg", false] }, "$totalQuantity", 0],
            },
          },
          spgTotalSales: {
            $sum: { $cond: [{ $eq: ["$_id.isSpg", true] }, "$totalSales", 0] },
          },
          spgTotalQuantity: {
            $sum: {
              $cond: [{ $eq: ["$_id.isSpg", true] }, "$totalQuantity", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          cashierTotalSales: 1,
          cashierTotalQuantity: 1,
          spgTotalSales: 1,
          spgTotalQuantity: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in daily-sales endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penjualan harian",
      error: error.message,
    });
  }
});

export default router;
