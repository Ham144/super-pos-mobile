import { Router } from "express";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import UserRefrensi from "../models/User.model.js";
import { stackTracingSku } from "../utils/stackTracingSku.js";
import { validatePoItems } from "../utils/validatePoSkus.js";
import { parsePurchaseOrdersFromCsv } from "../utils/parsePoImportCsv.js";

const router = Router();
// Buat direktori uploads jika belum ada
const uploadPath = "./uploads";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// Konfigurasi Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

// Rute untuk unggah file
router.post("/importPurchaseOrder", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded!" });
  }

  const filePath = file.path || path.join(process.cwd(), uploadPath, file.filename);

  //dapatkan current login user
  const currentLoginUserId = req.user.userId;
  const currentLoginUser = await UserRefrensi.findOne({
    _id: currentLoginUserId,
  }).select("username");

  try {
    const { results, separator } = await parsePurchaseOrdersFromCsv(filePath);

    if (results.length === 0) {
      return res.status(400).json({
        message: "Gagal ekstrak file",
        hint: "Pastikan header CSV: Purchase Code (Erp);Plat;SKU;Request;Barcode;Keterangan",
        delimiter: separator,
      });
    }

    const details = [];
    const allMissing = new Set();
    const allDuplicated = new Set();

    for (const po of results) {
      if (!po.items?.length) {
        details.push({ erp: po.Erp, type: "empty", skus: [] });
        continue;
      }

      const { missingSkus, duplicatedSkus, normalizedItems } =
        await validatePoItems(po.items);

      duplicatedSkus.forEach((s) => allDuplicated.add(s));
      missingSkus.forEach((s) => allMissing.add(s));

      if (duplicatedSkus.length) {
        details.push({ erp: po.Erp, type: "duplicate", skus: duplicatedSkus });
      }
      if (missingSkus.length) {
        details.push({ erp: po.Erp, type: "missing", skus: missingSkus });
      }

      po.items = normalizedItems;
    }

    if (details.length) {
      return res.status(400).json({
        message: "Gagal import purchase order",
        details,
        missingSkus: [...allMissing],
        duplicatedSkus: [...allDuplicated],
        delimiter: separator,
      });
    }

    // Erp duplikat dalam satu file CSV tidak boleh
    const erpInFile = new Set();
    const duplicateInFile = [];
    for (const po of results) {
      const erp = po.Erp?.trim();
      if (!erp) continue;
      if (erpInFile.has(erp)) duplicateInFile.push(erp);
      else erpInFile.add(erp);
    }

    if (duplicateInFile.length) {
      return res.status(400).json({
        message: `Kode PO duplikat dalam file: ${[...new Set(duplicateInFile)].join(", ")}`,
        duplicateInFile: [...new Set(duplicateInFile)],
      });
    }

    const savedPOs = [];
    let replacedCount = 0;

    for (const po of results) {
      const erp = po.Erp?.trim();
      const deleted = await PurchaseOrder.deleteOne({ Erp: erp });
      if (deleted.deletedCount > 0) replacedCount++;

      const created = await PurchaseOrder.create({
        Erp: erp,
        plat: po.plat || "",
        dibuatOleh: currentLoginUser?.username || "",
        items: po.items.map((item) => ({
          sku: item.sku,
          barcodeItem: item.barcodeItem || "",
          request: item.request ?? 0,
          keterangan: item.keterangan || "",
          received: 0,
          tanggalTerpenuhi: null,
        })),
      });
      savedPOs.push(created);
    }

    const summary = savedPOs
      .map((p) => `${p.Erp} (${p.items.length} item)`)
      .join(", ");

    return res.json({
      message: `${savedPOs.length} PO diimport: ${summary}${
        replacedCount ? ` · ${replacedCount} mengganti data lama` : ""
      }`,
      importedCount: savedPOs.length,
      replacedCount,
      summary: savedPOs.map((p) => ({
        erp: p.Erp,
        itemCount: p.items.length,
      })),
      data: savedPOs,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal import purchase order",
      error: error.message,
    });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

//for purchase order create
router.get("/getAllPurchaseOrder", async (req, res) => {
  try {
    const { startDate, endDate, ...otherFilters } = req.query;
    let filterList = { ...otherFilters };

    // Add date range filtering if dates are provided
    if (startDate || endDate) {
      filterList.createdAt = {};
      if (startDate) {
        filterList.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set endDate to end of the day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filterList.createdAt.$lte = endDateTime;
      }
    }

    const data = await PurchaseOrder.find(filterList).sort({ createdAt: -1 });
    return res.json({
      message: "berhasil mendapatkan data purchase order",
      data,
      totalCount: data.length,
    });
  } catch (error) {
    return res.status(400).json({
      message: "gagal mengambil purchase order",
      error: error.message,
    });
  }
});

router.post("/createPurchaseOrder", async (req, res) => {
  const { Erp, plat, items } = req.body;
  const currentLoginUserId = req.user.userId;

  const myUSer = await UserRefrensi.findOne({ _id: currentLoginUserId }).select(
    "username"
  );

  if (!myUSer) {
    return res.status(400).json({
      message: "Tidak dapat membuat purchase order baru, dibuatOleh tidak ada",
    });
  }

  if (!Erp || !items || !Array.isArray(items)) {
    return res.status(400).json({
      message:
        "Field utama (Erp atau items) tidak lengkap atau items bukan array",
    });
  }

  if (items.length === 0) {
    return res.status(400).json({
      message: "Items tidak boleh kosong",
    });
  }

  const { missingSkus, duplicatedSkus, normalizedItems } =
    await validatePoItems(items);

  if (duplicatedSkus.length > 0) {
    return res.status(400).json({
      message: "Terdapat SKU duplikat dalam 1 PO",
      duplicatedSkus,
    });
  }

  if (missingSkus.length > 0) {
    return res.status(400).json({
      message: "Beberapa SKU tidak terdaftar di database",
      missingSkus,
    });
  }

  try {
    const newPurchaseOrder = await PurchaseOrder.create({
      Erp: Erp?.trim(),
      plat: plat || "",
      dibuatOleh: myUSer.username || "",
      items: normalizedItems.map((item) => ({
        barcodeItem: item.barcodeItem || "",
        description: item.description || "",
        received: item.received || 0,
        sku: item.sku,
        request: item.request,
        keterangan: item.keterangan || "",
        tanggalTerpenuhi: null,
        dibuatOleh: myUSer.username || "",
      })),
    });

    return res.status(201).json({
      message: "Berhasil membuat purchase order baru",
      data: newPurchaseOrder,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Gagal membuat purchase order baru, Erp sudah digunakan",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Gagal membuat purchase order baru",
      error: error.message,
    });
  }
});

router.put("/updatePurchaseOrder", async (req, res) => {
  const { _id, plat, items, status } = req.body;

  // Validasi 1: Pastikan field utama ada
  if (!_id) {
    return res.status(400).json({
      message: "Tidak dapat memperbarui purchase order, _id tidak ada",
    });
  }

  // Validasi 2: Pastikan items adalah array jika ada
  if (items && !Array.isArray(items)) {
    return res.status(400).json({ message: "Items harus berupa array" });
  }

  try {
    // Dapatkan user yang sedang login
    const currentLoginUserId = req.user.userId;
    const currentUser = await UserRefrensi.findOne({
      _id: currentLoginUserId,
    }).select("username");

    if (!currentUser) {
      return res.status(400).json({
        message: "User tidak ditemukan",
      });
    }

    // Cari purchase order berdasarkan _id
    const purchaseOrderDB = await PurchaseOrder.findById(_id);
    if (!purchaseOrderDB) {
      return res
        .status(404)
        .json({ message: "Purchase order tidak ditemukan" });
    }

    // Validasi 3: Pastikan Erp tidak diubah
    if (req.body.Erp && req.body.Erp !== purchaseOrderDB.Erp) {
      return res.status(400).json({ message: "Erp tidak boleh diubah" });
    }

    // Validasi 4: Pastikan semua SKU ada di database (jika items ada)
    if (items) {
      const skus = items.map((item) => item.sku).filter((sku) => sku); // Pastikan SKU tidak undefined
      if (skus.length > 0) {
        const foundSkus = await InventoryRefrensi.find({
          sku: { $in: [...skus] },
        }).select("sku");
        const foundSkuIds = foundSkus.map((item) => item.sku.toString());
        const missingSkus = skus.filter((sku) => !foundSkuIds.includes(sku));
        if (missingSkus.length > 0) {
          return res.status(400).json({
            message: "Beberapa SKU tidak terdaftar di database",
            missingSkus: missingSkus,
          });
        }
      }
    }

    // Validasi 5: Pastikan received tidak diubah (jika items ada)
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const dbItem = purchaseOrderDB.items[i];
        if (
          dbItem &&
          typeof items[i].received !== "undefined" &&
          items[i].received !== dbItem.received
        ) {
          return res.status(400).json({
            message: `Received pada item indeks ${i} tidak boleh diubah`,
          });
        }
      }
    }

    // Logika untuk status "terpenuhi": update InventoryRefrensi
    if (
      status?.toLowerCase() === "terpenuhi" &&
      purchaseOrderDB.status === "belum terpenuhi"
    ) {
      // Tambahkan dipenuhiOleh saat status berubah menjadi terpenuhi
      purchaseOrderDB.dipenuhiOleh = currentUser.username;

      // Untuk setiap item, tambahkan request ke quantity di InventoryRefrensi
      for (const item of purchaseOrderDB.items) {
        const inventoryDB = await InventoryRefrensi.findOne({ sku: item.sku });
        if (!inventoryDB) {
          return res.status(400).json({
            message: `SKU ${item.sku} tidak ditemukan di InventoryRefrensi`,
          });
        }
        // Tambahkan request ke quantity di InventoryRefrensi
        await InventoryRefrensi.findOneAndUpdate(
          { sku: item.sku },
          {
            $inc: { quantity: item.request || 0 }, // Tambah quantity berdasarkan request
          }
        );
      }
    }

    // Update purchase order
    purchaseOrderDB.plat = plat !== undefined ? plat : purchaseOrderDB.plat; // Update plat jika ada
    purchaseOrderDB.status = status || purchaseOrderDB.status; // Update status jika ada

    // Update items (tanpa mengubah received)
    if (items) {
      purchaseOrderDB.items = items.map((item, index) => {
        const existingItem = purchaseOrderDB.items[index] || {};
        return {
          sku: item.sku || existingItem.sku,
          barcodeItem: item.barcodeItem || existingItem.barcodeItem,
          request: item.request || existingItem.request,
          received: existingItem.received || 0, // Pertahankan nilai received
          keterangan: item.keterangan || existingItem.keterangan || "",
          tanggalTerpenuhi: item.tanggalTerpenuhi
            ? new Date(item.tanggalTerpenuhi)
            : existingItem.tanggalTerpenuhi || null,
        };
      });
    }

    // Simpan perubahan
    await purchaseOrderDB.save();

    return res.status(200).json({
      message: "Berhasil memperbarui purchase order",
      data: purchaseOrderDB,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal memperbarui purchase order",
      error: error.message,
    });
  }
});

