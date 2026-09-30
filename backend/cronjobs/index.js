// Import cron jobs
import emailKwitansiJob from "./emailKwitansi.js";
import { verifyEmailConnection } from "./emailKwitansi.js";

// Fungsi untuk menginisialisasi semua cron job
export const initCronJobs = async () => {
  // Verifikasi koneksi email sebelum memulai cron job
  const isEmailValid = await verifyEmailConnection();

  if (isEmailValid) {
    // Mulai cron job pengiriman email kwitansi
    emailKwitansiJob.start();
    console.log("Cron job pengiriman email kwitansi diinisialisasi -- 🟢");
  } else {
    console.warn(
      "⚠️ Cron job email kwitansi tidak dijalankan karena konfigurasi email tidak valid"
    );
  }

  // Tambahkan cron job lainnya di sini jika diperlukan
};

// Fungsi untuk menghentikan semua cron job (untuk kebutuhan maintenance atau shutdown)
export const stopCronJobs = () => {
  emailKwitansiJob.stop();
  console.log("Cron job pengiriman email kwitansi dihentikan");

  // Tambahkan penghentian cron job lainnya di sini jika diperlukan
};

// Export fungsi untuk menjalankan job secara manual
export { runManualEmailJob } from "./emailKwitansi.js";
