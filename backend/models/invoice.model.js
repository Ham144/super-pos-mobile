import mongoose from "mongoose";

// this is bill
const invoiceSchema = new mongoose.Schema(
  {
    _id: {
      //tidak sama dengan kodeInvoice
      type: String,
      required: true,
    },
    kodeInvoice: {
      //01ksr250200000
      type: String,
      required: true,
      unique: true,
    },
    currentBill: [
      //ini maksudnya item, sorry bad naming
      {
        RpHargaDasar: Number,
        RpHargaLowest: Number,
        description: String,
        quantity: Number,
        sku: String,
        totalRp: Number,
        limitQuantity: Number,
        catatan: String,
        priceEdited: Boolean,
        quantityChanged: Boolean,
      },
    ],
    spg: {
      type: String,
    }, //spgId single
    total: {
      type: Number,
      required: true,
      default: "0",
    },
    subTotal: Number,
    diskon: [
      {
        RpHargaDasar: Number,
        description: String,
        limitQuantity: Number,
        quantity: Number,
        sku: String,
        totalRp: Number,
        diskonInfo: {
          judulDiskon: String,
          description: String,
          diskonId: String,
          RpPotonganHarga: Number,
          percentPotonganHarga: Number,
        },
      },
    ],
    promo: [
      {
        RpHargaDasar: Number,
        description: String,
        limitQuantity: Number,
        quantity: Number,
        sku: String,
        totalRp: Number,
        promoInfo: {
          judulPromo: String,
          pesan: String,
          quantityBonus: Number,
          promoId: String,
          skuBarangBonus: String,
        },
      },
    ],
    futureVoucher: [
      {
        RpHargaDasar: Number,
        description: String,
        limitQuantity: Number,
        quantity: Number,
        sku: String,
        totalRp: Number,
        voucherInfo: {
          berlakuDari: Date,
          berlakuHingga: Date,
          judulVoucher: String,
          minimalPembelianQuantity: Number,
          minimalPembelianTotalRp: Number,
          voucherId: String,
          potongan: mongoose.Schema.Types.Decimal128,
          tipe: {
            type: String,
          },
        },
      },
    ],
    implementedVoucher: [
      //ini voucher yg terpasang dari app, oper id aja mengarah ke voucher refrensi nya bukan private/generated voucher krn pasti sudah tidak ada
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DaftarVoucher",
      },
    ],
    isPrintedCustomerBilling: Boolean,
    isPrintedKwitansi: Boolean,
    customer: {
      type: String, //email sebagai fk
    },
    salesPerson: {
      //kasir atau org yg login di mobile
      type: String, //nama aja, kalau spg baru _id
    },
    isPrintedCustomerBilling: Boolean, //sudah cetak billing
    done: Boolean, //sudah bayar
    isVoid: Boolean, //penjualan dibatalkan/void
    requestingVoid: Boolean,
    confirmVoidById: String, //nama id orang yang confirm
    tanggalVoid: Date,
    tanggalBayar: Date, //terjadi kesalahan di mobile, ini dianggap last print bill bukan invoice
    paymentMethod: String, //payment method.method
    nomorTransaksi: String, //nomor transaksi dari mesin edisi
    paymentGateway: {
      provider: String,
      orderId: String,
      attempt: Number,
      status: {
        type: String,
        default: "",
      },
      grossAmount: Number,
      snapToken: String,
      redirectUrl: String,
      transactionId: String,
      paymentType: String,
      transactionStatus: String,
      statusCode: String,
      fraudStatus: String,
      creatingAt: Date,
      transactionTime: Date,
      settlementTime: Date,
      notificationAt: Date,
    },
    // --- outlet mode=stateless NAV bill flow ---
    outlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
    },
    discountApprovalStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    navDocumentNo: String,
    navSalesOrderNo: String,
    navShipmentNo: String,
    navShipments: [
      {
        salesOrderNo: String,
        shipmentNo: String,
        returnValue: String,
        shippedAt: Date,
      },
    ],
    navShipmentLines: [
      {
        documentNo: String,
        lineNo: Number,
        itemNo: String,
        qty: Number,
        location: String,
        uom: String,
        catatan: String,
        type: { type: String },
      },
    ],
    navUndoneLines: [
      {
        documentNo: String,
        lineNo: Number,
        itemNo: String,
      },
    ],
    warehouseReady: Boolean,
    navShipAt: Date,
    navShipReturnValue: String,
    navInvoicedAt: Date,
    navInvoiceReturnValue: String,
    navUndoAt: Date,
    navVoidAt: Date,
  },
  { timestamps: true }
);

// Register Invoice model
const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
