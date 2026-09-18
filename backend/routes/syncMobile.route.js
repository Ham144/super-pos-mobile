import { Router } from "express";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import DaftarPromo from "../models/DaftarPromo.model.js";
import DaftartDiskon from "../models/DaftarDiskon.model.js";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import SpgRefrensi from "../models/SpgRefrensi.model.js";
import Pelanggan from "../models/Pelanggan.model.js";
import Invoice from "../models/invoice.model.js";
import UserRefrensi from "../models/User.model.js";
import Outlet from "../models/Outlet.model.js";
import PaymentMethod from "../models/PaymentMethod.model.js";
import BrandRefrensi from "../models/brand.model.js";
import GeneratedVoucher from "../models/GeneratedVoucher.model.js";
import { stackTracingSku } from "../utils/stackTracingSku.js";
import authenticate from "../middlewares/authenticate.js";

const router = Router();

router.post("/sync-offline-mode", authenticate, async (req, res) => {
  const {
    updatedPromos,
    updateDiskons,
    updateVouchers,
    inventoriesOffline,
    updatedBill,
    updatedSpg,
    updatedOutlet,
    updatedUser,
    deviceLastSyncTime,
    updatedCustomer,
  } = req.body;

  const skuTerjualBuffer = {}; //untuk penyimpanan sementara yg akan dicocokkan dengna sinkorisasi bill currentBill untuk ngambil kodeInvoicenya karena di sinkronisasi inventories tida ada kodeInvoice

  try {
    //pertama paling awal, coba cek terlebih dahulu kecocokan data terutama outlet, jika tidak lagi cocok maka lebih baik login ulang diaplikasi
    console.log("start syncing.......");
    const myOutletInDB = await Outlet.findOne({
      kasirList: {
        $in: [updatedUser?._id],
      },
    });
    if (!myOutletInDB) {
      return res.status(400).json({
        message:
          "Outlet anda tidak ditemukan, sepertinya terhubung ke server yang salah",
        hint: "perbedaan data login",
      });
    }
    if (myOutletInDB.kodeOutlet != updatedOutlet.kodeOutlet) {
      return res.status(400).json({
        message: "Outlet tidak cocok, sepertinya anda telah dipindahkan",
        hint: "perbedaan data login",
      });
    }


    //sinkronisasi inventories ❓
    const inventorySyncPromises = inventoriesOffline?.map(async (inventory) => {
      const inventoryDB = await InventoryRefrensi.findOne({
        sku: inventory.sku,
      });
      if (!inventoryDB) {
        console.log("inventory tidak ditemukan", inventory);
        return;
      }
      // const quantityDiff = inventory.quantityDariDataBase - inventory.quantity;
      const terjualFromApp = inventory.terjualFromApp;
      
      if (!skuTerjualBuffer[inventoryDB.sku]) {
        skuTerjualBuffer[inventoryDB.sku] = [];
      }
      skuTerjualBuffer[inventoryDB.sku].push({
        oldQuantity: inventoryDB.quantity,
        newQuantity: inventoryDB.quantity - terjualFromApp,
      });

      inventoryDB.quantity -= terjualFromApp;
      inventoryDB.terjual += terjualFromApp;

      await inventoryDB.save();
    });

    //sinkronisasai invoice atau billTersimpan
    const billTersimpanSyncPromises = updatedBill?.map(async (bill) => {
      //jika terdapat variabel .isDeleted true maka hapus
      if (bill?.isDeleted) {
        await Invoice.findByIdAndDelete(bill?._id);
        return;
      }

      // buat dulu pelanggan biar dapat id
      let customer;
      if (
        bill?.customer?.email != "" &&
        bill?.customer?.email != null &&
        bill?.customer?.name != null
      ) {
        customer = await Pelanggan.findOneAndUpdate(
          { email: bill?.customer?.email },
          {
            name: bill?.customer?.name,
            phone: bill?.customer?.phone,
            email: bill?.customer?.email,
            alamat: bill?.customer?.alamat,
            jenisKelamin: bill?.customer?.jenisKelamin,
            requestingVoid: bill?.requestingVoid,
            vouchers: bill?.futureVoucher
              ? bill?.futureVoucher?.map((v) => v._id)
              : null,
          },
          { upsert: true, new: true },
        );
      }
      const invoiceDB = await Invoice.findById(bill?._id);
      //bill terkait sudah sync
      if (invoiceDB) {
        const kodeKasir = invoiceDB?.kodeInvoice?.slice(2, 5);

        // Modif kasir
        const kasirDB = await UserRefrensi.findOne({ kodeKasir: kodeKasir });
        if (kasirDB) {
          // Hanya jika ada data penjualan baru
          if (
            bill?.totalHargaPenjualanFromApp ||
            bill?.totalQuantityPenjualanFromApp
          ) {
            kasirDB.totalHargaPenjualan += Number(
              bill?.totalHargaPenjualanFromApp || 0,
            );
            kasirDB.totalQuantityPenjualan += Number(
              bill?.totalQuantityPenjualanFromApp || 0,
            );
            await kasirDB.save();
          }
        } else {
          console.log("kasir tidak ditemukan");
        }

        // Modif invoice yang sudah ada
        await Invoice.findByIdAndUpdate(bill?._id, {
          $set: {
            currentBill: Array.isArray(bill.currentBill)
              ? bill.currentBill.map((currentBill) => ({
                  RpHargaDasar: currentBill?.RpHargaDasar,
                  description: currentBill?.description ?? "",
                  quantity: currentBill?.quantity ?? 0,
                  sku: currentBill?.sku ?? "",
                  totalRp: currentBill?.totalRp,
                  limitQuantity: currentBill?.limitQuantity ?? 0,
                  catatan: currentBill?.catatan || "",
                  kodeInvoice: currentBill?.kodeInvoice,
                }))
              : [],
            spg: typeof bill?.spg === "object" ? bill?.spg._id : bill?.spg,
            salesPerson: bill?.salesPerson,
            customer: customer?.email,
            total: bill.total != 0 ? bill.total : bill.subTotal,
            subTotal: bill?.subTotal,
            diskon: bill.diskon.map((diskon) => {
              return {
                RpHargaDasar: diskon?.RpHargaDasar,
                description: diskon?.description ?? "",
                limitQuantity: diskon?.limitQuantity ?? 0,
                quantity: diskon?.quantity ?? 0,
                sku: diskon?.sku ?? "",
                totalRp: diskon?.totalRp, // Convert to Decimal128
                diskonInfo: {
                  judulDiskon: diskon?.diskonInfo?.judulDiskon ?? "",
                  description: diskon?.diskonInfo?.description ?? "",
                  diskonId: diskon?.diskonInfo?.diskonId ?? "",
                  RpPotonganHarga: diskon?.diskonInfo?.RpPotonganHarga, // Convert to Decimal128
                  percentPotonganHarga:
                    diskon?.diskonInfo?.percentPotonganHarga, // Convert to Decimal128
                },
              };
            }),
            promo: bill.promo.map((promo) => {
              return {
                RpHargaDasar: promo?.RpHargaDasar,
                description: promo?.description ?? "",
                limitQuantity: promo?.limitQuantity ?? 0,
                quantity: promo?.quantity ?? 0,
                sku: promo?.sku ?? "",
                totalRp: promo?.totalRp, // Convert to Decimal128
                promoInfo: {
                  judulPromo: promo?.promoInfo?.judulPromo ?? "",
                  pesan: promo?.promoInfo?.pesan ?? "",
                  quantityBonus: promo?.promoInfo?.quantityBonus ?? 0,
                  promoId: promo?.promoInfo?.promoId ?? "",
                  skuBarangBonus: promo?.promoInfo?.skuBarangBonus ?? "",
                },
              };
            }),
            futureVoucher: bill.futureVoucher.map((voucher) => {
              return {
                RpHargaDasar: voucher?.RpHargaDasar,
                description: voucher?.description ?? "",
                limitQuantity: voucher?.limitQuantity ?? 0,
                quantity: voucher?.quantity ?? 0,
                sku: voucher?.sku ?? "",
                totalRp: voucher?.totalRp,
                voucherInfo: {
                  berlakuDari: voucher?.voucherInfo?.berlakuDari,
                  berlakuHingga: voucher?.voucherInfo?.berlakuHingga,
                  judulVoucher: voucher?.voucherInfo?.judulVoucher ?? "",
                  minimalPembelianQuantity:
                    voucher?.voucherInfo?.minimalPembelianQuantity ?? 0,
                  minimalPembelianTotalRp:
                    voucher?.voucherInfo?.minimalPembelianTotalRp,
                  voucherId: voucher?.voucherInfo?.voucherId,
                  potongan: voucher?.voucherInfo?.potongan,
                  tipe: voucher?.voucherInfo?.tipe ?? "",
                },
              };
            }),
            implementedVoucher: bill?.implementedVoucher,
            isPrintedCustomerBilling: bill?.isPrintedCustomerBilling,
            // A delayed mobile sync must never revert a payment confirmed by Midtrans.
            done: invoiceDB.done === true || bill?.done === true,
            isPrintedKwitansi: bill?.isPrintedKwitansi,
            requestingVoid: bill?.requestingVoid,
          },
        });
      } else {
        // Jika invoice baru (tidak ditemukan di DB)

        // Ambil data outlet untuk mendapatkan INCcodeInvoice
        const kodeOutlet = bill?.kodeInvoice?.slice(0, 2);
        const outletDB = await Outlet.findOne({ kodeOutlet: kodeOutlet });

        if (outletDB) {
          // Buat kodeInvoice baru dengan menggabungkan format awal + INCcodeInvoice dari outlet
          // Gunakan findOneAndUpdate dengan $inc untuk mencegah race condition
          const outletUpdate = await Outlet.findOneAndUpdate(
            { kodeOutlet: kodeOutlet },
            { $inc: { jumlahInvoice: 1 } },
            { new: true },
          );

          const INCcodeInvoice = outletUpdate.jumlahInvoice;

          // Pastikan kodeInvoice hanya terdiri dari prefix (kodeOutlet+kodeKasir+tanggal) tanpa nomor urut yang mungkin sudah ada
          // Format: 01KAR2503 (kodeOutlet+kodeKasir+tanggal) + 00001 (nomor urut)
          // Extract kodeOutlet (2 char) + kodeKasir (3 char) + tanggal (4 char) = total 9 karakter
          let kodeInvoicePrefix = bill.kodeInvoice;
          if (kodeInvoicePrefix.length > 9) {
            kodeInvoicePrefix = kodeInvoicePrefix.substring(0, 9);
          }

          const newKodeInvoice =
            kodeInvoicePrefix + INCcodeInvoice.toString().padStart(5, "0");
          console.log("Membuat kode invoice baru:", newKodeInvoice);

          // Cek apakah kode invoice sudah digunakan
          const invoiceWithSameCode = await Invoice.findOne({
            kodeInvoice: newKodeInvoice,
          });

          if (invoiceWithSameCode) {
            // Jika kode sudah digunakan, naikkan lagi jumlah invoice di outlet
            console.log(
              "Kode invoice duplikat terdeteksi, mencoba dengan nilai baru",
            );
            const outletUpdateRetry = await Outlet.findOneAndUpdate(
              { kodeOutlet: kodeOutlet },
              { $inc: { jumlahInvoice: 1 } },
              { new: true },
            );

            const newINCcodeInvoice = outletUpdateRetry.jumlahInvoice;
            const retryKodeInvoice =
              kodeInvoicePrefix + newINCcodeInvoice.toString().padStart(5, "0");
            console.log("Mencoba dengan kode invoice baru:", retryKodeInvoice);

            // Buat invoice baru dengan kode yang sudah diperbaiki
            await Invoice.create({
              _id: bill?._id,
              kodeInvoice: retryKodeInvoice,
              currentBill: Array.isArray(bill.currentBill)
                ? bill.currentBill.map((currentBill) => ({
                    RpHargaDasar: currentBill?.RpHargaDasar,
                    description: currentBill?.description ?? "",
                    quantity: currentBill?.quantity ?? 0,
                    sku: currentBill?.sku ?? "",
                    totalRp: currentBill?.totalRp,
                    limitQuantity: currentBill?.limitQuantity ?? 0,
                    catatan: currentBill?.catatan || "",
                    kodeInvoice: currentBill?.kodeInvoice,
                  }))
                : [],
              spg: bill?.spg?._id ? bill?.spg?._id : bill?.spg,
              salesPerson: bill?.salesPerson,
              total: bill.total != 0 ? bill.total : bill.subTotal,
              subTotal: bill?.subTotal,
              diskon: bill.diskon.map((diskon) => {
                return {
                  RpHargaDasar: diskon?.RpHargaDasar,
                  description: diskon?.description ?? "",
                  limitQuantity: diskon?.limitQuantity ?? 0,
                  quantity: diskon?.quantity ?? 0,
                  sku: diskon?.sku ?? "",
                  totalRp: diskon?.totalRp,
                  diskonInfo: {
                    judulDiskon: diskon?.diskonInfo?.judulDiskon ?? "",
                    description: diskon?.diskonInfo?.description ?? "",
                    diskonId: diskon?.diskonInfo?.diskonId ?? "",
                    RpPotonganHarga: diskon?.diskonInfo?.RpPotonganHarga,
                    percentPotonganHarga:
                      diskon?.diskonInfo?.percentPotonganHarga,
                  },
                };
              }),
              promo: bill.promo.map((promo) => {
                return {
                  RpHargaDasar: promo?.RpHargaDasar,
                  description: promo?.description ?? "",
                  limitQuantity: promo?.limitQuantity ?? 0,
                  quantity: promo?.quantity ?? 0,
                  sku: promo?.sku ?? "",
                  totalRp: promo?.totalRp,
                  promoInfo: {
                    judulPromo: promo?.promoInfo?.judulPromo ?? "",
                    pesan: promo?.promoInfo?.pesan ?? "",
                    quantityBonus: promo?.promoInfo?.quantityBonus ?? 0,
                    promoId: promo?.promoInfo?.promoId ?? "",
                    skuBarangBonus: promo?.promoInfo?.skuBarangBonus ?? "",
                  },
                };
              }),
              futureVoucher: bill.futureVoucher.map((voucher) => {
                return {
                  RpHargaDasar: voucher?.RpHargaDasar,
                  description: voucher?.description ?? "",
                  limitQuantity: voucher?.limitQuantity ?? 0,
                  quantity: voucher?.quantity ?? 0,
                  sku: voucher?.sku ?? "",
                  totalRp: voucher?.totalRp,
                  voucherInfo: {
                    berlakuDari: voucher?.voucherInfo?.berlakuDari,
                    berlakuHingga: voucher?.voucherInfo?.berlakuHingga,
                    judulVoucher: voucher?.voucherInfo?.judulVoucher ?? "",
                    minimalPembelianQuantity:
                      voucher?.voucherInfo?.minimalPembelianQuantity ?? 0,
                    minimalPembelianTotalRp:
                      voucher?.voucherInfo?.minimalPembelianTotalRp,
                    voucherId: voucher?.voucherInfo?.voucherId,
                    potongan: voucher?.voucherInfo?.potongan,
                    tipe: voucher?.voucherInfo?.tipe ?? "",
                  },
                };
              }),
              isPrintedCustomerBilling: bill?.isPrintedCustomerBilling,
              done: bill?.done,
              isPrintedKwitansi: bill?.isPrintedKwitansi,
              requestingVoid: bill?.requestingVoid,
              tanggalBayar: bill?.tanggalBayar,
              paymentMethod: bill?.paymentMethod,
              nomorTransaksi: bill?.nomorTransaksi,
            });
          } else {
            // Kasus normal (tidak ada duplikat)
            // Buat invoice baru dengan kode yang dibuat
            await Invoice.create({
              _id: bill?._id,
              kodeInvoice: newKodeInvoice,
              currentBill: Array.isArray(bill.currentBill)
                ? bill.currentBill.map((currentBill) => ({
                    RpHargaDasar: currentBill?.RpHargaDasar,
                    description: currentBill?.description ?? "",
                    quantity: currentBill?.quantity ?? 0,
                    sku: currentBill?.sku ?? "",
                    totalRp: currentBill?.totalRp,
                    limitQuantity: currentBill?.limitQuantity ?? 0,
                    catatan: currentBill?.catatan || "",
                    kodeInvoice: currentBill?.kodeInvoice,
                  }))
                : [],
              spg: bill?.spg?._id ? bill?.spg?._id : bill?.spg?.toString(),
              salesPerson: bill?.salesPerson,
              total: bill.total != 0 ? bill.total : bill.subTotal,
              subTotal: bill?.subTotal,
              diskon: bill.diskon.map((diskon) => {
                return {
                  RpHargaDasar: diskon?.RpHargaDasar,
                  description: diskon?.description ?? "",
                  limitQuantity: diskon?.limitQuantity ?? 0,
                  quantity: diskon?.quantity ?? 0,
                  sku: diskon?.sku ?? "",
                  totalRp: diskon?.totalRp,
                  diskonInfo: {
                    judulDiskon: diskon?.diskonInfo?.judulDiskon ?? "",
                    description: diskon?.diskonInfo?.description ?? "",
                    diskonId: diskon?.diskonInfo?.diskonId ?? "",
                    RpPotonganHarga: diskon?.diskonInfo?.RpPotonganHarga,
                    percentPotonganHarga:
                      diskon?.diskonInfo?.percentPotonganHarga,
                  },
                };
              }),
              promo: bill.promo.map((promo) => {
                return {
                  RpHargaDasar: promo?.RpHargaDasar,
                  description: promo?.description ?? "",
                  limitQuantity: promo?.limitQuantity ?? 0,
                  quantity: promo?.quantity ?? 0,
                  sku: promo?.sku ?? "",
                  totalRp: promo?.totalRp,
                  promoInfo: {
                    judulPromo: promo?.promoInfo?.judulPromo ?? "",
                    pesan: promo?.promoInfo?.pesan ?? "",
                    quantityBonus: promo?.promoInfo?.quantityBonus ?? 0,
                    promoId: promo?.promoInfo?.promoId ?? "",
                    skuBarangBonus: promo?.promoInfo?.skuBarangBonus ?? "",
                  },
                };
              }),
              futureVoucher: bill.futureVoucher.map((voucher) => {
                return {
                  RpHargaDasar: voucher?.RpHargaDasar,
                  description: voucher?.description ?? "",
                  limitQuantity: voucher?.limitQuantity ?? 0,
                  quantity: voucher?.quantity ?? 0,
                  sku: voucher?.sku ?? "",
                  totalRp: voucher?.totalRp,
                  voucherInfo: {
                    berlakuDari: voucher?.voucherInfo?.berlakuDari,
                    berlakuHingga: voucher?.voucherInfo?.berlakuHingga,
                    judulVoucher: voucher?.voucherInfo?.judulVoucher ?? "",
                    minimalPembelianQuantity:
                      voucher?.voucherInfo?.minimalPembelianQuantity ?? 0,
                    minimalPembelianTotalRp:
                      voucher?.voucherInfo?.minimalPembelianTotalRp,
                    voucherId: voucher?.voucherInfo?.voucherId,
                    potongan: voucher?.voucherInfo?.potongan,
                    tipe: voucher?.voucherInfo?.tipe ?? "",
                  },
                };
              }),
              isPrintedCustomerBilling: bill?.isPrintedCustomerBilling,
              done: bill?.done,
              isPrintedKwitansi: bill?.isPrintedKwitansi,
              requestingVoid: bill?.requestingVoid,
              tanggalBayar: bill?.tanggalBayar,
              paymentMethod: bill?.paymentMethod,
              nomorTransaksi: bill?.nomorTransaksi,
            });
          }

          // Update Customer/pelanggan
          if (bill?.customer?.email) {
            await Pelanggan.findOneAndUpdate(
              { email: bill?.customer?.email },
              {
                $set: {
                  name: updatedCustomer?.name,
                  phone: bill?.customer?.phone,
                  email: bill?.customer?.email,
                  jenisKelamin: bill?.customer?.jenisKelamin,
                  alamat: bill?.customer?.alamat,
                },
              },
              { upsert: true, new: true },
            );
          }

          // Update outlet stats untuk kedua kasus (dengan atau tanpa duplikat)
          outletDB.pendapatan += bill?.total || bill?.subTotal;
          await outletDB.save();

          // Update kasir/user - Hanya jika ada data penjualan
          const kodeKasir = bill?.kodeInvoice?.slice(2, 5);
          const kasirDB = await UserRefrensi.findOne({ kodeKasir: kodeKasir });
          if (kasirDB) {
            if (
              bill?.totalHargaPenjualanFromApp ||
              bill?.totalQuantityPenjualanFromApp
            ) {
              kasirDB.totalHargaPenjualan += Number(
                bill?.totalHargaPenjualanFromApp || 0,
              );
              kasirDB.totalQuantityPenjualan += Number(
                bill?.totalQuantityPenjualanFromApp || 0,
              );
              await kasirDB.save();
            }
          } else {
            console.error("kasir tidak ditemukan untuk invoice baru");
          }
        } else {
          console.error("outlet tidak ditemukan untuk invoice baru");
        }
      }

      //terakhir tracing sku dengan mencocokkan dengan skuTerjualBuffer
      if (Array.isArray(bill?.currentBill)) {
        for (const item of bill.currentBill) {
          const changes = skuTerjualBuffer[item.sku];
          if (changes && changes.length > 0) {
            const { oldQuantity, newQuantity } = changes.shift();
            await stackTracingSku(
              item.sku,
              req?.user?.userId || req?.userId,
              "Sync Mobile: berubah karena sinkronisasi dari mobile",
              "decrease",
              oldQuantity,
              newQuantity,
              bill?._id,
            );
          }
        }
      }
    });

    //sinkronisasi promo
    const promoSyncPromises = updatedPromos?.map(async (promo) => {
      const promoDB = await DaftarPromo.findById(promo._id);
      if (!promoDB) {
        console.log("promo not found", promo);
        return;
      }
      // Pastikan quantity tidak negatif
      const quantityDiff = Math.max(
        Number(promo.quantityDariDataBase) - Number(promo.quantityBerlaku),
        0,
      );
      const newQuantity = Math.max(promoDB?.quantityBerlaku - quantityDiff, 0);

      await DaftarPromo.updateOne(
        { _id: promo._id },
        { $set: { quantityBerlaku: newQuantity } },
      );
    });

    //sinkronisasi diskon
    const diskonSyncPromises = updateDiskons?.map(async (diskon) => {
      const diskonDB = await DaftartDiskon.findById(diskon._id);
      if (!diskonDB) {
        console.log("Diskon not found", diskon);
        return;
      }
      // Pastikan quantity tidak negatif
      const quantityDiff = Math.max(
        diskon.quantityDariDataBase - diskon.quantityTersedia,
        0,
      );
      const newQuantity = Math.max(diskonDB.quantityTersedia - quantityDiff, 0);

      await DaftartDiskon.updateOne(
        { _id: diskon._id },
        { $set: { quantityTersedia: newQuantity } },
      );
    });

    //mungkin ada bug ⚠️
    //voucher refrensi langsung berubah saat implemented, bukan saat redeem
    const voucherSyncPromises = updateVouchers?.map(async (voucher) => {
      //voucher refrensi
      const voucherDB = await DaftarVoucher.findById(voucher._id);
      if (!voucherDB) {
        console.log("Voucher not found", voucher);
        return;
      }

      const quantityDiff =
        voucher?.quantityDariDataBase - voucher?.quantityTersedia;
      const newQuantity = Math.max(
        voucherDB?.quantityTersedia - quantityDiff,
        0,
      );

      if (quantityDiff > 0) {
        //update voucher refrensi DB
        await DaftarVoucher.updateOne(
          { _id: voucher._id },
          { $set: { quantityTersedia: newQuantity } },
        );

        //cari updated bill yang baru untuk mengambil email customer
        const matchedBill = updatedBill?.find((bill) => {
          // Pastikan futureVoucher ada dan merupakan array
          if (!bill?.futureVoucher || !Array.isArray(bill?.futureVoucher))
            return false;

          // Periksa apakah ada voucher dengan ID yang cocok dalam futureVoucher
          return bill.futureVoucher.some((v) => {
            // Cek object voucherInfo yang memiliki voucherId
            if (v?.voucherInfo?.voucherId === voucher._id) return true;
            // Cek jika v._id sama dengan voucher._id
            if (v?._id === voucher._id) return true;
            // Jika v adalah string ID, bandingkan langsung
            if (typeof v === "string" && v === voucher._id) return true;
            return false;
          });
        });
        
        // Hanya buat GeneratedVoucher jika matchedBill dan email customer tersedia
        if (matchedBill?.customer?.email) {
          //kalau ada perbedaan quantity, maka generate generatedVoucher
          const random5Char = Math.random().toString(36).substring(2, 7);

          try {
            // Pastikan voucherId dan privateVoucherCode tidak null
            if (!voucher._id) {
              console.log("VoucherId tidak tersedia");
              return;
            }

            // Cek apakah sudah ada GeneratedVoucher untuk voucher ini dan email customer
            const existingVoucher = await GeneratedVoucher.findOne({
              voucherId: voucher._id,
              email: matchedBill.customer.email,
            });

            if (existingVoucher) {
              console.log(
                "GeneratedVoucher sudah ada untuk voucher dan customer ini:",
                existingVoucher._id,
              );
              return;
            }

            // Buat voucher baru dengan penanganan error yang lebih baik
            const generatedVoucher = {
              voucherId: voucher._id,
              privateVoucherCode: random5Char,
              outletList: [],
              isSend: false,
              email: matchedBill.customer.email,
            };

            // Pastikan tidak ada properti voucherCode yang null
            const newVoucher = await GeneratedVoucher.create(generatedVoucher);
            console.log(
              "GeneratedVoucher berhasil dibuat dengan ID:",
              newVoucher._id,
              "kode:",
              random5Char,
            );
          } catch (error) {
            console.error(
              "Error saat membuat GeneratedVoucher:",
              error.message,
            );
          }
        } else {
          console.log(
            "Tidak dapat membuat GeneratedVoucher: Email customer tidak tersedia",
            voucher._id,
          );
        }
      }

      return true;
    });

    //sinkronisasai spg ❓
    const spgSyncPromises = updatedSpg?.map(async (singleSpg) => {
      const spgDB = await SpgRefrensi.findById(singleSpg._id);
      if (!spgDB) {
        console.log(singleSpg?.name, " is tidak ditemukan");
        return;
      }

      try {
        if (
          singleSpg.totalHargaPenjualanFromApp > 0 ||
          singleSpg.totalQuantityPenjualanFromApp > 0
        ) {
          // Update total harga and quantity
          await SpgRefrensi.updateOne(
            { _id: singleSpg._id },
            {
              $inc: {
                totalHargaPenjualan:
                  parseInt(singleSpg.totalHargaPenjualanFromApp) || 0,
                totalQuantityPenjualan:
                  parseInt(singleSpg.totalQuantityPenjualanFromApp) || 0,
              },
            },
          );

          // Handle SKU terjual dari skuTerjualFromApp
          if (
            singleSpg.skuTerjualFromApp &&
            singleSpg.skuTerjualFromApp.length > 0
          ) {
            for (const item of singleSpg.skuTerjualFromApp) {
              if (!item.sku || !item.quantity) continue; // Skip jika tidak ada sku atau quantity

              // Konversi quantity ke number dan gunakan 0 jika NaN
              const itemQuantity = Number(item.quantity) || 0;

              const existingSku = await SpgRefrensi.findOne({
                _id: singleSpg._id,
                "skuTerjual.sku": item.sku,
              });

              if (existingSku) {
                // Update existing SKU - selalu increment quantity
                await SpgRefrensi.updateOne(
                  { _id: singleSpg._id, "skuTerjual.sku": item.sku },
                  {
                    $inc: {
                      "skuTerjual.$.quantity": itemQuantity,
                    },
                  },
                );
              } else {
                // Add new SKU - pastikan quantity disimpan
                await SpgRefrensi.updateOne(
                  { _id: singleSpg._id },
                  {
                    $push: {
                      skuTerjual: {
                        sku: item.sku,
                        quantity: itemQuantity,
                      },
                    },
                  },
                );
              }
            }
          }

          // Handle SKU terjual dari skuTerjual langsung jika dikirim dari mobile
          if (singleSpg.skuTerjual && singleSpg.skuTerjual.length > 0) {
            // Dapatkan skuTerjual yang sudah ada di DB untuk perbandingan
            const existingSkuTerjual = spgDB.skuTerjual || [];

            // Proses setiap item dalam skuTerjual yang dikirim
            for (const item of singleSpg.skuTerjual) {
              if (!item.sku) continue; // Skip jika tidak ada sku

              // Jika quantity tidak ada, set nilai default
              const itemQuantity = Number(item.quantity) || 0;

              // Cari apakah sku sudah ada di database
              const existingItem = existingSkuTerjual.find(
                (dbItem) => dbItem.sku === item.sku,
              );

              if (existingItem) {
                // Hitung selisih quantity (hanya increment jika quantity baru > quantity lama)
                const existingQuantity = Number(existingItem.quantity) || 0;
                // Selalu increment dengan quantity baru (tidak perlu membandingkan)
                // Update quantity dengan quantity yang dikirim, bukan selisihnya
                await SpgRefrensi.updateOne(
                  { _id: singleSpg._id, "skuTerjual.sku": item.sku },
                  {
                    $inc: {
                      "skuTerjual.$.quantity": itemQuantity,
                    },
                  },
                );
              } else {
                // Tambahkan item baru jika belum ada di database - pastikan quantity disimpan
                await SpgRefrensi.updateOne(
                  { _id: singleSpg._id },
                  {
                    $push: {
                      skuTerjual: {
                        sku: item.sku,
                        quantity: itemQuantity,
                      },
                    },
                  },
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error saat menyimpan SPG:", singleSpg._id, error);
      }
    });

    //sinkronisasi pendapatan kasir
    let userSyncPromise = null;
    if (updatedUser) {
      userSyncPromise = UserRefrensi.findByIdAndUpdate(
        updatedUser._id,
        {
          $inc: {
            totalHargaPenjualan: updatedUser?.totalHargaPenjualanFromApp || 0,
            totalQuantityPenjualan:
              updatedUser?.totalQuantityPenjualanFromApp || 0,
          },
        },
        { new: true },
      );
    }

    // Pengambilan data langsung dari DB setelah di modifikasi
    await Promise.all(
      [
        ...(inventoriesOffline ? inventorySyncPromises : []),
        ...(updatedPromos ? promoSyncPromises : []),
        ...(updateDiskons ? diskonSyncPromises : []),
        ...(updateVouchers ? voucherSyncPromises : []),
        ...(updatedBill ? billTersimpanSyncPromises : []),
        ...(updatedSpg ? spgSyncPromises : []),
        userSyncPromise,
      ].filter(Boolean),
    )
      .then(async () => {
        //ambil data terbaru setelah update
        const newPromoData = await DaftarPromo.find({
          //sekalian filter promo yg udah kadaluarsa
          berlakuDari: {
            $lte: new Date(),
          },
          berlakuHingga: {
            $gte: new Date(),
          },
          $or: [
            { authorizedOutlets: { $size: 0 } }, // semua outlet
            { authorizedOutlets: { $in: [myOutletInDB?._id] } }, // outlet tertentu
            { authorizedOutlets: { $exists: false } }, // jaga-jaga kalau field-nya null/tidak ada
          ],
        });
        const newDiskonData = await DaftartDiskon.find({
          berlakuDari: {
            $lte: new Date(),
          },
          berlakuHingga: {
            $gte: new Date(),
          },
        });
        const newVoucherData = await DaftarVoucher.find({
          berlakuDari: {
            $lte: new Date(),
          },
          berlakuHingga: {
            $gte: new Date(),
          },
        });
        //filter yang berubah dan yang isDisabled false aj untuk mengurangi response size
        if (!deviceLastSyncTime || isNaN(deviceLastSyncTime)) {
          deviceLastSyncTime = 0; // Atur ke 0 jika null/undefined/tidak valid
        }

        //update outlet
        const newOutletData = await Outlet.findOne({
          kasirList: { $in: [updatedUser?._id] },
        }).select("-logo");

        const favoritedInventorySkus =
          newOutletData?.favoritedInventoryIds?.filter(Boolean) || [];

        const outletSpgIds = newOutletData?.spgList || [];
        const newSpgList = await SpgRefrensi.find({
          isDisabled: { $ne: true },
          _id: { $in: outletSpgIds },
        });
        // id spg yang harus dihapus dari cache mobile
        const activeSpgIds = new Set(newSpgList.map((s) => String(s._id)));
        const mobileSpgIds = (updatedSpg || []).map((s) => String(s._id));
        const removedSpgIds = [
          ...new Set([
            ...outletSpgIds
              .map((id) => String(id))
              .filter((id) => !activeSpgIds.has(id)),
            ...mobileSpgIds.filter((id) => !activeSpgIds.has(id)),
          ]),
        ];

        //proses tanpa perubahan hanya ambil dari DB dan update AsyncStorage
        const newPaymentMethodData = await PaymentMethod.find({});
        if (!newOutletData || !newPaymentMethodData) {
          console.log(
            "newOutletData atau newPaymentMethodData tampaknya belum ada?",
          );
        }

        //kumpulin sku inventory yand dikirim dari mobile
        const queryForInventory = {};
        queryForInventory.isDisabled = { $ne: true };
        //jika outlet tidak punya brandIds maka ambil semua
        const selectedBrand = await BrandRefrensi.find({
          $or: [{ _id: { $in: updatedOutlet?.brandIds } }, { _id: [] }],
        });
        const brandList = selectedBrand.map((brand) => brand.name);
        queryForInventory.brand = { $in: brandList };

        const skuInventory = inventoriesOffline?.map(
          (inventory) => inventory.sku,
        );
        if (skuInventory?.length > 0) {
          queryForInventory.sku = { $in: skuInventory };
        }

        //lastSyncDate (untuk mengambil yang berubah dari cms)
        if (deviceLastSyncTime) {
          // Konversi timestamp ke Date dengan memperhatikan timezone
          const lastSyncDate = new Date(parseInt(deviceLastSyncTime));

          // Set waktu ke awal hari untuk memastikan tidak ada data yang terlewat
          lastSyncDate.setHours(0, 0, 0, 0);

          // Gunakan $gte untuk mengambil data yang diupdate setelah lastSyncDate
          queryForInventory.updatedAt = {
            $gte: lastSyncDate,
          };
        }

        const newInventoryData = await InventoryRefrensi.find(
          queryForInventory,
        ).sort({ updatedAt: -1 });

        const limitedNewCustomerList = await Pelanggan.find()
          .sort({ updatedAt: -1 })
          .limit(50);

        const outletCode = updatedOutlet?.kodeOutlet;
        if (!outletCode) {
          return res.status(400).json({ message: "kodeOutlet tidak valid" });
        }
        const limitedNewBillTersimpan = await Invoice.find({
          kodeInvoice: {
            $regex: `^${outletCode}`,
            $options: "i", // case-insensitive jika perlu
          },
        })
          .sort({ createdAt: -1 })
          .limit(50);

        const newUserInfoData = await UserRefrensi.findById(
          updatedUser?._id,
        ).select(
          "_id username blockedAccess roleName totalHargaPenjualan totalQuantityPenjualan targetHargaPenjualan targetQuantityPenjualan kodeKasir",
        );

        res.status(200).json({
          message: "Sync completed successfully.",
          data: {
            newPromoData,
            newDiskonData,
            newVoucherData,
            newInventoryData,
            newSpgList,
            removedSpgIds,
            limitedNewCustomerList,
            limitedNewBillTersimpan,
            newUserInfoData,
            newOutletData,
            newPaymentMethodData,
            favoritedInventorySkus,
          },
        });
      })
      .catch((error) => {
        res.status(500).json({ message: error.message});
      });
  } catch (error) {
    // Tangani error dan kirimkan pesan yang sesuai
    console.error("Error during sync:", error);
    res.status(500).json({ message: error.message });
  }
});
  

export default router;
