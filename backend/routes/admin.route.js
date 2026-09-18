import { Router } from "express";
import LdapClient from "ldapjs-client";
import { runManualEmailJob } from "../cronjobs/index.js";
import { verifyEmailConnection } from "../cronjobs/emailKwitansi.js";
import nodemailer from "nodemailer";
import {
  clearAdConfig,
  clearWhatsappConfig,
  createCurrentSmtpTransporter,
  deleteSystemConfig,
  getPublicAdConfig,
  getPublicSystemConfig,
  getPublicWhatsappConfig,
  saveAdConfig,
  saveSystemConfig,
  saveWhatsappConfig,
} from "../utils/systemConfig.js";
import { sendWhatsappByFonnte } from "../utils/whatsappSender.js";

const router = Router();

const escapeLdapFilter = (value = "") =>
  String(value)
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");

const resolveBaseDnFromRootDse = async (client) => {
  const root = await client.search("", {
    scope: "base",
    filter: "(objectClass=*)",
    attributes: ["defaultNamingContext", "namingContexts"],
  });
  const entry = root?.[0] || {};
  const defaultNc = entry.defaultNamingContext;
  if (typeof defaultNc === "string" && defaultNc) return defaultNc;
  if (Array.isArray(defaultNc) && defaultNc[0]) return defaultNc[0];
  const naming = entry.namingContexts;
  if (typeof naming === "string" && naming) return naming;
  if (Array.isArray(naming) && naming[0]) return naming[0];
  return "";
};

// Route untuk menjalankan job pengiriman email kwitansi secara manual
router.post("/run-email-kwitansi-job", async (req, res) => {
  try {
    console.log("Menjalankan job pengiriman email kwitansi secara manual");

    // Verifikasi koneksi email terlebih dahulu
    const isEmailConfigValid = await verifyEmailConnection();
    if (!isEmailConfigValid) {
      return res.status(500).json({
        success: false,
        message:
          "Konfigurasi email tidak valid. Periksa pengaturan SMTP di database",
      });
    }

    // Jalankan job
    const result = await runManualEmailJob();
    
    if (result === false) {
      return res.status(500).json({
        success: false,
        message:
          "Gagal menjalankan job pengiriman email. Lihat log server untuk detail.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job pengiriman email kwitansi telah dijalankan secara manual",
    });
  } catch (error) {
    console.error("Error saat menjalankan job:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menjalankan job",
      error: error.message,
    });
  }
});

// Route untuk verifikasi koneksi email
router.get("/verify-email-connection", async (req, res) => {
  try {
    const isValid = await verifyEmailConnection();
    return res.status(200).json({
      success: isValid,
      message: isValid
        ? "Koneksi email berhasil terverifikasi"
        : "Koneksi email gagal terverifikasi. Periksa pengaturan SMTP di database",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat verifikasi koneksi email",
      error: error.message,
    });
  }
});

