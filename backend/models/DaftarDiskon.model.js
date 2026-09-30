import mongoose from "mongoose";

//diskon tidak ada syarat, diskon diberikan merata dengan implementasi langsung dengan memilih inventoris
const daftartDiskonSchema = new mongoose.Schema({
  judulDiskon: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
  },
  berlakuDari: {
    type: Date,
    required: true
  },
  berlakuHingga: {
    type: Date,
  },
  //logika utama
  RpPotonganHarga: {
    type: mongoose.Schema.Types.Decimal128,
  },
  percentPotonganHarga: {
    type: mongoose.Schema.Types.Decimal128,
  },
  skuTanpaSyarat: { //barang yang terhubung
    type: [String],
  },
  quantityTersedia: {
    type: Number,
    default: 0
  }
});

const DaftartDiskon = mongoose.model("DaftartDiskon", daftartDiskonSchema);
export default DaftartDiskon;
