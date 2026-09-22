import mongoose from "mongoose";

const pelangganSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, required: false },
    name: { type: String, required: true },
    alamat: { type: String, required: false },
  },
  { timestamps: true }
);

const Pelanggan = mongoose.model("Pelanggan", pelangganSchema);
export default Pelanggan;