// Route untuk testing koneksi email dengan parameter kustom
router.post("/test-email-connection", async (req, res) => {
  const { host, port, secure, user, pass, to } = req.body;

  if (!host || !port || !user || !pass || !to) {
    return res.status(400).json({
      success: false,
      message: "Semua parameter (host, port, user, pass, to) diperlukan",
    });
  }

  try {
    console.log("Menguji koneksi email dengan parameter kustom:");
    console.log({ host, port, secure, user, pass: "***" });

    // Buat transporter untuk testing
    const testTransporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure === true || secure === "true",
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        ciphers: "SSLv3",
      },
      debug: true,
    });

    // Verifikasi koneksi
    const isConnected = await testTransporter.verify();

    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: "Gagal terhubung ke server SMTP",
      });
    }

    // Kirim email test
    const info = await testTransporter.sendMail({
      from: `"Test Email" <${user}>`,
      to,
      subject: "Test Email dari POS System",
      text: "Ini adalah email test untuk memverifikasi koneksi SMTP",
      html: "<h1>Test Email</h1><p>Jika Anda menerima email ini, berarti konfigurasi SMTP Anda berhasil!</p>",
    });

    return res.status(200).json({
      success: true,
      message: "Koneksi email berhasil dan email test telah dikirim",
      details: {
        messageId: info.messageId,
        previewURL: nodemailer.getTestMessageUrl(info),
      },
    });
  } catch (error) {
    console.error("Error saat testing koneksi email:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat testing koneksi email",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Route untuk testing koneksi Outlook365 (menggunakan kredensial dari database)
router.post("/test-outlook-connection", async (req, res) => {
  const { to } = req.body;

  if (!to) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'to' (alamat email tujuan) diperlukan",
    });
  }

  try {
    // Buat transporter dari konfigurasi yang tersimpan di database
    const outlookTransporter = await createCurrentSmtpTransporter();

    console.log("Verifikasi koneksi Outlook365...");
    console.log("Konfigurasi SMTP diambil dari database");

    // Verifikasi koneksi
    const isConnected = await outlookTransporter.verify();
    console.log("Hasil verifikasi:", isConnected);

    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: "Gagal terhubung ke server SMTP Outlook",
      });
    }

    // Kirim email test
    const currentConfig = await getPublicSystemConfig();
    const info = await outlookTransporter.sendMail({
      from: `"Test CSI SUPER POS" <${currentConfig.user}>`,
      to,
      subject: "Test Email dari CSI SUPER POS",
      text: "Ini adalah email test menggunakan Outlook",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h1>Test Email CSI SUPER POS</h1>
          <p>Jika Anda menerima email ini, berarti konfigurasi SMTP Outlook365 di server CSI SUPER POS Anda berhasil!</p>
          <p>Detail konfigurasi:</p>
          <ul>
            <li>Host: ${currentConfig.host}</li>
            <li>Port: ${currentConfig.port}</li>
            <li>Service: ${currentConfig.service || "-"}</li>
            <li>User: ${currentConfig.user}</li>
          </ul>
          <p style="color: #777; font-size: 12px; margin-top: 30px; text-align: center;">
            Email ini dikirim secara otomatis melalui sistem POS. ${new Date().toLocaleString(
              "id-ID",
            )}
          </p>
        </div>
      `,
    });
    
    return res.status(200).json({
      success: true,
      message: "Koneksi Outlook berhasil dan email test telah dikirim",
      details: {
        messageId: info.messageId,
        to: to,
        from: currentConfig.user,
      },
    });
  } catch (error) {
    console.error("Error saat testing koneksi Outlook:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat testing koneksi Outlook",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Route untuk menyimpan konfigurasi email ke database
router.post("/save-email-config", async (req, res) => {
  const { host, port, secure, service, user, pass, passDownloadApk } = req.body;

  if (!host || !port || !user) {
    return res.status(400).json({
      success: false,
      message: "Parameter (host, port, user) diperlukan",
    });
  }

  try {
    const savedConfig = await saveSystemConfig({
      EMAIL_HOST: host,
      EMAIL_PORT: port,
      EMAIL_SECURE: secure,
      EMAIL_USER: user,
      EMAIL_PASS: pass,
      EMAIL_SERVICE: service,
      PASS_DOWNLOAD_APK: passDownloadApk,
    });
    
    return res.status(200).json({
      success: true,
      message: "Konfigurasi berhasil disimpan ke database",
      config: {
        host: savedConfig.EMAIL_HOST,
        port: String(savedConfig.EMAIL_PORT),
        secure: savedConfig.EMAIL_SECURE,
        service: savedConfig.EMAIL_SERVICE || undefined,
        user: savedConfig.EMAIL_USER,
        hasEmailPass: Boolean(savedConfig.EMAIL_PASS),
        hasDownloadApkPass: Boolean(savedConfig.PASS_DOWNLOAD_APK),
      },
    });
  } catch (error) {
    console.error("Error saat menyimpan konfigurasi email:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan konfigurasi email",
      error: error.message,
    });
  }
});

// Route untuk mendapatkan konfigurasi email saat ini (tanpa password)
router.get("/current-email-config", async (req, res) => {
  try {
    const config = await getPublicSystemConfig();

    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error saat mengambil konfigurasi email:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil konfigurasi email",
      error: error.message,
    });
  }
});

router.get("/system-config", async (req, res) => {
  try {
    const config = await getPublicSystemConfig();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error saat mengambil konfigurasi sistem:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil konfigurasi sistem",
      error: error.message,
    });
  }
});

router.put("/system-config", async (req, res) => {
  const { host, port, secure, service, user, pass, passDownloadApk } = req.body;

  if (!host || !port || !user) {
    return res.status(400).json({
      success: false,
      message: "Parameter (host, port, user) diperlukan",
    });
  }

  try {
    const savedConfig = await saveSystemConfig({
      EMAIL_HOST: host,
      EMAIL_PORT: port,
      EMAIL_SECURE: secure,
      EMAIL_USER: user,
      EMAIL_PASS: pass,
      EMAIL_SERVICE: service,
      PASS_DOWNLOAD_APK: passDownloadApk,
    });

    return res.status(200).json({
      success: true,
      message: "Konfigurasi sistem berhasil diperbarui",
      config: {
        host: savedConfig.EMAIL_HOST,
        port: String(savedConfig.EMAIL_PORT),
        secure: savedConfig.EMAIL_SECURE,
        service: savedConfig.EMAIL_SERVICE || undefined,
        user: savedConfig.EMAIL_USER,
        hasEmailPass: Boolean(savedConfig.EMAIL_PASS),
        hasDownloadApkPass: Boolean(savedConfig.PASS_DOWNLOAD_APK),
      },
    });
  } catch (error) {
    console.error("Error saat memperbarui konfigurasi sistem:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui konfigurasi sistem",
      error: error.message,
    });
  }
});

router.delete("/system-config", async (req, res) => {
  try {
    const config = await deleteSystemConfig();
    return res.status(200).json({
      success: true,
      message:
        "Konfigurasi sistem berhasil dihapus dan kembali ke default server",
      config,
    });
  } catch (error) {
    console.error("Error saat menghapus konfigurasi sistem:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus konfigurasi sistem",
      error: error.message,
    });
  }
});

router.get("/ad-config", async (req, res) => {
  try {
    const config = await getPublicAdConfig();
    return res.status(200).json({ success: true, config });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil konfigurasi Active Directory",
      error: error.message,
    });
  }
});

router.put("/ad-config", async (req, res) => {
  const { AD_HOST, AD_PORT, AD_DOMAIN, AD_BASE_DN } = req.body;

  if (!AD_HOST || !AD_DOMAIN) {
    return res.status(400).json({
      success: false,
      message: "AD_HOST dan AD_DOMAIN wajib diisi",
    });
  }

  try {
    const savedConfig = await saveAdConfig({
      AD_HOST,
      AD_PORT,
      AD_DOMAIN,
      AD_BASE_DN,
    });

    return res.status(200).json({
      success: true,
      message: "Konfigurasi Active Directory berhasil disimpan",
      config: {
        AD_HOST: savedConfig.AD_HOST,
        AD_PORT: savedConfig.AD_PORT,
        AD_DOMAIN: savedConfig.AD_DOMAIN,
        AD_BASE_DN: savedConfig.AD_BASE_DN,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan konfigurasi Active Directory",
      error: error.message,
    });
  }
});

router.delete("/ad-config", async (req, res) => {
  try {
    await clearAdConfig();
    return res.status(200).json({
      success: true,
      message: "Konfigurasi Active Directory berhasil dihapus",
      config: await getPublicAdConfig(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus konfigurasi Active Directory",
      error: error.message,
    });
  }
});

router.post("/test-ldap", async (req, res) => {
  const {
    username,
    password,
    AD_HOST,
    AD_PORT,
    AD_DOMAIN,
    AD_BASE_DN,
  } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "username dan password LDAP wajib untuk tester",
    });
  }

  try {
    const saved = await getPublicAdConfig();
    const host = AD_HOST || saved.AD_HOST;
    const port = Number(AD_PORT || saved.AD_PORT || 389);
    const domain = AD_DOMAIN || saved.AD_DOMAIN;
    let baseDN = AD_BASE_DN || saved.AD_BASE_DN;

    if (!host || !domain) {
      return res.status(400).json({
        success: false,
        message: "AD_HOST dan AD_DOMAIN wajib diisi (simpan config atau isi di form tester)",
      });
    }

    const client = new LdapClient({
      url: `ldap://${host}:${port}`,
    });

    try {
      try {
        const discovered = await resolveBaseDnFromRootDse(client);
        if (discovered) baseDN = discovered;
      } catch (rootDseError) {
        console.warn("RootDSE gagal pada test-ldap:", rootDseError?.message);
      }

      if (!baseDN) {
        return res.status(400).json({
          success: false,
          message:
            "AD_BASE_DN kosong dan RootDSE tidak mengembalikan defaultNamingContext",
        });
      }

      const bindDn = `${domain}\\${String(username).trim()}`;
      await client.bind(bindDn, password);

      const result = await client.search(baseDN, {
        scope: "sub",
        filter: `(sAMAccountName=${escapeLdapFilter(String(username).trim())})`,
        attributes: ["sAMAccountName", "displayName", "mail", "description"],
      });

      const user = result?.[0] || null;

      return res.status(200).json({
        success: true,
        message: "Koneksi LDAP berhasil",
        details: {
          host,
          port,
          domain,
          baseDN,
          bindDn,
          userFound: Boolean(user),
          displayName: user?.displayName || "",
          sAMAccountName: user?.sAMAccountName || String(username).trim(),
        },
      });
    } finally {
      await client.unbind().catch(() => {});
      if (typeof client.destroy === "function") {
        await client.destroy().catch(() => {});
      }
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Gagal menguji koneksi LDAP. Periksa host/port/domain/kredensial.",
      error: error?.name || error?.message,
    });
  }
});

