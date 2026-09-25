import { Router } from "express";
import checkDiskon from "../middlewares/checkDiskon.js";
import checkPromo from "../middlewares/checkPromo.js";
import checkVoucher from "../middlewares/checkVoucher.js";
import InventoryRefrensi from "../models/InventoryRefrensi.model.js";
import Invoice from "../models/invoice.model.js";
import moment from "moment-timezone";
const router = Router();

// router.use(authenticate)

//terima
//kembalikan total setelah potongan diskon + promo, kode invoice, _id invoice
//kembalikan invoice
router.post("/step1", checkDiskon, checkPromo, async (req, res) => {
  const { items, catatan, clientEmail, salesPersonId } = req.body;
  try {
    //pengecekan terakhir (menggagalkan transaksi item)
    await Promise.allSettled(
      items.map(async (item) => {
        const inventory = await InventoryRefrensi.findOne({ sku: item?.sku })

        if (!inventory) {
          req.errors = [
            ...(req.errors || []),
            {
              sku: item.sku,
              pesan: `barang ${item?.description} ${item?.sku} tidak terdaftar`,
            },
          ];
        }

        //cek quantity tersedia
        if (
          inventory.quantity == undefined ||
          inventory.quantity < item.quantity
        ) {
          req.errors = [
            ...(req.errors || []),
            {
              sku: item.sku,
              pesan: `barang ${item?.description} ${item?.sku} quantity stock tidak mencukupi`,
            },
          ];
        }

        //cek isDisabled
        if (inventory.isDisabled) {
          req.errors = [
            ...(req.errors || []),
            {
              sku: item.sku,
              pesan: `barang ${item?.description} ${item?.sku} saat ini disabled, tidak bisa terjual`,
            },
          ];
        }
      })
    );

    //generate kodeInvoice
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = currentDate.getFullYear();
    const timeInLocalZone = moment.tz("Asia/Jakarta"); // Menggunakan zona waktu Jakarta
    const hours = timeInLocalZone.hours();
    const minutes = timeInLocalZone.minutes().toString().padStart(2, "0");
    const random6 = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    const kodeInvoice = `CSI-${day}${month}${year}-${hours}:${minutes}-${random6}`;

    //kumpulkan semua keberhasilan dan kegagalan (buat invoice)
    const newInvoice = new Invoice();
    newInvoice._id = kodeInvoice;
    newInvoice.catatan = catatan;
    newInvoice.salesPerson = salesPersonId;
    newInvoice.clientEmail = clientEmail;

    const failedTransactionsSkus = req?.errors?.map((item) => {
      return item.sku;
    });

    //transaksi sukses save
    await Promise.allSettled(
      items.map(async (item) => {
        if (!failedTransactionsSkus.includes(item?.sku)) {
          //satisfied promo
          const thePromo = req.promo.find((promo) => {
            if (promo.item.sku == item.sku && promo.isPromo) {
              console.log("memenuhi promo", item.sku);
              return promo;
            }
          });

          //satisfied diskon
          const theDiskon = req.diskon.find((diskon) => {
            if (diskon.item.sku == item.sku && diskon.isDiskon) {
              return diskon;
            }
          });

          newInvoice.transaksiSukses = [
            ...(newInvoice.transaksiSukses || []),
            {
              inventory: item.sku,
              quantity: item.quantity,
              //promo
              free: thePromo ? thePromo.item.sku : null,
              quantityFree: thePromo ? thePromo.bonusQuantity : null,
              judulPromo: thePromo ? thePromo.judulPromo : null,
              //diskon
              diskon: theDiskon ? theDiskon.item.sku : null,
              before: theDiskon ? theDiskon.before : parseFloat(item.totalRp),
              after: theDiskon ? theDiskon.after : parseFloat(item.totalRp),
              judulDiskon: theDiskon ? theDiskon.judulDiskon : null,
              //voucher
              voucher: null,
            },
          ];
        }
      })
    );

    //transaksi gagal save
    await Promise.allSettled(
      req?.errors?.map(async (item) => {
        newInvoice.transaksiGagal = [
          ...(newInvoice.transaksiGagal || []),
          {
            inventory: item.sku,
            message: item.pesan,
          },
        ];
      })
    );

    //unsatisfiedDiskon
    await Promise.allSettled(
      req.diskon.map(async (item) => {
        // Ensure totalSemua is initialized once outside the loop
        if (!item.isDiskon) {
          newInvoice.unsatisfiedDiskon = [
            ...(newInvoice.unsatisfiedDiskon || []),
            {
              inventory: item.item.sku,
              message: item.pesan,
            },
          ];
        } else if (item.isDiskon) {
          const tempSum =
            parseFloat(newInvoice.totalSemua) + parseFloat(item.after);
          newInvoice.totalSemua = tempSum;
        }
      })
    );

    //unsatifiedPromo save
    await Promise.allSettled(
      req.promo.map(async (item) => {
        if (!item.isPromo) {
          newInvoice.unsatifiedPromo = [
            ...(newInvoice.unsatifiedPromo || []),
            {
              inventory: item.item.sku,
              message: item.pesan,
            },
          ];
        }
      })
    );

    await newInvoice.save().then((data) => {
      return res.send({
        promologs: req?.promo,
        diskonlogs: req.diskon,
        itemsGagalLogs: req.errors,
        data,
      });
    });

    //sebelum cetak invoice ada tombol, editTransaction di frontend untuk /editTransaction
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "gagal membuat invoice" });
  }
});

