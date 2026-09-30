import mongoose from "mongoose";

//setiap item library diedit promo nya maka akan creat satu ini, ini seperti config aja
const daftarPromoSchema = new mongoose.Schema({
  judulPromo: {
    type: String,
    required: true,
    unique: true,
  },
  skuList: {
    //barang barang yang terhubung
    type: [String],
  },
  authorizedOutlets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
    },
  ],
  quantityBerlaku: {
    //berapa kali promo ini bisa terjadi, setiap kali digunakan orang maka ini decrease -1, (untuk jaga jaga kesalahan logika)
    type: Number,
    required: true,
  },
  berlakuDari: {
    type: Date,
  },
  berlakuHingga: {
    type: Date,
    required: true,
  },
  syaratQuantity: {
    type: Number,
  },
  syaratTotalRp: {
    type: Number,
  },
  skuBarangBonus: {
    type: String,
    required: true,
  },
  quantityBonus: {
    type: Number,
    required: true,
  },
  mode: {
    type: String,
    enum: ["simple_total", "particular"],
    default: "particular",
  },
});

daftarPromoSchema.pre("validate", function (next) {
  if (!this.syaratQuantity && !this.syaratTotalRp) {
    return next(
      new Error("Either syaratQuantity or syaratHarga must be provided.")
    );
  }
  next();
});

const DaftarPromo = new mongoose.model("DaftarPromo", daftarPromoSchema);
export default DaftarPromo;