router.post("/scanErp", async (req, res) => {
  const { Erp, plat } = req.body;
  let query = {};
  if (Erp) {
    query.Erp = Erp;
  }
  if (plat) {
    query.plat = plat;
  }
  if (plat && !Erp) {
    return res.status(400).json({
      message: "Erp diperlukan",
    });
  }

  try {
    const PODB = await PurchaseOrder.findOne(query);
    if (!PODB) {
      return res.status(400).json({
        message: "tidak ditemukan",
      });
    }
    return res.json({
      message: "ditemukan",
      data: PODB,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal Menemukan",
      error: error.message,
    });
  }
});

router.post("/manualEditPurchaseOrder", async (req, res) => {
  const { Erp, sku, request, received, currentTime } = req.body;

  if (!Erp || !sku || !request || received === undefined) {
    return res.status(400).json({
      message: "Erp, sku, request, dan received wajib diisi dan harus valid",
    });
  }

  try {
    const currentLoginUserId = req.user.userId;
    const currentUser = await UserRefrensi.findOne({
      _id: currentLoginUserId,
    }).select("username");

    if (!currentUser) {
      return res.status(400).json({ message: "User tidak ditemukan" });
    }

    const PODB = await PurchaseOrder.findOne({ Erp });
    if (!PODB) {
      return res
        .status(404)
        .json({ message: "PurchaseOrder tidak ditemukan [Erp]" });
    }

    // 🔍 Validasi SKU duplikat dalam 1 PO (opsional, antisipasi data lama bermasalah)
    const skuOccurrences = PODB.items.filter((item) => item.sku === sku);
    if (skuOccurrences.length > 1) {
      return res.status(400).json({
        message: "Terdapat SKU duplikat dalam satu Purchase Order",
        sku,
        totalDuplikat: skuOccurrences.length,
      });
    }

    const item = PODB.items.find((item) => item.sku === sku);
    if (!item) {
      return res.status(404).json({
        message: "Item tidak ditemukan di PurchaseOrder [SKU]",
      });
    }

    const inventoryDB = await InventoryRefrensi.findOne({ sku });
    if (!inventoryDB) {
      return res.status(404).json({
        message: "SKU tidak ditemukan di InventoryRefrensi",
      });
    }

    if (received > request) {
      return res.status(400).json({
        message: "Received tidak boleh melebihi request",
      });
    }

    if (received === item.received) {
      return res.status(400).json({
        message: "Tidak ada perubahan pada received",
      });
    }

    const difference = received - item.received;
    await InventoryRefrensi.updateOne(
      { sku },
      { $inc: { quantity: difference } }
    );

    item.received = received;
    if (item.received === item.request) {
      item.tanggalTerpenuhi = currentTime;
    }

    const allItemsCompleted = PODB.items.every(
      (item) => item.received === item.request
    );
    if (allItemsCompleted) {
      PODB.status = "terpenuhi";
      PODB.dipenuhiOleh = currentUser.username;
    }

    await PODB.save();

    return res.status(200).json({
      message:
        "Berhasil mengupdate item di PurchaseOrder dan InventoryRefrensi",
      data: PODB,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengupdate PurchaseOrder",
      error: error.message,
    });
  }
});

