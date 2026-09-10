import mongoose from "mongoose";

const InventoryRefrensiSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    RpHargaDasar: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    barcodeItem: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    terjual: {
      type: Number,
      default: 0,
    },
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// SKU unik per outlet (bukan global)
InventoryRefrensiSchema.index({ sku: 1, outlet: 1 }, { unique: true });

const InventoryRefrensi = mongoose.model(
  "InventoryRefrensi",
  InventoryRefrensiSchema,
);

export default InventoryRefrensi;
