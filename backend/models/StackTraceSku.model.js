import mongoose from "mongoose";

const StackTraceSkuSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      ref: "InventoryRefrensi",
      required: true,
    }, // agar bisa membedakan walau sku sama tapi sebenarnya asal yang beda

    lastEditBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRefrensi",
      required: true,
    },
    stackDescription: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["increase", "decrease", "spawn", "other"],
      default: "other",
    },
    prevQuantity: {
      type: Number,
    },

    receivedQuantityTrace: {
      type: Number,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  { timestamps: true }
);

const StackTraceSku = mongoose.model("StackTraceSku", StackTraceSkuSchema);
export default StackTraceSku;
