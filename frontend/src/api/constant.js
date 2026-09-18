export const APP_NAME = "CSI SUPER POS";
export const APP_DESC = "Sistem POS by CSI untuk penjualan di outlet dan event besar"

const PROD_URL = "https://internal-pos.mycsi.net";
const DEV_URL = "http://192.168.21.193:3003";

export const NODE_ENV = window.location.hostname.endsWith("pos.mycsi.net")
  ? "production"
  : "development";

export const buildNumber = "1000";

export const BASE_URL = NODE_ENV == "production" ? PROD_URL : DEV_URL;

export const mockPages = [
  {
    originalPath: "/dashboard",
    description: "Page untuk melihat dashboard",
  },
  {
    originalPath: "/downloads/apk",
    description: "Page untuk melihat dan mendownload apk build",
  },
  {
    originalPath: "/sales_report",
    description: "Page untuk melihat insight spg, kasir/user",
  },
  {
    originalPath: "/invoices",
    description:
      "Page untuk melihat semua invoice yang telah dibuat dan melakukan void",
  },
  {
    originalPath: "/report_list",
    description: "Page untuk melihat dan menyelesaikan laporan bug dari pengguna",
  },
  {
    originalPath: "/item_library",
    description:
      "Page untuk melihat semua inventori dan mengatur promo, voucher, diskon terhubung",
  },
  {
    originalPath: "/promo",
    description: "Page untuk mengelola dan melihat semua promo yang tersedia",
  },
  {
    originalPath: "/diskon",
    description: "Page untuk mengatur dan melihat semua diskon yang berlaku",
  },
  {
    originalPath: "/voucher",
    description:
      "Page untuk mengelola dan melihat semua voucher yang dapat digunakan",
  },
  {
    originalPath: "/voucher/generation",
    description: "Page untuk generate kode voucher dari logic voucher",
  },
  {
    originalPath: "/brands",
    description: "Page untuk mengelola dan melihat semua brands dari product",
  },
  {
    originalPath: "/purchase_order_create",
    description: "Page untuk Membuat PO dan melihat kemajuan PO",
  },
  {
    originalPath: "/purchase_order_receive",
    description: "Page untuk Memenuhi atau mencari PO yang telah dibuat",
  },
  {
    originalPath: "/customer_list",
    description: "Page untuk melihat customer yang telah tercatat",
  },
  {
    originalPath: "/all_account",
    description: "Page untuk mengelola akun login yang bersifat stateful",
  },
  {
    originalPath: "/spg_reference",
    description: "Page untuk mengelola data SPG yang stateless",
  },
  {
    originalPath: "/outlet_list",
    description: "Page untuk management outlet",
  },
  {
    originalPath: "/payment_method",
    description: "Page untuk membuat/mengedit metode pembayaran",
  },
  {
    originalPath: "/printer_config",
    description: "Page untuk mengelola konfigurasi printer",
  },
  {
    originalPath: "/kwitansi_pembayaran_tertunda",
    description:
      "Page untuk mengatur pengiriman bukti pembayaran yang belum tercetak",
  },
  {
    originalPath: "/profile",
    description:
      "Page untuk melihat akun diri sendiri, reset password, edit data diri",
  },
  {
    originalPath: "/artikel_documentation",
    description: "Page untuk melihat tutorial dan dokumentasi",
  },
  {
    originalPath: "/email_config",
    description: "Page untuk mengatur pengiriman email",
  },
  {
    originalPath: "/whatsapp_config",
    description:
      "Page untuk mengatur token WhatsApp (Fonnte) dan uji kirim pesan",
  },
  {
    originalPath: "/ldap_config",
    description:
      "Page untuk mengatur koneksi LDAP / Active Directory dan uji bind kredensial",
  },
  {
    originalPath: "/stack_trace",
    description: "Page untuk mendownload data perubahan detail SKU",
  },
  {
    originalPath: "/about",
    description: "Page informasi tentang CSI SUPER POS",
  },
];

