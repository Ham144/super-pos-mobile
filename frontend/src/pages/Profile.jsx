import { mockPages } from "@/api/constant";
import { getUserInfoComplete, updateUser } from "@/api/authApi";
import { getOuletByUserId, switchCurrentOutlet } from "@/api/outletApi";
import { useUserInfo } from "@/store";
import { formatCurrency } from "@/utils/formatCurrency";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Mail,
  Phone,
  ShieldQuestion,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  BadgeCheck,
  KeyRound,
  Store,
  Shield,
  BarChart3,
  Ban,
  Loader2,
  RefreshCw,
} from "lucide-react";

const getOutletId = (outlet) => {
  if (!outlet) return "";
  return typeof outlet === "object"
    ? outlet._id?.toString() || ""
    : outlet.toString();
};

const getOutletLabel = (outlet) => {
  if (!outlet) return "Belum di-assign";
  if (typeof outlet === "object") {
    return (
      [outlet.kodeOutlet, outlet.namaOutlet].filter(Boolean).join(" — ") ||
      outlet._id?.toString() ||
      "—"
    );
  }
  return outlet.toString();
};

const progressPct = (current = 0, target = 0) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100));
};

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userInfo, setUserInfo } = useUserInfo();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    username: "",
    password: "",
    email: "",
    telepon: "",
    roleName: "",
    kodeKasir: "",
    authMethod: "app",
    currentOutlet: "",
  });

  const {
    data: profileRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["userInfoComplete"],
    queryFn: getUserInfoComplete,
  });

  const profile = profileRes?.data;
  const outletsFromApi = profileRes?.outlets || [];

  const { data: outletsByUser } = useQuery({
    queryKey: ["outlet", profile?._id || userInfo?._id],
    queryFn: () => getOuletByUserId(profile?._id || userInfo?._id),
    enabled: !!(profile?._id || userInfo?._id),
  });

  const assignedOutlets = useMemo(() => {
    if (outletsFromApi.length) return outletsFromApi;
    if (Array.isArray(outletsByUser?.data)) return outletsByUser.data;
    if (Array.isArray(outletsByUser)) return outletsByUser;
    return [];
  }, [outletsFromApi, outletsByUser]);

  const blockedPageLabels = useMemo(() => {
    const blocked = profile?.blockedAccess || [];
    return blocked
      .map((path) => {
        const page = mockPages.find((p) => p.originalPath === path);
        if (page) return { path, label: page.originalPath, kind: "page" };
        if (String(path).startsWith("/api/")) {
          return { path, label: path, kind: "api" };
        }
        return { path, label: path, kind: "other" };
      })
      .filter((item) => item.kind === "page" || item.kind === "other");
  }, [profile?.blockedAccess]);

  useEffect(() => {
    if (!profile) return;
    setFormData({
      _id: profile._id || "",
      username: profile.username || "",
      password: "",
      email: profile.email || "",
      telepon: profile.telepon || "",
      roleName: profile.roleName || "",
      kodeKasir: profile.kodeKasir || "",
      authMethod: profile.authMethod || "app",
      currentOutlet: getOutletId(profile.currentOutlet),
    });
  }, [profile]);

  const isLdap = formData.authMethod === "ldap";

  const { mutateAsync: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!formData._id) throw new Error("User ID tidak ditemukan");
      return updateUser({
        _id: formData._id,
        email: formData.email,
        telepon: formData.telepon,
        password: isLdap ? "" : formData.password,
        roleName: formData.roleName || profile?.roleName || "Kasir",
        kodeKasir: formData.kodeKasir || profile?.kodeKasir,
        currentOutlet: formData.currentOutlet || undefined,
        blockedAccess: profile?.blockedAccess,
      });
    },
    onSuccess: async () => {
      toast.success("Profil berhasil diperbarui");
      setFormData((prev) => ({ ...prev, password: "" }));
      await queryClient.invalidateQueries({ queryKey: ["userInfoComplete"] });
      await queryClient.invalidateQueries({ queryKey: ["userInfo"] });
      const refreshed = await getUserInfoComplete();
      if (refreshed?.data) {
        setUserInfo({
          ...(userInfo || {}),
          ...refreshed.data,
        });
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal menyimpan profil",
      );
    },
  });

  const { mutate: handleSwitchOutlet, isPending: isSwitching } = useMutation({
    mutationFn: switchCurrentOutlet,
    onSuccess: (data, outletId) => {
      const selected =
        data?.currentOutlet ||
        assignedOutlets.find((o) => String(o._id) === String(outletId)) ||
        outletId;
      setFormData((prev) => ({
        ...prev,
        currentOutlet: getOutletId(selected),
      }));
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          currentOutlet: selected,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["userInfoComplete"] });
      toast.success("Outlet aktif diganti");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Gagal mengganti outlet aktif",
      );
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const salesPct = progressPct(
    profile?.totalHargaPenjualan,
    profile?.targetHargaPenjualan,
  );
  const qtyPct = progressPct(
    profile?.totalQuantityPenjualan,
    profile?.targetQuantityPenjualan,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/30 to-gray-50">
        <div className="flex items-center gap-3 text-blue-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Memuat profil...</span>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/30 to-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center space-y-4">
          <p className="text-red-600 font-medium">Gagal memuat data profil</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const initials = (formData.username || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{formData.username}</h1>
              <p className="text-blue-100 text-sm mt-0.5">
                Kelola informasi akun, outlet, dan performa penjualan
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {formData.roleName || "—"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium">
                  <KeyRound className="w-3.5 h-3.5" />
                  {isLdap ? "LDAP / SSO" : "App Account"}
                </span>
                {formData.kodeKasir ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium">
                    Kode: {formData.kodeKasir}
                  </span>
                ) : null}
                {profile.isDisabled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/80 text-xs font-medium">
                    Dinonaktifkan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/30 text-xs font-medium">
                    Aktif
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="self-start sm:self-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Main form */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-md border border-blue-100 p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-700" />
                  Data akun
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Field yang dikunci hanya bisa diubah oleh admin.
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-950" />
                  Username
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="Tidak bisa diubah — dipakai sebagai FK invoice"
                  >
                    <ShieldQuestion className="w-4 h-4 text-gray-400 cursor-help" />
                  </div>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.roleName}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Kode Kasir
                  </label>
                  <input
                    type="text"
                    value={formData.kodeKasir || "—"}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password — app only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-950" />
                  Password
                </label>
                {isLdap ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Akun LDAP: password dikelola Active Directory, tidak bisa
                      diubah dari sini.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 bg-gray-50"
                        placeholder="Biarkan kosong jika tidak ingin mengubah"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Kosongkan jika tidak ingin mengubah password
                    </p>
                  </>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-950" />
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 bg-gray-50"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              {/* Telepon */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-950" />
                  Telepon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="telepon"
                    value={formData.telepon}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 bg-gray-50"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-medium flex items-center gap-2 shadow-md disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>

          {/* Side panels */}
          <div className="lg:col-span-2 space-y-4">
            {/* Outlet */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-700" />
                Outlet
              </h2>
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-sm">
                <p className="text-xs text-blue-600 font-medium">Outlet aktif</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {getOutletLabel(profile.currentOutlet)}
                </p>
              </div>

              {assignedOutlets.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Belum terhubung ke outlet. Minta admin assign ke kasirList.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Outlet yang bisa Anda akses ({assignedOutlets.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {assignedOutlets.map((outlet) => {
                      const id = getOutletId(outlet);
                      const active = id === formData.currentOutlet;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={isSwitching || active}
                          onClick={() => handleSwitchOutlet(id)}
                          className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                            active
                              ? "border-blue-300 bg-blue-50 text-blue-800"
                              : "border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-700"
                          } disabled:opacity-70`}
                        >
                          <span className="font-medium">
                            {outlet.kodeOutlet || "—"}
                          </span>
                          <span className="text-gray-500">
                            {" "}
                            — {outlet.namaOutlet || id}
                          </span>
                          {active ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
                              aktif
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sales */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-700" />
                Performa penjualan
              </h2>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Omzet</span>
                  <span>
                    {formatCurrency(profile.totalHargaPenjualan || 0)} /{" "}
                    {formatCurrency(profile.targetHargaPenjualan || 0)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${salesPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-right">{salesPct}%</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Quantity</span>
                  <span>
                    {Number(profile.totalQuantityPenjualan || 0).toLocaleString(
                      "id-ID",
                    )}{" "}
                    /{" "}
                    {Number(
                      profile.targetQuantityPenjualan || 0,
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${qtyPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-right">{qtyPct}%</p>
              </div>
            </div>

            {/* Access */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-700" />
                Akses diblokir
              </h2>
              <p className="text-xs text-gray-500">
                Halaman yang tidak bisa Anda buka (diatur admin).
              </p>
              {blockedPageLabels.length === 0 ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  Tidak ada blok halaman — akses penuh ke menu yang tersedia.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {blockedPageLabels.map((item) => (
                    <span
                      key={item.path}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 text-[11px] font-medium"
                      title={item.path}
                    >
                      <Ban className="w-3 h-3" />
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5 text-xs text-gray-500 space-y-1">
              <p>
                Dibuat:{" "}
                {profile.createdAt
                  ? new Date(profile.createdAt).toLocaleString("id-ID")
                  : "—"}
              </p>
              <p>
                Diperbarui:{" "}
                {profile.updatedAt
                  ? new Date(profile.updatedAt).toLocaleString("id-ID")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