router.get("/whatsapp-config", async (req, res) => {
  try {
    const config = await getPublicWhatsappConfig();
    return res.status(200).json({ success: true, config });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil konfigurasi WhatsApp",
      error: error.message,
    });
  }
});

router.put("/whatsapp-config", async (req, res) => {
  const { WHATSAPP_API_KEY } = req.body || {};

  if (
    typeof WHATSAPP_API_KEY === "string" &&
    WHATSAPP_API_KEY.includes("***")
  ) {
    return res.status(200).json({
      success: true,
      message: "Tidak ada perubahan (token masked)",
    });
  }

  if (WHATSAPP_API_KEY === undefined || WHATSAPP_API_KEY === null) {
    return res.status(400).json({
      success: false,
      message: "WHATSAPP_API_KEY wajib diisi",
    });
  }

  try {
    await saveWhatsappConfig({ WHATSAPP_API_KEY: String(WHATSAPP_API_KEY) });
    const config = await getPublicWhatsappConfig();
    return res.status(200).json({
      success: true,
      message: "Konfigurasi WhatsApp berhasil disimpan",
      config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan konfigurasi WhatsApp",
      error: error.message,
    });
  }
});

router.delete("/whatsapp-config", async (req, res) => {
  try {
    await clearWhatsappConfig();
    const config = await getPublicWhatsappConfig();
    return res.status(200).json({
      success: true,
      message: "Konfigurasi WhatsApp berhasil dihapus",
      config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus konfigurasi WhatsApp",
      error: error.message,
    });
  }
});

router.post("/test-whatsapp", async (req, res) => {
  const { phone, message, WHATSAPP_API_KEY } = req.body || {};

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Nomor WhatsApp (phone) wajib diisi",
    });
  }

  const text =
    message ||
    `Test WhatsApp CSI SUPER POS — ${new Date().toLocaleString("id-ID")}`;

  try {
    const data = await sendWhatsappByFonnte(
      phone,
      text,
      WHATSAPP_API_KEY || undefined,
    );
    return res.status(200).json({
      success: true,
      message: WHATSAPP_API_KEY
        ? "Pesan WhatsApp test berhasil dikirim (token override)"
        : "Pesan WhatsApp test berhasil dikirim",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error?.fonnte?.reason ||
        error?.response?.data?.reason ||
        error?.message ||
        "Gagal mengirim WhatsApp test",
      error: error?.fonnte || error?.response?.data || error.message,
    });
  }
});

export default router;
