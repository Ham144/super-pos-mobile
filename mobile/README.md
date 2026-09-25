before build :

tolong jangan ganti lagi app.json | package.json | babel | metro.config dan segala root
karena kalau error sangat sulit,
jangan rusak :
npx expo-doctor sudah 15/15
web juga sudah jalan untuk debugging
bisa build apk sudah

ganti default BASE_URL
"platforms": ["android"]

**ini ga berlaku lagi karena udah prebuild dan ada native module
eas build -p android --profile preview
eas build -p android --profile production
**-----------------------------

//jalankan aplikasi yg udah prebuild begini
npx expo run:android

//untuk build production begini :
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a"
adb install -r app\build\outputs\apk\release\app-release.apk
(jangan jalankan npm run bundlejs sebelum assembleRelease: bundle sudah dibuat otomatis oleh gradle.
 kalau muncul error EXPO_ROUTER_APP_ROOT, reset cache metro:
 npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output ..\tmp.bundle --reset-cache)

//untuk update code langsung tanpa reinstall
eas update --branch production --platform android --message "Tes sinkronisasi final"

cara cara meningkatkan responsifitas terakhir:
"platforms": ["android"]
hapus {
// "react-dom": "18.3.1",
// "react-native-web": "~0.19.10"
}

untuk production web :
npx expo export --platform web

Test kondisi berikut :
Promo, Diskon, voucher ✅
Transaksi Online ✅
Transaksi Offline ✅
Pembelian Qtty Negativ ✅
Ganti Barang Bonus ✅
Void Invoice(Pembatalan) ✅
Printer gagal ✅
Race Condition sync ✅
Menyimpan Customer ✅
Kirim Kwitansi Tertunda ✅
Bill Offline punya outlet lain (atasi pakai fitur perbarui inventory seluruhnya saja di setting)✅

#12-06-2025
[x] simple promo by amount total bukan per satuan (mode: simple_total)
[x] fitur hapus promo di jalan
[x] atur ulang quantity bonus promo di jalan
[x] bug perubahan status, kalau gagal print dan klik cancel kenapa done nya diterusin
(web)

[x]ui mobile double item sku karena kesalahan sorting
[x]ganti struct helper menampilkan sku bukan desc
[x]edit quantity dari /item_library sudah dimatikan sekarang harus dari PO receive
[x]set kwitansi true terlewat
[x]cari kesalahan fungsi aggregate perubahan quantity
[x] kalau outlet nya diganti, kasih peringatan (seseorang mengganti outletmu, setelah sync terkahir kamu akan logout otomatis)
[x] perbaiki masuk bulk upload csv \_id nya
[x] add: config printer harusnya nempel di outlet sebagai array yang bisa dipilih
[x] penyesuaian industri: 
    - rename bukti pembayaran -> INV PEMBELIAN
    - rename invoice bill -> PRINT BILL
[x] perubahan PRINT BILL:
kode invoice == extDoc
SO dibawah kode invoice
[x]perubahan INV PEMBELIAN:
keluarkan SI number

LOC-HH-MM-


update code javascript dan UI tanpa reinstall pakai lib expo-updates
tanpa reinstall : eas update --branch production --message "Perbaikan UI dan logika printer"
atau: npm run patch (set environment=production lalu eas update branch production)
app clone ini: package com.csi.superpos, EAS project @mastermind144/csi-super-pos, channel production.
OTA hanya masuk ke APK dengan runtimeVersion sama (1.0.0). Ganti native module / runtimeVersion = build APK ulang.


note: 
## alur logika outlet mode stateless: 
### jangan pakai syncMobileRoute, buat endpoint baru aja. syncMobileRoute biar untuk outlet mode offline
- di sebelah kiri tampilkan daftar inventory langsung dari GetInventoryByLocationMultiple dengan cara get partial yang terlihat di layar
(optional layer start )
- klik tombol cetak bill: jika kasir  menetapkan diskon maka hanya simpan bill ke db dengan status menunggu konfirmasi approve discount tanpa hit function soap
(optional layer start)
- klik tombol cetak bill: saat tombol cetak bill (customer). jalankan soap SalesOrderAutoPostingShip dan simpan bill ke db untuk tau apakah di gudang ready
- struk customer akan keluar dan diberikan ke customer untuk dibaca
(optional layer start)
- user meminta sku tertentu di hapus/diedit: maka soap GetSalesShipmentLines -> soap WsUndoShipment 
(optional layer end)
- tombol bayar berhasil: ubah status bill done: true, jalankan WsPostInvoiceSO
(optional layer start )
- void: di keesokan hari user ingin semua pembelian sku dalam 1 bill dibatalkan jalankan soap GetSalesShipmentLines -> soapWsUndoShipment 
(optional layer end)