//terima _id invoice, barang ditambahkan, barang yang dikurangi (tidak jadi )
//hanya bisa menambahkan sku baru dan membatalkan sku, tidak boleh modifikasi quantity
router.patch("/editTransaction", async (req, res) => {
  const { items, itemsDibatalkan, id } = req.body;

  try {
    const invoiceDB = await Invoice.findById(id);
    if (!invoiceDB) {
      return res.status(404).json({ message: "invoice tidak ditemukan" });
    }

    //pembatalan sebagian item
    if (itemsDibatalkan?.length > 0) {
      await Promise.allSettled(
        itemsDibatalkan.map(async (batal) => {
          const existingTransaction = invoiceDB.transaksiSukses.find(
            (transaksi) => {
              return transaksi.inventory == batal.sku;
            }
          );
          if (!existingTransaction) {
            return console.log(
              "Item yang dibatalkan anehnya tidak ada di invoice"
            );
          }

          //kurangi harga
          if (batal?.totalRp == undefined || batal?.totalRp == 0) {
            return console.log("item yang dibatalkan tidak memiliki totalRp");
          }

          const tempSum =
            parseFloat(invoiceDB.totalSemua) - parseFloat(batal.totalRp);
          invoiceDB.totalSemua = tempSum;

          //hapus dari transaksi transaksiSukses
          invoiceDB.transaksiSukses = invoiceDB.transaksiSukses.filter(
            (transaksi) => transaksi.inventory !== batal.sku
          );

          //tambahkan ke transaksiGagal
          invoiceDB.transaksiGagal = [
            ...(invoiceDB.transaksiGagal || []),
            {
              inventory: batal.sku,
              message: `item ${batal?.description} ${batal?.sku} dibatalkan`,
              suggestion: "Buat transaksi invoice baru",
            },
          ];
        })
      );
    }

    //penambahan item tambahan
    if (items?.length > 0) {
      await Promise.allSettled(
        items.map(async (item) => {
          const existingTransaction = invoiceDB.transaksiSukses.find(
            (transaksi) => transaksi.inventory == item.sku
          );
          console.log(existingTransaction);
          if (existingTransaction) {
            return (invoiceDB.transaksiGagal = [
              ...(invoiceDB.transaksiGagal || []),
              {
                inventory: id,
                message: "barang telah ada di invoice, tidak bisa ditambahkan",
                suggestions: "Buat transaksi invoice baru",
              },
            ]);
          }

          //cek quantity cukup?
          const itemDB = await InventoryRefrensi.findOne({ sku: item.sku });
          if (!itemDB) {
            return (invoiceDB.transaksiGagal = [
              ...(invoiceDB.transaksiGagal || []),
              {
                inventory: id,
                message: `barang ${item?.description} ${item?.sku} tidak terdaftar`,
              },
            ]);
          }
          if (itemDB.quantity == undefined || itemDB.quantity < item.quantity) {
            return (req.transaksiGagal = [
              ...(invoiceDB.transaksiGagal || []),
              {
                inventory: id,
                message: `quantity stock ${itemDB?.description} ${itemDB?.sku} tidak mencukupi`,
              },
            ]);
          }

          //rekapitulisasi total semua
          const tempSum =
            parseFloat(invoiceDB.totalSemua) + parseFloat(item.totalRp);
          invoiceDB.totalSemua = tempSum;

          invoiceDB.transaksiSukses = [
            ...(invoiceDB.transaksiSukses || []),
            {
              inventory: item.sku,
              quantity: item.quantity,
            },
          ];
        })
      );
    }

    await invoiceDB.save().then((updatedData) => {
      return res.send({ data: updatedData });
    });
  } catch (error) {
    return res.status(500).json({ message: "Terjadi kesalahan", error });
  }
});

//terima chiperText(voucher)?, items(sku, quantity), _id invoice, skuGratis(promo)?,  , metode pembarayan
//kembalikan kwitansi(tanggal transaction, voucher, harga awal dan setelah potongan jika ada, sku, items, kode invoice),
//jangan lupa kurangi semua yang telah dipenuhi invoice
router.post("/step2", checkVoucher, async (req, res) => {
  const { items, id, chiperText, payment } = req.body;
  if (!id) {
    return res.status(400).json({ message: "id invoice harus diberikan" });
  }
  try {
    const invoiceDB = await Invoice.findById(id);
    if (!invoiceDB) {
      return res.status(404).json({ message: "invoice tidak ditemukan" });
    }

    //confirm bank transaction

    //kurangi quantity inventory terkait

    //create kwitansi document dan cetak struknya

    //cetak kwitansi invoice pembelian
  } catch (error) {
    return res.status(500).json({ message: "Terjadi kesalahan", error });
  }
});

export default router;
