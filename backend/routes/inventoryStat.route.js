import { Router } from "express";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";

const router = Router();

// Endpoint untuk mendapatkan statistik inventory
router.get("/getInventoryStats", async (req, res) => {
  try {
    // Hitung total inventory
    const totalInventory = await InventoryRefrensi.countDocuments({});

    // Hitung inventory dengan stok kosong
    const emptyStock = await InventoryRefrensi.countDocuments({
      quantity: { $lte: 0 },
      isDisabled: false,
    });

    // Hitung inventory dengan stok dibawah 10
    const lowStock = await InventoryRefrensi.countDocuments({
      quantity: { $lte: 10, $gt: 0 },
      isDisabled: false,
    });

    // Hitung jumlah total item yang tersedia
    const inventories = await InventoryRefrensi.find({ isDisabled: false });
    let totalStockValue = 0;
    let totalItems = 0;

    for (const item of inventories) {
      totalItems += item.quantity || 0;
      // Konversi Decimal128 ke Number
      const hargaDasar = item.RpHargaDasar
        ? parseFloat(item.RpHargaDasar.toString())
        : 0;
      totalStockValue += hargaDasar * (item.quantity || 0);
    }

    // Dapatkan produk terlaris
    const topSellingItems = await InventoryRefrensi.find({ isDisabled: false })
      .sort({ terjual: -1 })
      .limit(10);

    // Dapatkan produk dengan stok terendah
    const lowestStockItems = await InventoryRefrensi.find({
      isDisabled: false,
      quantity: { $lte: 10 },
    })
      .sort({ quantity: 1 })
      .limit(10);

    // Dapatkan statistik PO dengan logika perbaikan
    const allPurchaseOrders = await PurchaseOrder.find();

    let completedPO = 0;
    let pendingPO = 0;
    let totalItemsRequested = 0;
    let totalItemsReceived = 0;

    for (const po of allPurchaseOrders) {
      let isCompleted = true;

      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          // Hitung total item yang diminta dan diterima
          const requested = Number(item.request) || 0;
          const received = Number(item.received) || 0;

          totalItemsRequested += requested;
          totalItemsReceived += received;

          // Jika ada item yang request tidak sama dengan received, PO belum selesai
          if (requested !== received) {
            isCompleted = false;
          }
        }

        if (isCompleted) {
          completedPO++;
        } else {
          pendingPO++;
        }
      } else {
        // Jika tidak ada items, anggap sebagai pending
        pendingPO++;
      }
    }

    return res.json({
      message: "berhasil mendapatkan statistik inventory",
      data: {
        inventoryCounts: {
          total: totalInventory,
          emptyStock,
          lowStock,
          totalItems,
        },
        totalStockValue,
        topSellingItems,
        lowestStockItems,
        purchaseOrderStats: {
          total: allPurchaseOrders.length,
          completed: completedPO,
          pending: pendingPO,
          itemsRequested: totalItemsRequested,
          itemsReceived: totalItemsReceived,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mengambil statistik inventory" });
  }
});

// Endpoint untuk mencari inventory berdasarkan kategori stok
router.get("/searchInventoryByStockCategory", async (req, res) => {
  try {
    const { category, search, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Filter dasar
    let filter = { isDisabled: false };

    // Filter berdasarkan kategori stok
    if (category === "empty") {
      filter.quantity = { $lte: 0 };
    } else if (category === "low") {
      filter.quantity = { $gt: 0, $lte: 10 };
    } else if (category === "normal") {
      filter.quantity = { $gt: 10 };
    }

    // Filter berdasarkan pencarian
    if (search) {
      filter.$or = [
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const total = await InventoryRefrensi.countDocuments(filter);
    const data = await InventoryRefrensi.find(filter)
      .sort({ quantity: 1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      message: "berhasil mendapatkan data inventory",
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
    return res.status(400).json({ message: "gagal mengambil data inventory" });
  }
});

export default router;
