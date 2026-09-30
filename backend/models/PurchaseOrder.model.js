import mongoose from "mongoose";

const purcahseOrderSchema = new mongoose.Schema(
  {
    Erp: {
      type: String,
      required: true,
      unique: true,
    },
    plat: String,
    dipenuhiOleh: String, //User.username aja
    dibuatOleh: String, //User.username aja
    items: [
      {
        sku: String,
        barcodeItem: String,
        request: {
          type: Number,
          required: true,
          default: 0,
        },
        received: {
          type: Number,
          default: 0,
        },
        keterangan: {
          type: String,
        },
        tanggalTerpenuhi: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

const purchaseOrder = mongoose.model("PurchaseOrder", purcahseOrderSchema);
export default purchaseOrder;
