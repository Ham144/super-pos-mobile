import React, { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Save, Trash2, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteMidtransConfig,
  getMidtransConfig,
  saveMidtransConfig,
} from "@/api/adminApi";

const emptyForm = {
  PAYMENT_MIDTRANS_CLIENT_KEY: "",
  PAYMENT_MIDTRANS_SERVER_KEY: "",
  MIDTRANS_IS_PRODUCTION: false,
};

const MidtransConfig = () => {
  const [form, setForm] = useState(emptyForm);
  const [meta, setMeta] = useState({
    hasClientKey: false,
    hasServerKey: false,
    maskedClientKey: "",
    maskedServerKey: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await getMidtransConfig();
      const config = result?.config || {};
      setForm({
        PAYMENT_MIDTRANS_CLIENT_KEY: "",
        PAYMENT_MIDTRANS_SERVER_KEY: "",
        MIDTRANS_IS_PRODUCTION: Boolean(config.MIDTRANS_IS_PRODUCTION),
      });
      setMeta({
        hasClientKey: Boolean(config.hasClientKey),
        hasServerKey: Boolean(config.hasServerKey),
        maskedClientKey: config.maskedClientKey || "",
        maskedServerKey: config.maskedServerKey || "",
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal memuat konfigurasi Midtrans",
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
    setIsSaving(true);
    try {
      const payload = {
        MIDTRANS_IS_PRODUCTION: form.MIDTRANS_IS_PRODUCTION,
      };
      if (form.PAYMENT_MIDTRANS_CLIENT_KEY.trim()) {
        payload.PAYMENT_MIDTRANS_CLIENT_KEY =
          form.PAYMENT_MIDTRANS_CLIENT_KEY.trim();
      }
      if (form.PAYMENT_MIDTRANS_SERVER_KEY.trim()) {
        payload.PAYMENT_MIDTRANS_SERVER_KEY =
          form.PAYMENT_MIDTRANS_SERVER_KEY.trim();
      }
      const result = await saveMidtransConfig(payload);
      toast.success(result?.message || "Konfigurasi Midtrans disimpan");
      await loadConfig();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menyimpan konfigurasi Midtrans",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Hapus key Midtrans dari database? Server akan pakai .env bila ada.",
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteMidtransConfig();
      toast.success(result?.message || "Konfigurasi Midtrans dihapus");
      setForm(emptyForm);
      await loadConfig();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menghapus konfigurasi Midtrans",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center shadow">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-950">
              Konfigurasi Midtrans
            </h1>
            <p className="text-sm text-gray-600">
              Client/Server key disimpan di DB (fallback ke .env)
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-5"
        >
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4" />
              PAYMENT_MIDTRANS_CLIENT_KEY
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder={
                meta.hasClientKey
                  ? meta.maskedClientKey || "•••• (sudah tersimpan)"
                  : "Client key Midtrans"
              }
              value={form.PAYMENT_MIDTRANS_CLIENT_KEY}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  PAYMENT_MIDTRANS_CLIENT_KEY: e.target.value,
                }))
              }
              disabled={isLoading}
              autoComplete="off"
            />
            {meta.hasClientKey && (
              <p className="text-xs text-gray-500 mt-1">
                Key tersimpan: {meta.maskedClientKey}. Isi ulang hanya jika
                ingin mengganti.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4" />
              PAYMENT_MIDTRANS_SERVER_KEY
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder={
                meta.hasServerKey
                  ? meta.maskedServerKey || "•••• (sudah tersimpan)"
                  : "Server key Midtrans (SB-… untuk sandbox)"
              }
              value={form.PAYMENT_MIDTRANS_SERVER_KEY}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  PAYMENT_MIDTRANS_SERVER_KEY: e.target.value,
                }))
              }
              disabled={isLoading}
              autoComplete="off"
            />
            {meta.hasServerKey && (
              <p className="text-xs text-gray-500 mt-1">
                Key tersimpan: {meta.maskedServerKey}. Isi ulang hanya jika
                ingin mengganti.
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={form.MIDTRANS_IS_PRODUCTION}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  MIDTRANS_IS_PRODUCTION: e.target.checked,
                }))
              }
              disabled={isLoading}
            />
            <span className="text-sm text-gray-700">
              Paksa production (MIDTRANS_IS_PRODUCTION). Jika off, environment
              mengikuti prefix key (SB- = sandbox).
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary gap-2"
              disabled={isSaving || isLoading}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              className="btn btn-ghost gap-2"
              onClick={loadConfig}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
              Muat ulang
            </button>
            <button
              type="button"
              className="btn btn-outline btn-error gap-2"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
            >
              <Trash2 className="w-4 h-4" />
              Hapus dari DB
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MidtransConfig;
