import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: "Uncategorized",
    },
    fileName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    fileData: {
      type: String, // Menyimpan file sebagai string base64
      required: true,
    },
    fileType: {
      type: String, // Menyimpan MIME type dari file
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model("Document", documentSchema);

export default Document;
