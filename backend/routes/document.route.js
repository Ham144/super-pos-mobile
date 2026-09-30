import Document from "../models/Document.model.js";
import mammoth from "mammoth";
import fs from "fs";
import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import fileUpload from "express-fileupload";

const router = Router();

router.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
  })
);

router.post("/upload", authenticate, async (req, res) => {
  try {
    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: "No document uploaded" });
    }

    const file = req.files.document;
    const category = req.body.category || "Uncategorized";

    if (!file.name.endsWith(".docx")) {
      return res.status(400).json({ message: "Only .docx files are allowed" });
    }

    // Gunakan path sementara dari express-fileupload
    const tempFilePath = file.tempFilePath;

    // Konversi file ke HTML menggunakan mammoth
    const result = await mammoth.convertToHtml({ path: tempFilePath });

    // Baca file sebagai buffer dan convert ke base64
    const fileBuffer = fs.readFileSync(tempFilePath);
    const fileBase64 = fileBuffer.toString("base64");

    // Hapus file sementara setelah digunakan
    fs.unlinkSync(tempFilePath);

    const document = new Document({
      title: file.name.replace(".docx", ""),
      category: category,
      fileName: file.name,
      content: result.value,
      fileData: fileBase64,
      fileType: file.mimetype,
      uploadedBy: req?.body?.username,
    });

    await document.save();

    res.status(200).json({
      message: "Document uploaded successfully",
      document: {
        _id: document._id,
        title: document.title,
        category: document.category,
        fileName: document.fileName,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      message: "Error uploading document",
      error: error.message,
    });
  }
});

router.get("/file/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // Buat data URL untuk file
    const dataUrl = `data:${document.fileType};base64,${document.fileData}`;

    res.status(200).json({
      fileName: document.fileName,
      fileData: dataUrl,
    });
  } catch (error) {
    console.error("Error getting document file:", error);
    res.status(500).json({
      message: "Error getting document file",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const documents = await Document.find()
      .sort({ createdAt: -1 })
      .select("-fileData"); // Exclude fileData to reduce response size

    res.status(200).json({
      documents,
    });
  } catch (error) {
    console.error("Error getting documents:", error);
    res.status(500).json({
      message: "Error getting documents",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).select("-fileData"); // Exclude fileData to reduce response size

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    res.status(200).json({
      document,
    });
  } catch (error) {
    console.error("Error getting document:", error);
    res.status(500).json({
      message: "Error getting document",
      error: error.message,
    });
  }
});

export default router;
