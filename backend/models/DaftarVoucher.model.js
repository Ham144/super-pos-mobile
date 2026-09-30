import mongoose from "mongoose";

//voucher adalah logic suatu kode yang di generate oleh backend dan disimpan pada Schema, bisa dipakai di semua transaksi (pengecualian), dan trigernya adalah transaksi yang kena dengan logika voucher terkait

//voucher reference
const daftarVoucherSchema = new mongoose.Schema(
  {
    judulVoucher: {
      type: String,
      required: true,
      unique: true,
    },
    potongan: {
      //fixed
      type: Number,
      required: true,
    },
    tipeSyarat: {
      type: String,
      enum: ["quantity", "totalRp"],
    },
    minimalPembelianQuantity: {
      type: Number,
    },
    minimalPembelianTotalRp: {
      type: Number,
    },
    berlakuDari: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    berlakuHingga: {
      type: Date,
      required: true,
    },
    skuList: {
      //item yang bisa triger future voucher
      type: [String],
    },
    quantityTersedia: {
      //decrement bahkan sebelum terjadi redeem (offline)
      type: Number,
      required: true,
    },
    terjadi: {
      //increment saat redeem saja
      type: Number,
      default: 0,
      required: true,
    },
    publicVoucherCode: {
      //contoh judulVoucher28323892 (tak seperti privateVoucherCode yg hanya 5 digit)
      type: String, //voucherCode QR yg bisa share ke umum, untuk generate private voucher code (GeneratedVoucher.model.js) kalau scan
    },
  },
  { timestamps: true }
);

daftarVoucherSchema.index({ publicVoucherCode: 1 }, { unique: true });

const DaftarVoucher = new mongoose.model("DaftarVoucher", daftarVoucherSchema);
export default DaftarVoucher;
