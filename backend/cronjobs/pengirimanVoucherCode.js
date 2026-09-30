// Import yang diperlukan
import cron from "node-cron";
import Outlet from "../models/Outlet.model.js";
import Invoice from "../models/invoice.model.js";
import formatCurrency from "../utils/formatCurrency.js";
import GeneratedVoucher from "../models/GeneratedVoucher.model.js";
import DaftarVoucher from "../models/DaftarVoucher.model.js";
import {
  createCurrentSmtpTransporter,
  getEffectiveSystemConfig,
} from "../utils/systemConfig.js";

const kirimEmailVoucherCode = async (
  generatedVoucher,
  transporter,
  senderEmail
) => {
  //cari refrensi voucher
  const voucherDB = await DaftarVoucher.findById(generatedVoucher.voucherId);
  if (!voucherDB) {
    console.error("❌ Voucher tidak ditemukan");
    return;
  }
  let certainOutlet = [];
  if (generatedVoucher.outletList.length > 0) {
    certainOutlet = await Outlet.find({
      _id: { $in: generatedVoucher.outletList },
    })
      .select("namaOutlet")
      .lean()
      .then((outlets) => outlets.map((o) => o.namaOutlet).join(", "));
  } else {
    certainOutlet = "Semua Outlet";
  }

  //kirim email
  const email = generatedVoucher.pemilik.email;
  const subject = `Anda memiliki voucher ${voucherDB.judulVoucher} atas pembelian baru baru ini`;
  const text = `Belanjamu baru baru ini mendapatkan voucher ${voucherDB.judulVoucher}, ini kode voucher mu "${generatedVoucher.privateVoucherCode}" jangan publikasi kode ini, dan beri tahu kekasir kode voucher ini saat transaksi untuk dapat potongan harga, voucher ini hanya berlaku di outlet berikut ${certainOutlet}`;
  await transporter.sendMail({
    from: `"CSI POS" <${senderEmail}>`,
    to: email,
    subject,
    text,
  });
};

// Fungsi untuk mengumpulkan generatedVoucher yang belum dikirim
const kumpulkanGeneratedVoucherBelumDikirim = async () => {
  const generatedVoucher = await GeneratedVoucher.find({ isSend: false });
  const transporter = await createCurrentSmtpTransporter();
  const smtpConfig = await getEffectiveSystemConfig();

  //looping generatedVoucher
  for (const privateVoucher of generatedVoucher) {
    //kirim email
    await kirimEmailVoucherCode(
      privateVoucher,
      transporter,
      smtpConfig.EMAIL_USER
    );
    privateVoucher.isSend = true;
    await privateVoucher.save();
  }
};

// Jadwalkan cron job untuk berjalan setiap hari jam 7 pagi
// Format: Second (0-59), Minute (0-59), Hour (0-23), Day of Month (1-31), Month (1-12), Day of Week (0-6)
const pengirimanVoucherCodeJob = cron.schedule(
  "0 0 7 * * *",
  async () => {
    console.log("Menjalankan cron job pengiriman voucher code...");
    await kumpulkanGeneratedVoucherBelumDikirim();
  },
  {
    scheduled: true,
    timezone: "Asia/Jakarta", // Sesuaikan dengan timezone Indonesia
  }
);

// Verifikasi koneksi email saat startup
export const verifyEmailConnection = async () => {
  try {
    console.log("Verifikasi koneksi email...");
    const transporter = await createCurrentSmtpTransporter();
    const verification = await transporter.verify();
    if (verification) {
      console.log("✅ Koneksi email berhasil terverifikasi!");
      return true;
    } else {
      console.error("❌ Gagal verifikasi koneksi email.");
      return false;
    }
  } catch (error) {
    console.error("❌ Error saat verifikasi koneksi email:", error.message);
    console.error("Detail error:", { error: error.stack });
    return false;
  }
};

// Fungsi untuk menjalankan job secara manual (untuk testing)
export const runManualPengirimanVoucherCodeJob = async () => {
  console.log("Menjalankan pengiriman voucher code secara manual...");

  // Verifikasi koneksi email terlebih dahulu
  const isEmailConfigValid = await verifyEmailConnection();
  if (!isEmailConfigValid) {
    console.error("⚠️ Konfigurasi email tidak valid, cek pengaturan SMTP Anda");
    return false;
  }

  await kumpulkanGeneratedVoucherBelumDikirim();
  return true;
};

// Export cron job
export default pengirimanVoucherCodeJob;