router.post("/completeAllPurchaseOrder", async (req, res) => {
  return res.status(400).json({
    message: "Fitur ini sedang diperbaiki",
  });
  const { Erp, currentTime } = req.body;

  console.log(Erp, currentTime);

  // Validasi 1: Pastikan Erp dan currentTime ada
  if (!Erp || !currentTime) {
    return res.status(400).json({
      message: "Erp dan currentTime wajib diisi",
    });
  }

  try {
    // Dapatkan user yang sedang login
    const currentLoginUserId = req.user.userId;
    const currentUser = await UserRefrensi.findOne({
      _id: currentLoginUserId,
    }).select("username");

    if (!currentUser) {
      return res.status(400).json({
        message: "User tidak ditemukan",
      });
    }

    // Validasi 2: Pastikan currentTime adalah tanggal yang valid
    const parsedCurrentTime = new Date(currentTime);
    if (isNaN(parsedCurrentTime.getTime())) {
      return res.status(400).json({
        message: "currentTime harus berupa tanggal yang valid",
      });
    }

    // Cari PurchaseOrder berdasarkan Erp
    const PODB = await PurchaseOrder.findOne({
      Erp: Erp?.trim()?.toUpperCase(),
    });

    if (!PODB) {
      return res.status(404).json({
        message: "PurchaseOrder tidak ditemukan",
      });
    }

    //Validasi 3: Pastikan ada item yang belum selesai
    const incompleteItems = PODB.items.filter(
      (item) => (item.request || 0) - (item.received || 0) !== 0
    );

    if (incompleteItems.length === 0) {
      return res.status(400).json({
        message: "Semua item sudah selesai (received sama dengan request)",
      });
    }

    // Update InventoryRefrensi untuk setiap item yang belum selesai
    const updateInventoryPromises = incompleteItems.map(async (item) => {
      const difference = (item.request || 0) - (item.received || 0);
      if (difference > 1) {
        // Pastikan SKU ada di InventoryRefrensi
        const inventoryItem = await InventoryRefrensi.findOne({
          sku: item.sku,
        });
        if (!inventoryItem) {
          throw new Error(
            `SKU ${item.sku} tidak ditemukan di InventoryRefrensi`
          );
        }

        // stack trace
        await stackTracingSku(item._id, req.user._id, "Completed All PO");

        // Update item di PurchaseOrder
        item.tanggalTerpenuhi = parsedCurrentTime;
        item.received = item.request;
      }
    });

    // Tunggu semua update InventoryRefrensi selesai
    const results = await Promise.allSettled(updateInventoryPromises);

    // Periksa apakah ada error selama update InventoryRefrensi
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason.message);
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Gagal mengupdate beberapa item di InventoryRefrensi",
        errors,
      });
    }

    // Update status PurchaseOrder menjadi "terpenuhi"
    PODB.status = "terpenuhi";

    // Set dipenuhiOleh dengan username pengguna yang login
    PODB.dipenuhiOleh = currentUser.username;

    // Simpan perubahan ke PurchaseOrder
    await PODB.save();

    return res.status(200).json({
      message:
        "Berhasil menyelesaikan semua item dalam PurchaseOrder dan mengupdate InventoryRefrensi",
      data: PODB,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal menyelesaikan PurchaseOrder",
      error: error.message,
    });
  }
});

