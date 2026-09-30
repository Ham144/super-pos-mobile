import mongoose from "mongoose";

//voucher ini adalah voucher yang sedang aktif dan bisa digunakan voucherVode nya di suatu transaksi
//TODO:voucher ini akan terhapus sendiri jika sudah di redeem jadi jangan simpan data penting disini
const generatedVoucherSchema = new mongoose.Schema(
  {
    voucherReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DaftarVoucher",
    },
    privateVoucherCode: {
      //5 digit angka unik rahasia dikirim ke email
      type: String,
      required: true,
    },
    outletList: [String], //outletId, jika kosong semua outlet terima, jika ada maka hanya outlet itu saja yang terima,
    isSend: Boolean,
    email: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

generatedVoucherSchema.index({ privateVoucherCode: 1 }, { unique: true });

const GeneratedVoucher = mongoose.model(
  "GeneratedVoucher",
  generatedVoucherSchema
);
export default GeneratedVoucher;
