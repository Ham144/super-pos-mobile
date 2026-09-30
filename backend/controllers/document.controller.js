import Document from "../models/Document.model.js";
import mammoth from "mammoth";
import path from "path";
import fs from "fs";

export const uploadDocument = async (req, res) => {
  try {
    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: "No document uploaded" });
    }

    const file = req.files.document;
    const uploadDir = path.join(process.cwd(), "uploads");
    const imagesDir = path.join(uploadDir, "images");

    // Create directories if they don't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    // Save the document file
    const documentPath = path.join(uploadDir, file.name);
    await file.mv(documentPath);

    // Convert .docx to HTML with image extraction
    const result = await mammoth.convertToHtml(
      { path: documentPath },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read();
          const imageName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}.png`;
          const imagePath = path.join(imagesDir, imageName);
            
          await fs.promises.writeFile(imagePath, imageBuffer);

          return {
            src: `/uploads/images/${imageName}`,
          };
        }),
      }
    );

    // Create document record
    const document = new Document({
      title: file.name.replace(".docx", ""),
      content: result.value,
      fileName: file.name,
      uploadedBy: req.userId,
      images: [], // Will be populated with image paths
    });

    await document.save();

    res.status(200).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      message: "Error uploading document",
      error: error.message,
    });
  }
};

export const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .populate("uploadedBy", "username")
      .sort({ createdAt: -1 });

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
};

export const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate(
      "uploadedBy",
      "username"
    );

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
};
