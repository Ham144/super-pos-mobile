import React, { useEffect, useState } from "react";
import {
  Network,
  RefreshCw,
  Save,
  Trash2,
  PlugZap,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteAdConfig,
  getAdConfig,
  saveAdConfig,
  testLdapConnection,
} from "@/api/adminApi";

const emptyForm = {
  AD_HOST: "",
  AD_PORT: 389,
  AD_DOMAIN: "",
  AD_BASE_DN: "",
};

const LdapConfig = () => {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testUser, setTestUser] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testResult, setTestResult] = useState(null);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await getAdConfig();
      const config = result?.config || {};
      setForm({
        AD_HOST: config.AD_HOST || "",
        AD_PORT: config.AD_PORT || 389,
        AD_DOMAIN: config.AD_DOMAIN || "",
        AD_BASE_DN: config.AD_BASE_DN || "",
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal memuat konfigurasi LDAP",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "AD_PORT" ? Number(value) || "" : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.AD_HOST || !form.AD_DOMAIN) {
      toast.error("AD_HOST dan AD_DOMAIN wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveAdConfig({
        AD_HOST: form.AD_HOST.trim(),
        AD_PORT: Number(form.AD_PORT) || 389,
        AD_DOMAIN: form.AD_DOMAIN.trim(),
        AD_BASE_DN: form.AD_BASE_DN.trim(),
      });
      toast.success(result?.message || "Konfigurasi LDAP disimpan");
      await loadConfig();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menyimpan konfigurasi LDAP",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Hapus seluruh konfigurasi Active Directory / LDAP global?",
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteAdConfig();
      toast.success(result?.message || "Konfigurasi LDAP dihapus");
      setForm(emptyForm);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Gagal menghapus konfigurasi LDAP",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testUser.trim() || !testPassword) {
      toast.error("Username dan password LDAP wajib untuk tester");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testLdapConnection({
        username: testUser.trim(),
        password: testPassword,
        AD_HOST: form.AD_HOST.trim() || undefined,
        AD_PORT: Number(form.AD_PORT) || undefined,
        AD_DOMAIN: form.AD_DOMAIN.trim() || undefined,
        AD_BASE_DN: form.AD_BASE_DN.trim() || undefined,
      });
      setTestResult(result);
      toast.success(result?.message || "Koneksi LDAP berhasil");
    } catch (error) {
      const errBody = error?.response?.data;
      setTestResult(errBody || { success: false, message: error.message });
      toast.error(errBody?.message || "Gagal menguji koneksi LDAP");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Konfigurasi LDAP / Active Directory
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Atur koneksi AD untuk login LDAP dan uji bind kredensial
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Parameter AD
            </h2>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AD_HOST
              </label>
              <input
                name="AD_HOST"
                value={form.AD_HOST}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="dc01.csi.my.id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AD_PORT
              </label>
              <input
                name="AD_PORT"
                type="number"
                value={form.AD_PORT}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="389"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AD_DOMAIN (NetBIOS)
              </label>
              <input
                name="AD_DOMAIN"
                value={form.AD_DOMAIN}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="csi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AD_BASE_DN
              </label>
              <input
                name="AD_BASE_DN"
                value={form.AD_BASE_DN}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="DC=csi,DC=my,DC=id"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Bind memakai format{" "}
            <code className="bg-gray-100 px-1 rounded">DOMAIN\username</code>.
            Jika RootDSE tersedia,{" "}
            <code className="bg-gray-100 px-1 rounded">defaultNamingContext</code>{" "}
            akan dipakai sebagai BASE_DN saat login/test.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Menghapus..." : "Hapus Config"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Tester Koneksi LDAP
          </h2>
        </div>

        <form onSubmit={handleTest} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (sAMAccountName)
              </label>
              <input
                type="text"
                value={testUser}
                onChange={(e) => setTestUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="nama.user"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isTesting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            <PlugZap className="w-4 h-4" />
            {isTesting ? "Menguji..." : "Test Bind LDAP"}
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

export default LdapConfig;
