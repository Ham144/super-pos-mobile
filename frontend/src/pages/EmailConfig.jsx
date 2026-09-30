import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  verifyEmailConnection,
  testOutlookConnection,
  testCustomEmailConnection,
  runEmailKwitansiJob,
  getCurrentEmailConfig,
  saveEmailConfig,
  resetSystemConfig,
} from "../api/adminApi";
import toast from "react-hot-toast";

import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Server,
  Settings,
  Send,
  Save,
  TestTube,
  Play,
  Globe,
  Lock,
  Info,
  MailCheck,
  MailWarning,
} from "lucide-react";

const EmailConfig = () => {
  // State untuk form konfigurasi email kustom
  const [customConfig, setCustomConfig] = useState({
    host: "",
    port: "587",
    secure: false,
    service: "Outlook365",
    user: "",
    pass: "",
    passDownloadApk: "",
    to: "",
  });

  // State untuk email tujuan pengujian default
  const [testEmail, setTestEmail] = useState("");

  // State untuk loading
  const [isTestingDefault, setIsTestingDefault] = useState(false);
  const [isTestingCustom, setIsTestingCustom] = useState(false);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Query untuk memverifikasi koneksi email saat ini
  const { data: connectionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["emailConnectionStatus"],
    queryFn: verifyEmailConnection,
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Gagal memeriksa status koneksi email",
      );
    },
  });

  // Query untuk mendapatkan konfigurasi email saat ini
  const { data: currentConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["currentEmailConfig"],
    queryFn: getCurrentEmailConfig,
    onSuccess: (data) => {
      if (data?.config) {
        // Isi form dengan konfigurasi saat ini
        setCustomConfig((prev) => ({
          ...prev,
          host: data.config.host || "",
          port: data.config.port || "587",
          secure: data.config.secure || false,
          service: data.config.service || "Outlook365",
          user: data.config.user || "",
          passDownloadApk: "",
          // Password tidak diisi dari server untuk alasan keamanan
        }));
      }
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Gagal mendapatkan konfigurasi email saat ini",
      );
    },
  });

  // Mutation untuk menguji koneksi email default
  const testDefaultConnection = async () => {
    if (!testEmail) {
      toast.error("Masukkan alamat email tujuan untuk pengujian");
      return;
    }

    setIsTestingDefault(true);
    try {
      const result = await testOutlookConnection(testEmail);
      toast.success("Email test berhasil dikirim!");
      return result;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal mengirim email test",
      );
      throw error;
    } finally {
      setIsTestingDefault(false);
    }
  };

  // Mutation untuk menguji koneksi email kustom
  const testCustomConnection = async () => {
    // Validasi form
    if (
      !customConfig.host ||
      !customConfig.port ||
      !customConfig.user ||
      !customConfig.pass ||
      !customConfig.to
    ) {
      toast.error("Semua field harus diisi");
      return;
    }

    setIsTestingCustom(true);
    try {
      const result = await testCustomEmailConnection(customConfig);
      toast.success("Email test berhasil dikirim dengan konfigurasi kustom!");
      return result;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal mengirim email test",
      );
      throw error;
    } finally {
      setIsTestingCustom(false);
    }
  };

  // Mutation untuk menyimpan konfigurasi email
  const saveConfig = async () => {
    // Validasi form
    if (!customConfig.host || !customConfig.port || !customConfig.user) {
      toast.error("Host, port, dan user wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const configToSave = { ...customConfig };
      delete configToSave.to; // Field ini hanya dipakai untuk uji kirim email

      const result = await saveEmailConfig(configToSave);
      toast.success("Konfigurasi email berhasil disimpan!");

      // Refresh status dan konfigurasi
      refetchStatus();
      refetchConfig();

      return result;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menyimpan konfigurasi email",
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = async () => {
    if (
      !window.confirm("Hapus konfigurasi DB dan kembali ke default server?")
    ) {
      return;
    }

    try {
      await resetSystemConfig();
      toast.success("Konfigurasi berhasil direset ke default server");
      refetchStatus();
      refetchConfig();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal mereset konfigurasi",
      );
    }
  };

  // Mutation untuk menjalankan job pengiriman email kwitansi
  const runEmailJob = async () => {
    setIsRunningJob(true);
    try {
      const result = await runEmailKwitansiJob();
      toast.success("Job pengiriman email kwitansi telah dijalankan!");
      return result;
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Gagal menjalankan job pengiriman email",
      );
      throw error;
    } finally {
      setIsRunningJob(false);
    }
  };

  // Handler untuk mengubah state form kustom
  const handleCustomConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomConfig({
      ...customConfig,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Load konfigurasi saat komponen dimuat
  useEffect(() => {
    refetchConfig();
  }, [refetchConfig]);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Konfigurasi Email
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Atur dan uji konfigurasi email untuk sistem
          </p>
        </div>
      </div>

      {/* Status Koneksi Email Saat Ini */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Status Koneksi Email
            </h2>
          </div>
          <button
            onClick={() => refetchStatus()}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus?.success
                  ? "bg-green-500"
                  : connectionStatus?.success === false
                    ? "bg-red-500"
                    : "bg-gray-300"
              }`}
            />
            <span className="font-medium text-gray-700">
              {connectionStatus?.success
                ? "Terhubung"
                : connectionStatus?.success === false
                  ? "Tidak Terhubung"
                  : "Belum Diperiksa"}
            </span>
            {connectionStatus?.success && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            {connectionStatus?.success === false && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {connectionStatus && (
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 border border-gray-200 mb-4">
              {connectionStatus.message}
            </div>
          )}

          {currentConfig?.config && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-sm text-blue-800 mb-3 flex items-center gap-1">
                <Info className="w-4 h-4" />
                Konfigurasi Saat Ini:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Host:</span>
                  <span className="font-mono text-blue-700 bg-white px-2 py-1 rounded text-xs">
                    {currentConfig.config.host}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Port:</span>
                  <span className="font-mono text-blue-700 bg-white px-2 py-1 rounded text-xs">
                    {currentConfig.config.port}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Secure:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentConfig.config.secure
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentConfig.config.secure ? "Ya" : "Tidak"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Service:</span>
                  <span className="font-mono text-blue-700 bg-white px-2 py-1 rounded text-xs">
                    {currentConfig.config.service || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">User:</span>
                  <span className="font-mono text-blue-700 bg-white px-2 py-1 rounded text-xs">
                    {currentConfig.config.user}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">SMTP Password:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentConfig.config.hasEmailPass
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentConfig.config.hasEmailPass
                      ? "Tersimpan"
                      : "Belum diatur"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">APK Password:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentConfig.config.hasDownloadApkPass
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentConfig.config.hasDownloadApkPass
                      ? "Tersimpan"
                      : "Belum diatur"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pengujian Email Default */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Uji Pengiriman Email (Konfigurasi dari Server)
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Tujuan Pengujian
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="contoh@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            onClick={testDefaultConnection}
            className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-2 ${
              isTestingDefault ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isTestingDefault || !testEmail}
          >
            {isTestingDefault ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Email Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Konfigurasi Email Kustom */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Konfigurasi Email & Uji
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                name="host"
                value={customConfig.host}
                onChange={handleCustomConfigChange}
                placeholder="smtp.example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                name="port"
                value={customConfig.port}
                onChange={handleCustomConfigChange}
                placeholder="587"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="user"
                value={customConfig.user}
                onChange={handleCustomConfigChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <input
                type="password"
                name="pass"
                value={customConfig.pass}
                onChange={handleCustomConfigChange}
                placeholder="Kosongkan jika tidak diubah"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PASS_DOWNLOAD_APK
              </label>
              <input
                type="password"
                name="passDownloadApk"
                value={customConfig.passDownloadApk}
                onChange={handleCustomConfigChange}
                placeholder="Kosongkan jika tidak diubah"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service (opsional)
              </label>
              <select
                name="service"
                value={customConfig.service}
                onChange={handleCustomConfigChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all bg-white"
              >
                <option value="">Tidak Ada</option>
                <option value="Outlook365">Outlook365</option>
                <option value="Gmail">Gmail</option>
                <option value="Yahoo">Yahoo</option>
                <option value="Hotmail">Hotmail</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="secure"
                  checked={customConfig.secure}
                  onChange={handleCustomConfigChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-950"
                />
                <span className="text-sm text-gray-700">
                  Gunakan SSL (port 465)
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={saveConfig}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-2 ${
                isSaving ? "opacity-75 cursor-not-allowed" : ""
              }`}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Konfigurasi</span>
                </>
              )}
            </button>

            <button
              onClick={resetConfig}
              className="w-full border border-red-200 text-red-600 px-4 py-3 rounded-lg font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              type="button"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Reset ke Default Server</span>
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  Test Konfigurasi
                </span>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Tujuan Test
              </label>
              <input
                type="email"
                name="to"
                value={customConfig.to}
                onChange={handleCustomConfigChange}
                placeholder="test@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={testCustomConnection}
              className={`w-full border-2 border-blue-600 text-blue-600 px-4 py-3 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center justify-center gap-2 ${
                isTestingCustom ? "opacity-75 cursor-not-allowed" : ""
              }`}
              disabled={isTestingCustom}
            >
              {isTestingCustom ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Uji Konfigurasi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Jalankan Job Email Kwitansi */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <MailWarning className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Jalankan Job Pengiriman Email Kwitansi
            </h2>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-gray-600 leading-relaxed">
            Klik tombol di bawah untuk menjalankan job pengiriman email kwitansi
            secara manual. Job ini akan mencari semua invoice yang sudah dibayar
            tetapi belum dikirim email kwitansi, dan mengirimkan email bukti
            pembayaran ke pelanggan.
          </p>

          <button
            onClick={runEmailJob}
            className={`w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-2 ${
              isRunningJob ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isRunningJob}
          >
            {isRunningJob ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menjalankan...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Jalankan Job Email Kwitansi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfig;
