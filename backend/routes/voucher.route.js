import { Router } from "express";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import GeneratedVoucher from "../models/GeneratedVoucher.model.js";
import Customer from "../models/Customer.model.js";

const router = Router();

router.get("/getAllVouchers", async (req, res) => {
  try {
    const data = await DaftarVoucher.find({});
    return res.json({ message: "berhasil mendapatkan data voucher", data });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "gagal mengambil voucher", error: error });
  }
});

router.post("/addVoucherLogic", async (req, res) => {
  const {
    judulVoucher,
    potongan,
    tipeSyarat,
    minimalPembelianQuantity,
    minimalPembelianTotalRp,
    berlakuDari,
    berlakuHingga,
    skuList,
    quantityTersedia,
  } = req.body;

  if (
    !judulVoucher ||
    !tipeSyarat ||
    !potongan ||
    !berlakuDari ||
    !berlakuHingga ||
    !quantityTersedia
  ) {
    return res.status(400).json({
      message: "gagal membuat voucher, beberapa data penting tidak diisi",
    });
  }
  if (tipeSyarat !== "quantity" && tipeSyarat !== "totalRp") {
    return res
      .status(400)
      .json({ message: "gagal membuat voucher, tipe voucher tidak valid" });
  }

  //sanitize duplikat
  const skuListSet = new Set();
  skuList?.forEach((sku) => {
    skuListSet.add(sku);
  });

  const publicVoucherCodeRandom = `${judulVoucher}${Math.random()
    .toString(36)
    .substring(2, 15)}`;
  try {
    await DaftarVoucher.create({
      judulVoucher,
      potongan,
      tipeSyarat,
      minimalPembelianQuantity,
      minimalPembelianTotalRp,
      berlakuDari: berlakuDari ? new Date(berlakuDari) : new Date(),
      berlakuHingga: new Date(berlakuHingga),
      quantityTersedia,
      terjadi: 0,
      skuList: Array.from(skuListSet),
      publicVoucherCode: publicVoucherCodeRandom,
    });
    return res.json({
      message: "Berhasil menambahkan refrensi voucher baru",
    });
  } catch (error) {
    if (error.code == "11000") {
      return res.status(500).json({ message: error });
    }
    console.log(error);
    return res.status(400).json({
      message: "Gagal membuat rule voucher",
      error: "Terdapat field yang duplikat yang harusnya unik",
    });
  }
});

router.put("/editVoucherLogic", async (req, res) => {
  const {
    _id,
    tipeSyarat,
    potongan,
    minimalPembelianQuantity,
    minimalPembelianTotalRp,
    berlakuDari,
    berlakuHingga,
    quantityTersedia,
    judulVoucher,
    skuList,
  } = req.body;

  if (!_id) {
    return res.status(400).json({ message: "gagal, Id tidak ada" });
  }

  if (
    !tipeSyarat ||
    !judulVoucher ||
    !potongan ||
    !berlakuDari ||
    !berlakuHingga ||
    !quantityTersedia
  ) {
    return res.status(400).json({
      message: "gagal membuat voucher, beberapa data penting tidak diisi",
    });
  }
  if (tipeSyarat !== "quantity" && tipeSyarat !== "totalRp") {
    return res
      .status(400)
      .json({ message: "gagal membuat voucher, tipe voucher tidak valid" });
  }

  // Sanitize sku menjadi unik
  const skuListSet = new Set();
  skuList.forEach((sku) => {
    console.log(sku);
    skuListSet.add(sku);
  });

  try {
    await DaftarVoucher.findByIdAndUpdate(
      _id,
      {
        judulVoucher,
        potongan,
        tipeSyarat,
        minimalPembelianQuantity,
        minimalPembelianTotalRp,
        berlakuDari: berlakuDari ? new Date(berlakuDari) : new Date(),
        berlakuHingga: new Date(berlakuHingga),
        quantityTersedia,
        skuList: Array.from(skuListSet),
      },
      { new: true }
    );
    return res.json({ message: "Berhasil update voucher" });
  } catch (error) {
    return res.status(400).json({ message: "gagal mengupdate voucher", error });
  }
});