router.post("/scanBarcode", async (req, res) => {
  try {
    const { Erp, barcode } = req.body;

    // Dapatkan user yang sedang login
    const currentLoginUserId = req.user.userId;
    const currentUser = await UserRefrensi.findOne({
      _id: currentLoginUserId,
    }).select("username");

    if (!currentUser) {
      return res.status(400).json({
        message: "User tidak ditemukan",
      });
    }

    const PODB = await PurchaseOrder.findOne({ Erp });
    if (!PODB) {
      return res.status(404).json({
        message: "PurchaseOrder tidak ditemukan",
      });
    }

    const item = PODB.items.find((item) => {
      return item.barcodeItem == barcode;
    });
    if (!item) {
      return res.status(404).json({
        message: "barcode tidak ditemukan pada PO ini",
      });
    }

    //menambah receive
    if (item.received == item.request) {
      if (item.received + 1 == item.request) {
        item.tanggalTerpenuhi = new Date();
      }
      item.received += 1;

      // Periksa apakah semua item telah diterima
      const allItemsCompleted = PODB.items.every(
        (item) => item.received >= item.request
      );

      // Jika semua item telah diterima, set PO sebagai terpenuhi dan catat siapa yang memenuhinya
      if (allItemsCompleted && !PODB.dipenuhiOleh) {
        PODB.status = "terpenuhi";
        PODB.dipenuhiOleh = currentUser.username;
      }

      await PODB.save();
      return res.status(200).json({
        message: "Scan berhasil",
        data: PODB,
      });
    } else {
      return res.status(400).json({
        message: "Po ini sudah diselesaikan",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Gagal menemukan item",
      error: error.message,
    });
  }
});

router.delete("/deletePurchaseOrder/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    await PurchaseOrder.findByIdAndDelete(orderId);
    return res.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal menghapus Purchase order",
      error: error.message,
    });
  }
});

