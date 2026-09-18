import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  RefreshCw,
  Save,
  Trash2,
  Send,
  KeyRound,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteWhatsappConfig,
  getWhatsappConfig,
  saveWhatsappConfig,
  testWhatsapp,
} from "@/api/adminApi";

const emptyForm = {
  WHATSAPP_API_KEY: "",
};

const WhatsAppConfig = () => {
  const [form, setForm] = useState(emptyForm);
  const [meta, setMeta] = useState({ hasToken: false, maskedToken: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Test WhatsApp dari CSI SUPER POS",
  );
  const [testResult, setTestResult] = useState(null);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await getWhatsappConfig();
      const config = result?.config || {};
      setForm({ WHATSAPP_API_KEY: config.WHATSAPP_API_KEY || "" });
      setMeta({
        hasToken: Boolean(config.hasToken),
        maskedToken: config.maskedToken || "",
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal memuat konfigurasi WhatsApp",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.WHATSAPP_API_KEY.trim()) {
      toast.error("Token Fonnte (WHATSAPP_API_KEY) wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveWhatsappConfig({
        WHATSAPP_API_KEY: form.WHATSAPP_API_KEY.trim(),
      });
      toast.success(result?.message || "Konfigurasi WhatsApp disimpan");
      await loadConfig();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menyimpan konfigurasi WhatsApp",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Hapus token WhatsApp dari konfigurasi global?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteWhatsappConfig();
      toast.success(result?.message || "Konfigurasi WhatsApp dihapus");
      setForm(emptyForm);
      setMeta({ hasToken: false, maskedToken: "" });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menghapus konfigurasi WhatsApp",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const payload = {
        phone: testPhone.trim(),
        message: testMessage.trim() || undefined,
      };
      // Allow testing with form token before save
      if (form.WHATSAPP_API_KEY.trim()) {
        payload.WHATSAPP_API_KEY = form.WHATSAPP_API_KEY.trim();
      }
      const result = await testWhatsapp(payload);
      setTestResult(result);
      toast.success(result?.message || "Pesan test terkirim");
    } catch (error) {
      const errBody = error?.response?.data;
      setTestResult(errBody || { success: false, message: error.message });
      toast.error(errBody?.message || "Gagal mengirim WhatsApp test");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-md">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Konfigurasi WhatsApp
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Atur token Fonnte dan uji pengiriman pesan WhatsApp
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Token Fonnte
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              window.open("https://md.fonnte.com/new/device.php", "_blank");
            }}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
          >
            <KeyRound
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Dapatkan Token
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                meta.hasToken ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-gray-700">
              {meta.hasToken
                ? `Token tersimpan: ${meta.maskedToken}`
                : "Belum ada token tersimpan"}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WHATSAPP_API_KEY (Fonnte Token)
            </label>
            <input
              type="password"
              value={form.WHATSAPP_API_KEY}
              onChange={(e) =>
                setForm({ WHATSAPP_API_KEY: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Tempel token Fonnte di sini"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Token dipakai untuk API{" "}
              <code className="bg-gray-100 px-1 rounded">api.fonnte.com/send</code>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || !meta.hasToken}
              className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Menghapus..." : "Hapus Token"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Phone className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Tester Pengiriman
          </h2>
        </div>

        <form onSubmit={handleTest} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Tujuan
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0812xxxxxxxx atau 62812xxxxxxxx"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nomor akan dinormalisasi ke format 62… sebelum dikirim ke Fonnte.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pesan
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isTesting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isTesting ? "Mengirim..." : "Kirim Test"}
          </button>

          {testResult && (
            <pre className="mt-4 p-4 bg-gray-900 text-green-300 text-xs rounded-lg overflow-auto max-h-64">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </form>
      </div>
    </div>
  );
};

export default WhatsAppConfig;
