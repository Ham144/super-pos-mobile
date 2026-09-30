import mongoose from "mongoose"


//ini yang berhasil saja
const kwitansiDanHistorySchema = new mongoose.Schema({
    idInvoice: { //detail
        type: String,
        required: true
    },
    totalSemua: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    metodePembayaran: {
        type: String,
        enum: ["bca", "bri", "mandiri", "bni", "tunai", "ovo", "gopay", "dana", "linkaja"],
        required: true
    },
    tanggalTerpenuhi: Date,
    chiperTexts: [String], //bisa lebih dari satu voucher didapat
    salesPerson: String,
    clientEmail: String,
}, { timestamps: true })

const kwitansiDanHistory = mongoose.model('kwitansiDanHistory', kwitansiDanHistorySchema)
export default kwitansiDanHistory