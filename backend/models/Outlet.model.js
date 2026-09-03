import mongoose from "mongoose";

//Outlet == pameran
//single
const outletSchema = mongoose.Schema({
  kodeOutlet: {
    //SRNG_JUAL, MG2_JUAL
    type: String,
    required: true,
    unique: true,
  },
  namaOutlet: {
    type: String,
    required: true,
    unique: true,
  }, //sama dengan nama event
  description: String,
  logo: String, //base64 sementara
  jumlahInvoice: {
    //acuan untuk kodeInvoice, pakai $inc mengatasi race condition
    type: Number,
    default: 0,
  },
  pendapatan: {
    type: Number,
    default: 0,
  },
  namaPerusahaan: String,
  alamat: String,
  npwp: String,
  spgList: [mongoose.Schema.Types.ObjectId],
  brandIds: [mongoose.Schema.Types.ObjectId],
  periodeSettlement: {
    //ini untuk mencatat dan mereset 0 jika sudah lewat waktunya: pendapatan outlet, spg, kasir(userInfo),
    type: Number,
    default: 1, //1 hari sekali
  },
  jamSettlement: {
    type: String,
    default: "00:00",
  },
  // daftar SKU yang menampilkan gambar di mobile (bukan wajib punya thumbnail)
  favoritedInventoryIds: [String],
  paymentList: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaymentMethod",
      },
    ],
    default: [],
  },
  printerList: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Printer" }],
  },
  mode: {
    type: String,
    enum: ["stateless", "offline"],
    required: true,
  },
  //akun yang punya akses ke outlet ini
  kasirList: [mongoose.Schema.Types.ObjectId],
  ExternalProductReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExternalProductReference",
    default: null,
  },
});

const Outlet = mongoose.model("Outlet", outletSchema);
export default Outlet;
