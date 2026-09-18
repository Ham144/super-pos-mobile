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
npm run bundlejs
cd android > ./gradlew assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk

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
[] kalau outlet nya diganti, kasih peringatan (seseorang mengganti outletmu, setelah sync terkahir kamu akan logout otomatis)
[x] perbaiki masuk bulk upload csv \_id nya
[] add: config printer harusnya nempel di outlet sebagai array yang bisa dipilih

update code javascript dan UI tanpa reinstall pakai lib expo-updates
tanpa reinstall : eas update --branch production --message "Perbaikan UI dan logika printer"
