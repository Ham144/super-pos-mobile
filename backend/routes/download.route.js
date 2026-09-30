import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

const __dirname = path.resolve();

const router = Router();
// Endpoint: Daftar APK tersedia
router.post("/apk/list", (req, res) => {
  const apkDir = path.join(__dirname, "files");

  fs.readdir(apkDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Gagal membaca direktori" });
    }

    // Filter hanya file .apk dan ambil nama versinya
    const versions = files
      .filter((file) => path.extname(file) === ".apk")
      .map((file) => path.basename(file, ".apk"));

    return res.json({ data: versions });
  });
});
// Endpoint: Download APK berdasarkan versi
router.post("/apk", (req, res) => {
  const { version } = req.body;

  if (!version) {
    return res.status(400).json({ error: "Version tidak boleh kosong" });
  }

  const filePath = path.join(__dirname, "files", `${version}.apk`);
  console.log(filePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File tidak ditemukan" });
  }

  res.download(filePath, `${version}.apk`, (err) => {
    if (err) {
      console.error("Error download:", err);
      return res.status(500).json({ error: "Gagal mengunduh file" });
    }
  });
});

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "files");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Simpan pakai nama file aslinya
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // max 100MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith(".apk")) {
      return cb(new Error("Hanya file APK yang diizinkan"));
    }
    cb(null, true);
  },
});

router.post("/apk/upload", upload.single("apkFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Tidak ada file yang diupload" });
  }

  return res.json({
    message: "Upload berhasil",
    fileName: req.file.filename,
    size: req.file.size,
  });
});

export default router;
