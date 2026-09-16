import mongoose from "mongoose";

const pelangganSchema = new mongoose.Schema(
  {
    name: String,
    phone: { type: String, unique: true },
    alamat: String,
  },
  { timestamps: true }
);

const Pelanggan = mongoose.model("Pelanggan", pelangganSchema);
export default Pelanggan;