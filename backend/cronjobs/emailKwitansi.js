// Import yang diperlukan
import cron from "node-cron";
import Outlet from "../models/Outlet.model.js";
import Invoice from "../models/invoice.model.js";
import formatCurrency from "../utils/formatCurrency.js";
import {
  createCurrentSmtpTransporter,
  getEffectiveSystemConfig,
} from "../utils/systemConfig.js";

// Fungsi untuk mengirim email bukti pembayaran
const sendKwitansiEmail = async (invoice, transporter, senderEmail) => {
  try {
    // Dapatkan informasi outlet dari kode invoice
    const kodeOutlet = invoice.kodeInvoice.slice(0, 2);
    const outletDB = await Outlet.findOne({ kodeOutlet });

    if (!outletDB) {
      console.error(
        `Outlet dengan kode ${kodeOutlet} tidak ditemukan untuk invoice ${invoice._id}`
      );
      return false;
    }

    // Format items
    const itemsHTML = invoice.currentBill
      .map(
        (item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}x</td>
        <td align="right">${formatCurrency(item.totalRp / item.quantity)}</td>
        <td align="right">${formatCurrency(item.totalRp)}</td>
      </tr>
    `
      )
      .join("");

    // Format diskon jika ada
    let diskonHTML = "";
    if (invoice.diskon && invoice.diskon.length > 0) {
      diskonHTML =
        "<h3>Diskon yang diperoleh:</h3><ul>" +
        invoice.diskon
          .map((d) => {
            const potonganText = d.diskonInfo?.RpPotonganHarga
              ? formatCurrency(d.diskonInfo.RpPotonganHarga)
              : `${d.diskonInfo?.percentPotonganHarga}%`;
            return `<li>${d.description}: ${potonganText}</li>`;
          })
          .join("") +
        "</ul>";
    }

    // Format promo jika ada
    let promoHTML = "";
    if (invoice.promo && invoice.promo.length > 0) {
      promoHTML =
        "<h3>Promo yang diperoleh:</h3><ul>" +
        invoice.promo
          .map((p) => {
            return `<li>${p.description}: ${p.promoInfo?.skuBarangBonus} ${p.promoInfo?.quantityBonus}x</li>`;
          })
          .join("") +
        "</ul>";
    }

    // Tanggal invoice
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // Buat konten email dengan HTML
    const mailOptions = {
      from: `"${outletDB.namaOutlet}" <${senderEmail}>`,
      to: invoice.customer,
      subject: `INVOICE PEMBELIAN - ${outletDB.namaOutlet} - ${invoice.kodeInvoice}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2>${outletDB.namaOutlet}</h2>
            <p>${outletDB.address || ""}</p>
            <p>${outletDB.phone || ""}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px;">
            <h2 style="text-align: center; color: #2c3e50;">INVOICE PEMBELIAN</h2>
            <p><strong>Tanggal:</strong> ${invoiceDate}</p>
            <p><strong>No. Invoice:</strong> ${invoice.kodeInvoice}</p>
            ${
              invoice.navSalesOrderNo
                ? `<p><strong>SO:</strong> ${invoice.navSalesOrderNo}</p>`
                : ""
            }
            ${
              (() => {
                const si =
                  invoice.navSalesInvoiceNo ||
                  (invoice.navInvoiceReturnValue
                    ? String(invoice.navInvoiceReturnValue).split(";")[0].trim()
                    : "");
                return si ? `<p><strong>SI:</strong> ${si}</p>` : "";
              })()
            }
            <p><strong>Kasir:</strong> ${invoice.salesPerson || "-"}</p>
            <p><strong>SPG:</strong> ${invoice.spg || "-"}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qty</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Harga</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Sub Total:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(
                  Math.round(Number(invoice.total || 0) / 1.11)
                )}</td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatCurrency(
                  invoice.total
                )}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          ${diskonHTML}
          ${promoHTML}
          
          <div style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">
            <p>Terima kasih telah berbelanja di ${outletDB.namaOutlet}!</p>
            <p>Email ini dibuat secara otomatis. Harap jangan membalas email ini.</p>
            <p>© ${new Date().getFullYear()} ${outletDB.namaOutlet}</p>
          </div>
        </div>
      `,
    };

    // Kirim email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email terkirim ke ${invoice.customer}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Gagal mengirim email untuk invoice ${invoice._id}:`, error);
    return false;
  }
};

// Fungsi untuk memproses semua invoice yang belum dikirim
const processUnsentInvoices = async () => {
  try {
    console.log("Memulai pengiriman bukti pembayaran melalui email...");
    const transporter = await createCurrentSmtpTransporter();
    const smtpConfig = await getEffectiveSystemConfig();

    // Ambil semua invoice yang sudah dibayar tapi belum dikirim email kwitansi
    const invoices = await Invoice.find({
      done: true,
      isPrintedKwitansi: false,
      customer: { $exists: true, $ne: null, $ne: "" }, // Pastikan ada alamat email customer
    });

    console.log(
      `Menemukan ${invoices.length} invoice yang perlu dikirim via email`
    );

    // Jika tidak ada invoice yang perlu dikirim
    if (invoices.length === 0) {
      console.log("Tidak ada invoice yang perlu dikirim");
      return;
    }

    // Kirim email untuk setiap invoice
    for (const invoice of invoices) {
      console.log(
        `Memproses invoice ${invoice._id} untuk customer ${invoice.customer}`
      );

      // Kirim email kwitansi
      const sent = await sendKwitansiEmail(
        invoice,
        transporter,
        smtpConfig.EMAIL_USER
      );

      // Update status isPrintedKwitansi jika berhasil
      if (sent) {
        await Invoice.findByIdAndUpdate(invoice._id, {
          $set: { isPrintedKwitansi: true },
        });
        console.log(
          `Berhasil mengirim dan mengupdate status invoice ${invoice._id}`
        );
      } else {
        console.log(`Gagal mengirim email untuk invoice ${invoice._id}`);
      }
    }

    console.log("Selesai memproses semua invoice");
  } catch (error) {
    console.error("Error saat memproses invoice:", error);
  }
};

// Jadwalkan cron job untuk berjalan setiap hari jam 7 pagi
// Format: Second (0-59), Minute (0-59), Hour (0-23), Day of Month (1-31), Month (1-12), Day of Week (0-6)
const emailJob = cron.schedule(
  "0 0 7 * * *",
  async () => {
    console.log("Menjalankan cron job pengiriman email kwitansi...");
    await processUnsentInvoices();
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
export const runManualEmailJob = async () => {
  console.log("Menjalankan pengiriman email kwitansi secara manual...");

  // Verifikasi koneksi email terlebih dahulu
  const isEmailConfigValid = await verifyEmailConnection();
  if (!isEmailConfigValid) {
    console.error("⚠️ Konfigurasi email tidak valid, cek pengaturan SMTP Anda");
    return false;
  }

  await processUnsentInvoices();
  return true;
};

// Export cron job
export default emailJob;
