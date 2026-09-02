import mongoose from "mongoose";

const externalProductReferenceSchema = new mongoose.Schema(
  {
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
      unique: true,
    },
    method: {
      type: String,
      default: "GET",
      enum: ["GET"],
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    searchKey: {
      type: String,
      trim: true,
      default: "",
    },
    pageLimit: {
      type: Number,
      default: 5000,
      min: 1,
      max: 10000,
    },
    x_api_key: {
      type: String,
      default: "",
    },
    lastSyncedAt: {
      type: Date,
    },
    lastSyncSummary: {
      created: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

const ExternalProductReference = mongoose.model(
  "ExternalProductReference",
  externalProductReferenceSchema,
);

export default ExternalProductReference;