// Tambahkan endpoint untuk mendapatkan Purchase Order berdasarkan status
router.get("/getPurchaseOrderByStatus", async (req, res) => {
  try {
    console.log("awpldapdwpdldpw");
    const { status, limit = 20, page = 1, search } = req.query;
    const skip = (page - 1) * limit;

    // Filter awal
    let filter = {};

    // Filter berdasarkan pencarian
    if (search) {
      filter.$or = [
        { Erp: { $regex: search, $options: "i" } },
        { plat: { $regex: search, $options: "i" } },
      ];
    }

    const allPurchaseOrders = await PurchaseOrder.find(filter);

    // Filter berdasarkan status - perlu logika khusus karena status completed/pending
    // dihitung berdasarkan items (request vs received)
    const filteredPOs = [];

    for (const po of allPurchaseOrders) {
      let isCompleted = true;

      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          const requested = Number(item.request) || 0;
          const received = Number(item.received) || 0;

          // PO dianggap selesai jika semua item memiliki request == received
          if (requested !== received) {
            isCompleted = false;
            break;
          }
        }
      } else {
        // Jika tidak ada items, anggap sebagai pending
        isCompleted = false;
      }

      if (
        (status === "completed" && isCompleted) ||
        (status === "pending" && !isCompleted) ||
        !status
      ) {
        filteredPOs.push(po);
      }
    }

    // Pagination manual setelah filtering
    const total = filteredPOs.length;
    const paginatedData = filteredPOs.slice(skip, skip + parseInt(limit));

    return res.json({
      message: "berhasil mendapatkan data purchase order",
      data: paginatedData,
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
      .json({ message: "gagal mengambil data purchase order" });
  }
});

export default router;