router.delete(`/deleteVoucherLogic/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const voucherUpdated = await DaftarVoucher.findByIdAndDelete(id);
    if (!voucherUpdated) {
      return res.status(400).json({ message: "gagal menghapus voucher" });
    }
    return res.json({ message: "berhasil menghapus voucher" });
  } catch (error) {
    return res.status(400).json({
      message: "gagal mengahapus rule voucher",
      error,
    });
  }
});

//tampilan di web sj, ga perlu save di mobile
router.get("/getAllGeneratedVoucher", async (req, res) => {
  try {
    const data = await GeneratedVoucher.find({}).populate(
      "voucherReference",
      "judulVoucher potongan berlakuDari berlakuHingga quantityTersedia terjadi"
    );

    return res.json({
      message: "berhasil mendapatkan data voucher",
      data,
    });
  } catch (error) {
    return res.status(400).json({ message: "gagal mengambil voucher", error });
  }
});

//ini untuk mobile app, redeem privateVoucherCode, kurangi harga total jika 200
//note: model generatedVoucher tidak ada di offline mobile, karena bisa terlalu besar dan bisa diabuse
router.post("/privateVoucherRedemption", async (req, res) => {
  const { voucherCode, outletId } = req.body;

  try {
    //cari generatedVouchernya
    const generatedPrivateVoucher = await GeneratedVoucher.findOne({
      privateVoucherCode: voucherCode?.trim(),
    });

    if (!generatedPrivateVoucher) {
      return res.status(400).json({
        message: "Voucher code tidak valid, atau voucher code telah di redeem",
      });
    }

    const voucherReference = await DaftarVoucher.findById(
      generatedPrivateVoucher.voucherReference
    );
    if (!voucherReference) {
      return res.status(400).json({
        message: "voucherReference tidak lagi ada",
      });
    }

    //validasi waktu berlaku voucher refrensi
    const now = new Date();
    if (
      now < voucherReference.berlakuDari ||
      now > voucherReference.berlakuHingga
    ) {
      return res
        .status(400)
        .json({ message: "Pengecekan waktu voucher: tidak valid" });
    }
    //validasi apakah voucher masih tersedia
    if (voucherReference.quantityTersedia <= 0) {
      return res.status(400).json({ message: "Voucher tidak tersedia lagi" });
    }
    //validasi apakah generatedVoucher berlaku di outlet transaksi sekarang
    if (
      generatedPrivateVoucher.outletList.length > 0 &&
      !generatedPrivateVoucher.outletList.includes(outletId)
    ) {
      return res.status(400).json({
        message:
          "Voucher berlaku, namun tidak di outlet ini, lihat outlet-outlet yang berlaku di email yang telah dikirim",
      });
    }

    //lolos semua
    const data = {
      voucherReference: voucherReference,
    };

    voucherReference.terjadi++;
    voucherReference.quantityTersedia--;
    await voucherReference.save();

    //hapus private voucher
    await GeneratedVoucher.findByIdAndDelete(generatedPrivateVoucher._id);

    return res.json({
      message: "Voucher berhasil diredeem",
      data,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "gagal mengambil voucher", error });
  }
});

//scan public voucher code untuk generate private voucher code yang akan dikirim ke email
router.post("/publicVoucherConverting", async (req, res) => {
  const { publicCode, customerEmail } = req.body;

  if (!customerEmail) {
    return res.status(400).json({
      message: "Gagal, customer email harus diisi",
    });
  }

  try {
    const voucherRefrence = await DaftarVoucher.findOne({
      publicVoucherCode: publicCode,
    });
    if (!voucherRefrence) {
      return res.status(400).json({ message: "public code tidak valid" });
    }

    //cek waktu dan validasi lainnya
    if (
      new Date(voucherRefrence.berlakuHingga) < new Date() ||
      new Date(voucherRefrence.berlakuDari) > new Date()
    ) {
      return res.status(500).json({
        message: "Gagal karena voucher reference tidak lagi berlaku",
      });
    }

    if (voucherRefrence.quantityTersedia <= 0) {
      return res.status(400).json({
        message: "Sorry, Voucher tidak tersedia lagi",
      });
    }

    const isCustomerFraud = await Customer.findOne({
      email: customerEmail,
      voucherImplemented: { $in: [voucherRefrence._id] },
    });

    if (isCustomerFraud) {
      return res.status(402).json({
        message:
          "Gagal Membuat, anda telah pernah mencoba convert public voucher ini",
      });
    }

    //randomize
    const _5lengthRandomPrivate = Math.floor(10000 + Math.random() * 90000);

    const html = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
          margin: 0;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          max-width: 500px;
          margin: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .title {
          color: #333333;
          text-align: center;
        }
        .voucher-box {
          background-color: #e0f7fa;
          color: #006064;
          padding: 20px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 3px;
          margin-top: 20px;
          border-radius: 8px;
        }
        .note {
          margin-top: 20px;
          font-size: 14px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="title">🎉 Selamat! Kamu Mendapatkan Voucher</h2>
        <p style="text-align: center;">Gunakan private code berikut untuk klaim vouchermu:</p>
        <div class="voucher-box">${_5lengthRandomPrivate}</div>
        <p class="note">Kode ini bersifat rahasia. Jangan dibagikan ke orang lain ya.</p>
      </div>
    </body>
  </html>
`;

    const newGeneratedVoucher = new GeneratedVoucher();
    newGeneratedVoucher.voucherReference = voucherRefrence._id;
    const code = String(_5lengthRandomPrivate);
    newGeneratedVoucher.privateVoucherCode = code;
    newGeneratedVoucher.email = customerEmail;

    voucherRefrence.terjadi = voucherRefrence.terjadi++;
    voucherRefrence.quantityTersedia = voucherRefrence.quantityTersedia--;

    const to = customerEmail;
    const subject = "Private Voucher Code";
    const [isSuccess, error] = await emailSender({ to, subject, html });
    console.log("berhasil mengirim email", isSuccess);
    if (isSuccess) {
      await Customer.updateOne(
        { email: customerEmail },
        { $push: { voucherImplemented: voucherRefrence._id } },
        { upsert: true }
      );
      newGeneratedVoucher.isSend = true;
      await newGeneratedVoucher.save();
      await voucherRefrence.save();
      return res.json({ message: "Berhasil mengirim voucher" });
    } else {
      newGeneratedVoucher.isSend = false;
      await voucherRefrence.save();
      await newGeneratedVoucher.save();
      return res.status(400).json({ message: error });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Gagal konversi voucher public menjadi generated voucher",
      error: error,
    });
  }
});

export default router;