export const mockBackend = [
  {
    originalPath: "/api/v1/auth/login",
    description: "API untuk login ke aplikasi web",
  },
  {
    originalPath: "/api/v1/auth/createNewUser",
    description: "API untuk membuat pengguna baru dengan role tertentu",
  },
  {
    originalPath: "/api/v1/auth/updateUser",
    description: "API untuk memperbarui data pengguna",
  },
  {
    originalPath: "/api/v1/auth/getUserInfo",
    description: "API untuk mendapatkan informasi dasar dirinya sendiri",
  },
  {
    originalPath: "/api/v1/auth/getUserInfoComplete",
    description: "API untuk mendapatkan informasi lengkap dirinya sendiri",
  },
  {
    originalPath: "/api/v1/auth/getAllAccount",
    description: "API untuk mendapatkan semua jenis akun yang terdaftar",
  },
  {
    originalPath: "/api/v1/auth/loginMobile",
    description: "API untuk login ke App mobile CSI SUPER POS",
  },
  {
    originalPath: "/api/v1/auth/getUserById/:id",
    description: "API untuk mendapatkan informasi diri sendiri berdasarkan id",
  },

  // Inventory Routes
  {
    originalPath: "/api/v1/inventories/registerSingleInventori",
    description: "API untuk mendaftarkan inventori baru",
  },
  {
    originalPath: "/api/v1/inventories/getAllinventories",
    description: "API untuk mendapatkan semua inventori",
  },
  {
    originalPath: "/api/v1/inventories/updateSingleInventori",
    description: "API untuk mengedit data inventori",
  },
  {
    originalPath: "/api/v1/inventories/updateBulkPrices",
    description: "API untuk mengedit harga inventori secara massal dengan csv",
  },
  {
    originalPath: "/api/v1/inventories/importInventoryCsv",
    description: "API untuk import inventori dari file CSV",
  },
  {
    originalPath: "/api/v1/inventories/disableSingleInventoriToggle",
    description: "API untuk mengaktifkan/menonaktifkan inventori",
  },
  {
    originalPath: "/api/v1/inventories/getInventoryById",
    description: "API untuk mendapatkan detail inventori berdasarkan ID",
  },
  // Purchase Order Routes
  {
    originalPath: "/api/v1/purchaseOrder/importPurchaseOrder",
    description: "API untuk mengimpor purchase order dari file CSV",
  },
  {
    originalPath: "/api/v1/purchaseOrder/createPurchaseOrder",
    description: "API untuk membuat purchase order baru",
  },
  {
    originalPath: "/api/v1/purchaseOrder/getAllPurchaseOrder",
    description: "API untuk mendapatkan semua purchase order",
  },
  {
    originalPath: "/api/v1/purchaseOrder/updatePurchaseOrder",
    description: "API untuk memperbarui purchase order",
  },
  {
    originalPath: "/api/v1/purchaseOrder/deletePurchaseOrder",
    description: "API untuk menghapus purchase order",
  },
  {
    originalPath: "/api/v1/purchaseOrder/scanErp",
    description: "API untuk melihat PO sebelum memenuhi request PO",
  },
  {
    originalPath: "/api/v1/purchaseOrder/manualEditPurchaseOrder",
    description: "API untuk memenuhi PO manual ",
  },
  {
    originalPath: "/api/v1/purchaseOrder/completeAllPurchaseOrder",
    description:
      "API untuk memenuhi semua request yang belum selesai pada satu PO",
  },
  {
    originalPath: "/api/v1/purchaseOrder/scanBarcode",
    description: "API untuk memenuhi PO dengan scan barcode (+1)",
  },

  // Transaction Routes
  {
    originalPath: "/api/v1/transaction/step1",
    description:
      "API untuk transaksi dan mendapatkan diskon promo voucher match(deprecated)",
  },
  {
    originalPath: "/api/v1/transaction/editTransaction",
    description: "API untuk edit transaksi atau konfirmasi (deprecated)",
  },
  {
    originalPath: "/api/v1/transaction/step2",
    description:
      "API untuk memenuhi transaksi dengan voucher, sku, metode pembayaran (deprecated)",
  },
  // Promo Routes
  {
    originalPath: "/api/v1/promo/registerPromo",
    description: "API untuk mendaftarkan promo baru",
  },
  {
    originalPath: "/api/v1/promo/getAllPromo",
    description: "API untuk mendapatkan semua promo",
  },
  {
    originalPath: "/api/v1/promo/updatePromo",
    description: "API untuk mengedit promo",
  },
  {
    originalPath: "/api/v1/promo/getAllPromoByProduct",
    description: "API untuk mendapatkan promo berdasarkan produk",
  },
  {
    originalPath: "/api/v1/promo/importPromoCsv",
    description: "API untuk import promo dari file CSV",
  },

  // Diskon Routes
  {
    originalPath: "/api/v1/diskon/registerDiskon",
    description: "API untuk mendaftarkan diskon baru",
  },
  {
    originalPath: "/api/v1/diskon/getAllDiskon",
    description: "API untuk mendapatkan semua diskon",
  },
  {
    originalPath: "/api/v1/diskon/updateDiskon",
    description: "API untuk mengedit diskon",
  },
  {
    originalPath: "/api/v1/diskon/deleteDiskon",
    description: "API untuk menghapus diskon",
  },
  {
    originalPath: "/api/v1/diskon/getAllDiskonByProduct",
    description: "API untuk mendapatkan diskon berdasarkan produk",
  },
  {
    originalPath: "/api/v1/diskon/registerMultiDiskon",
    description: "API untuk import diskon dari file CSV",
  },
  // Voucher Routes
  {
    originalPath: "/api/v1/voucher/addVoucherLogic",
    description: "API untuk mendaftarkan voucher baru",
  },
  {
    originalPath: "/api/v1/voucher/getAllVouchers",
    description: "API untuk mendapatkan semua voucher",
  },
  {
    originalPath: "/api/v1/voucher/editVoucherLogic",
    description: "API untuk mengedit voucher",
  },
  {
    originalPath: "/api/v1/voucher/deleteVoucherLogic",
    description: "API untuk menghapus voucher",
  },
  {
    originalPath: "/api/v1/voucher/getAllVoucherTerblokirByProduct",
    description:
      "API untuk mendapatkan semua voucher yang terblokir berdasarkan produk (deprecated)",
  },
  {
    originalPath: "/api/v1/voucher/getAllGeneratedVoucher",
    description:
      "API untuk mendapatkan semua voucher siap ditukarkan generated by voucher rule",
  },
  {
    originalPath: "/api/v1/voucher/privateVoucherRedemption",
    description: "API untuk redeem voucher generated",
  },
  {
    originalPath: "/api/v1/voucher/publicVoucherConverting",
    description:
      "API untuk generate voucher public voucher jadi private agar bisa digunakan di transaksi",
  },
  {
    originalPath: "/api/v1/voucher/getVoucherGeneratedList",
    description:
      "API untuk melihat semua voucher generated dari transaksi ataupun dari konversi voucher public",
  },
  // SPG Routes
  {
    originalPath: "/api/v1/spg/register",
    description: "API untuk membuat data SPG baru",
  },
  {
    originalPath: "/api/v1/spg/edit",
    description: "API untuk memperbarui data SPG",
  },
  {
    originalPath: "/api/v1/spg/spgList",
    description: "API untuk mendapatkan semua data SPG",
  },
  {
    originalPath: "/api/v1/spg/getSpgById/:id",
    description: "API untuk mendapatkan data SPG berdasarkan id",
  },
  {
    originalPath: "/api/v1/spg/delete",
    description: "API untuk menghapus data SPG",
  },
  {
    originalPath: "/api/v1/dashboard/spg-sales",
    description: "API untuk mendapatkan data penjualan SPG",
  },
  {
    originalPath: "/api/v1/dashboard/ranking-spg-kasir",
    description: "API untuk mendapatkan distribusi SPG dengan kasir",
  },
  {
    originalPath: "/api/v1/dashboard/sales-report",
    description: "API untuk mendapatkan data penjualan berdasarkan filter",
  },
  // Kasir Routes
  {
    originalPath: "/api/v1/kasir/register",
    description: "API untuk membuat data kasir baru",
  },
  {
    originalPath: "/api/v1/kasir/getAllKasir",
    description: "API untuk mendapatkan semua data kasir",
  },
  {
    originalPath: "/api/v1/kasir/update",
    description: "API untuk memperbarui data kasir",
  },
  {
    originalPath: "/api/v1/kasir/deleteKasir",
    description: "API untuk menghapus data kasir",
  },

  // Outlet Routes
  {
    originalPath: "/api/v1/outlet/getAllOutlet",
    description: "API untuk mendapatkan daftar outlet",
  },
  {
    originalPath: "/api/v1/outlet/registerOutlet",
    description: "API untuk membuat outlet baru",
  },
  {
    originalPath: "/api/v1/outlet/edit",
    description: "API untuk memperbarui data outlet",
  },
  {
    originalPath: "/api/v1/outlet/getOutlet",
    description: "API untuk mendapatkan data outlet di mobile",
  },
  {
    originalPath: "/api/v1/outlet/delete",
    description: "API untuk menghapus outlet",
  },
  {
    originalPath: "/api/v1/outlet/assignUserToOutlet",
    description: "API untuk mengubah penugasan user/kasir ke outlet tertentu",
  },
  {
    originalPath: "/api/v1/outlet/assignFavoritedInventoryToOutlet",
    description:
      "API untuk menetapkan SKU yang menampilkan gambar di mobile per outlet",
  },
  {
    originalPath: "/api/v1/outlet/favoritedInventorySkus",
    description: "API untuk mendapatkan daftar SKU favorit gambar per outlet",
  },
  {
    originalPath: "/api/v1/outlet/getOutlet",
    description: "API untuk mendapatkan outlet berdasarkan userId",
  },
  // Brand Routes
  {
    originalPath: "/api/v1/brand/getAllBrands",
    description: "API untuk mendapatkan semua brand dan barang yang terkait",
  },
  {
    originalPath: "/api/v1/brand/registerBrand",
    description: "API untuk mendaftarkan brand baru (deprecated)",
  },

  // Thumbnail Routes
  {
    originalPath: "/api/v1/thumbnail/upload",
    description: "API untuk mengunggah thumbnail produk",
  },
  {
    originalPath: "/api/v1/thumbnail/get",
    description: "API untuk mendapatkan gambar thumbnail",
  },

  // Invoice Routes
  {
    originalPath: "/api/v1/invoice/getAllInvoice",
    description: "API untuk mendapatkan semua invoice",
  },
  {
    originalPath: "/api/v1/invoice/getInvoiceByStatus",
    description:
      "API untuk mendapatkan invoice berdasarkan status (completed, pending, void) dengan pagination dan filter",
  },
  {
    originalPath: "/api/v1/invoice/getInvoiceStats",
    description:
      "API untuk mendapatkan statistik invoice termasuk jumlah, total penjualan, dan item terlaris",
  },
  {
    originalPath: "/api/v1/invoice/debugInvoiceData",
    description: "API untuk debugging data invoice dan informasi tipe data",
  },
  {
    originalPath: "/api/v1/invoice/getInvoiceFilterComplex",
    description:
      "API untuk mendapatkan semua invoice berdasarkan outlet (complex filter for procurement)",
  },
  {
    originalPath: "/api/v1/invoice/voidInvoice",
    description: "API untuk membatalkan invoice yang telah dibayar",
  },
  {
    originalPath: "/api/v1/invoice/markAsPrinted",
    description:
      "API untuk menandai invoice sebagai sudah dicetak kwitansi, tanpa print dan tanpa terkirim email",
  },
  // Customer Routes
  {
    originalPath: "/api/v1/customer/getAllCustomer",
    description: "API untuk mendapatkan semua data pelanggan",
  },
  {
    originalPath: "/api/v1/customer/edit",
    description: "API untuk memperbarui data pelanggan",
  },

  // Unlisted Library Routes
  {
    originalPath: "/api/v1/unlistedLibraries/getUnlistedLibraryByQueries",
    description:
      "API untuk mendapatkan data unlisted library dari pihak tiga (deprecated)",
  },
  {
    originalPath: "/api/v1/unlistedLibraries/getConfigUnlistedSource",
    description: "API untuk mengatur konfigurasi unlisted source pihak tiga",
  },
  {
    originalPath: "/api/v1/unlistedLibraries/updateConfigUnlistedSource",
    description: "API untuk mengedit konfigurasi unlisted source (deprecated)",
  },
  {
    originalPath: "/api/v1/unlistedLibraries/resetConfigUnlistedSource",
    description:
      "API untuk mereset konfigurasi unlisted source to initial system",
  },

  // Sync Mobile Routes
  {
    originalPath: "/api/v1/sinkronisasi/syncDiskonPromoVoucher",
    description: "API untuk sinkronisasi data offline mobile dengan database",
  },

  // Email Routes
  {
    originalPath: "/api/v1/email/sendInvoice",
    description: "API untuk mengirim invoice melalui email",
  },
  {
    originalPath: "/api/v1/email/sendKwitansiEmail",
    description:
      "API untuk mengirim kwitansi pembayaran secara otomatis melalui email",
  },

  // Printer Routes
  {
    originalPath: "/api/v1/printer/printTest",
    description: "API untuk mencetak invoice",
  },
  {
    originalPath: "/api/v1/printer/printSimpanBill",
    description: "API untuk menyimpan dan mencetak bill untuk helper",
  },
  {
    originalPath: "/api/v1/printer/printCetakBillCustomer",
    description: "API untuk mencetak bill untuk customer sebelum pembayaran",
  },
  {
    originalPath: "/api/v1/printer/printCetakKuitansi",
    description:
      "API untuk mencetak dan logic akhir setelah pembayaran dilakukan",
  },
  {
    originalPath: "/api/v1/printer/getAllPrinter",
    description: "API untuk mendapatkan semua konfigurasi printer",
  },
  {
    originalPath: "/api/v1/printer/getDefaultPrinter",
    description: "API untuk mendapatkan printer default",
  },
  {
    originalPath: "/api/v1/printer/createPrinter",
    description: "API untuk membuat konfigurasi printer baru",
  },
  {
    originalPath: "/api/v1/printer/updatePrinter/:id",
    description: "API untuk memperbarui konfigurasi printer",
  },
  {
    originalPath: "/api/v1/printer/deletePrinter/:id",
    description: "API untuk menghapus konfigurasi printer",
  },
  {
    originalPath: "/api/v1/printer/setDefaultPrinter/:id",
    description: "API untuk mengubah printer default",
  },

  // Payment Routes
  {
    originalPath: "/api/v1/payment/payment/bca",
    description: "API untuk pembayaran melalui BCA (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/bni",
    description: "API untuk pembayaran melalui BNI (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/mandiri",
    description: "API untuk pembayaran melalui Mandiri (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/bri",
    description: "API untuk pembayaran melalui BRI (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/gopay",
    description: "API untuk pembayaran melalui GoPay (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/dana",
    description: "API untuk pembayaran melalui Dana (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/ovo",
    description: "API untuk pembayaran melalui OVO (no used)",
  },
  {
    originalPath: "/api/v1/payment/payment/shopeepay",
    description: "API untuk pembayaran melalui ShopeePay (no used)",
  },
  // Inventory Stats Routes
  {
    originalPath: "/api/v1/inventory/getInventoryStats",
    description:
      "API untuk mendapatkan statistik inventory termasuk jumlah stok, nilai total, dan item stok kosong/menipis",
  },
  {
    originalPath: "/api/v1/inventory/searchInventoryByStockCategory",
    description:
      "API untuk mencari inventory berdasarkan kategori stok (kosong, menipis, normal) dengan pagination dan filter",
  },
  // Purchase Order Status Routes
  {
    originalPath: "/api/v1/purchaseOrder/getPurchaseOrderByStatus",
    description:
      "API untuk mendapatkan purchase order berdasarkan status (completed, pending) dengan pagination dan filter",
  },
  // Payment Method Routes
  {
    originalPath: "/api/v1/paymentMethod/getAllPaymentMethod",
    description: "API untuk mendapatkan semua metode pembayaran",
  },
  {
    originalPath: "/api/v1/paymentMethod/createPaymentMethod",
    description: "API untuk membuat metode pembayaran baru",
  },
  {
    originalPath: "/api/v1/paymentMethod/deletePaymentMethod",
    description: "API untuk menghapus metode pembayaran",
  },
  {
    originalPath: "/api/v1/paymentMethod/togglePaymentMethodStatus",
    description: "API untuk disable/enable metode pembayaran unt",
  },
  // Document Routes
  {
    originalPath: "/api/v1/document/upload",
    description: "API untuk mengunggah artikel dokumentasi",
  },
  // Settlement Routes
  {
    originalPath: "/api/v1/settlement/printSettlementMobile",
    description: "API untuk mencetak settlement report",
  },
  // Brand Routes
  {
    originalPath: "/api/v1/outlet/linkBrandToOutlet",
    description: "API untuk mengubah brand yang terhubung ke outlet",
  },
  {
    originalPath: "/api/v1/outlet/getBrandByOutletId",
    description: "API untuk mendapatkan brand yang terhubung ke outlet",
  },
  {
    originalPath: "/api/v1/inventory/getAllinventoriesMobile",
    description: "API khusus Mobiel tuk mendapatkan initial inventory by brand",
  },
  {
    originalPath: "/api/v1/saleReport/rangking-payment-method",
    description:
      "API untuk mendapatkan data penjualan berdasarkan metode pembayaran",
  },
];

export const PurchaseOrderTemplate = [
  [
    "PO-001",
    "B1234CD",
    "14ESK,5,,keta,12DARTWINO,2,BARC789,adawd,12DSETWINO,5,BARC123,2eqw3rwer,12DSFTWINO,2,BARC789,q3eqafrx,12DWF,5,BARC123,aw3derader,12ELK,2,BARC789,adaw3r",
  ],
  ["PO-002", "B5678EF", "12DARTWINO,2,,adawd"],
  ["PO-003", "B1234CD", "12DSETWINO,5,,2eqw3rwer"],
  ["po4", "B5678EF", "12DSFTWINO,2,,q3eqafrx"],
  ["po5", "B1234CD", "12DWF,5,,aw3derader"],
  ["po6", "B5678EF", "12ELK,2,,adaw3r"],
];

// used by modalCreateNewAccount (default deny for new app users)
export const blockedAccess = [
  "/item_library",
  "/promo",
  "/diskon",
  "/voucher",
  "/voucher/generation",
  "/brands",
  "/all_account",
  "/outlet_list",
  "/payment_method",
  "/printer_config",
  "/email_config",
  "/whatsapp_config",
  "/ldap_config",
  "/report_list",
  "/stack_trace",
];
