import mongoose from "mongoose";

// Define Spg Schema
const SpgSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  totalHargaPenjualan: { type: Number, default: 0 },
  totalQuantityPenjualan: { type: Number, default: 0 },
  targetHargaPenjualan: { type: Number },
  targetQuantityPenjualan: { type: Number },
  skuTerjual: [
    {
      _id: false,
      sku: String,
      quantity: { type: Number, default: 0 },
    },
  ],
  isDisabled: { type: Boolean, default: false },
});

// Register SpgRefrensi model
const SpgRefrensi = mongoose.model("spgRefrensi", SpgSchema);

export default SpgRefrensi;
