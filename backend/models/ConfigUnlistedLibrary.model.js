import mongoose from "mongoose";

const configUnlistedLibrarySchema = new mongoose.Schema({
  isDefault: {
    type: Boolean,
    default: false,
  },
  inUse: {
    type: Boolean,
    default: true,
  },
  baseEndpoint: {
    type: String,
    required: true,
  },
  getTokenEndpoint: {
    type: String,
    required: true,
  },
  getProductsEndpoint: {
    type: String,
    required: true,
  },
  stringQueries: {
    type: String,
  },
  start_date: {
    type: String,
    default: "2022-06-13",
  },
  end_date: {
    type: String,
    default: "",
  },
  latestToken: {
    type: String,
    required: true,
  },
  configBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  cronInterval: {
    type: Number,
    default: 20,
  },
});

configUnlistedLibrarySchema.pre("save", function (next) {
  if (this.latestToken && this._update && this._update.$setOnInsert) {
    const now = new Date().getTime();
    const createdAt = new Date(this._update.$setOnInsert.createdAt).getTime();
    if (now - createdAt > 31526000000) {
      this.latestToken = undefined;
    }
  }
  next();
});

const ConfigUnlistedLibrary = mongoose.model(
  "ConfigUnlistedLibrary",
  configUnlistedLibrarySchema
);

export default ConfigUnlistedLibrary;
