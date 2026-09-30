import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  skuList: { type: [String] },
});

const BrandRefrensi = mongoose.model("Brand", brandSchema);
export default BrandRefrensi;
