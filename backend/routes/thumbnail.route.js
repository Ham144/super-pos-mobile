import { Router } from "express";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import ImteLibraryThumbnail from "../models/itemLibraryThumbnail.model.js";
import multer from "multer";
import { resolveSkuFromReq } from "../utils/resolveSku.js";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan"));
    }
  },
});

const resolveSku = (req) => resolveSkuFromReq(req);

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ message: err.code === "LIMIT_FILE_SIZE" ? "Ukuran file maksimal 10MB" : err.message });
  }
  return res.status(400).json({ message: err.message || "Gagal memproses file" });
};

const uploadThumbnail = async (req, res) => {
  const sku = resolveSku(req);
  if (!sku) {
    return res.status(400).json({ message: "sku diperlukan" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "file gambar diperlukan" });
  }

  try {
    const inventoryDB = await InventoryRefrensi.findOne({ sku });
    if (!inventoryDB) {
      return res
        .status(404)
        .json({ message: "tidak ditemukan item yang akan di attach thumbnail" });
    }

    await ImteLibraryThumbnail.findOneAndUpdate(
      { sku },
      {
        $set: {
          sku,
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({ message: "berhasil upload thumbnail" });
  } catch (error) {
    return res.status(400).json({
      message: "terjadi kesalahan mengupload",
      error: error.message,
    });
  }
};

const getThumbnail = async (req, res) => {
  const sku = resolveSku(req);
  if (!sku) {
    return res.status(400).json({ message: "sku diperlukan" });
  }
  
  try {
    const thumbnailDB = await ImteLibraryThumbnail.findOne({ sku });
    if (!thumbnailDB) {
      return res.status(404).json({ message: "tidak ditemukan thumbnail" });
    }

    const mime = thumbnailDB.mimetype || "image/jpeg";
    const base64 = `data:${mime};base64,${Buffer.from(thumbnailDB.buffer).toString("base64")}`;

    return res.status(200).json({
      message: "thumbnail ditemukan",
      data: {
        base64,
        originalName: thumbnailDB.originalName,
        externalLinkAlternatif: thumbnailDB?.externalLinkAlternatif,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "gagal mengambil thumbnail" });
  }
};

const wrapUpload = (handler) => (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, () => {});
    return handler(req, res);
  });
};

// sku via body/query — aman untuk karakter seperti K-HD1172/99
router.post("/upload", wrapUpload(uploadThumbnail));
router.get("/get", getThumbnail);

// legacy path — wildcard agar SKU dengan "/" tetap utuh
router.post("/upload/*", wrapUpload(uploadThumbnail));
router.get("/get/*", getThumbnail);

export default router;
