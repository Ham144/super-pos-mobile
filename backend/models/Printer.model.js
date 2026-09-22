import mongoose from "mongoose";

const PrinterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ipPrinter: {
      type: String,
      required: true,
      trim: true,
    },
    tipePrinter: {
      type: String,
      required: true,
      trim: true,
    },
    portPrinter: {
      type: String,
      required: true,
      default: "9100",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const PrinterModel = mongoose.model("Printer", PrinterSchema);

export default PrinterModel;
