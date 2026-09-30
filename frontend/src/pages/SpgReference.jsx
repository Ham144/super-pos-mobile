import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  registerSpg,
  editSpg,
  getAllSpg,
  deleteSpg,
} from "@/api/spgApi";
import {
  BadgeInfo,
  CircleAlert,
  DatabaseZap,
  Edit,
  Loader2,
  Plus,
  Shield,
  ShieldOff,
  Target,
  UserRound,
  X,
} from "lucide-react";

const initialFormData = {
  name: "",
  targetHargaPenjualan: "",
  targetQuantityPenjualan: "",
};

const StatCard = ({ label, value, accentClass, icon: Icon }) => (
  <div className={`rounded-2xl px-4 py-3 text-white shadow-lg ${accentClass}`}>
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-white/80">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

const SpgReference = () => {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState(null);
  const [selectedSpg, setSelectedSpg] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  const { data: spgResponse, isLoading, error } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  const spgList = spgResponse?.data || [];

  const stats = useMemo(() => {
    const active = spgList.filter((spg) => !spg.isDisabled).length;
    const inactive = spgList.filter((spg) => spg.isDisabled).length;
    const skuEntries = spgList.reduce(
      (total, spg) => total + (spg?.skuTerjual?.length || 0),
      0,
    );

    return {
      total: spgList.length,
      active,
      inactive,
      skuEntries,
    };
  }, [spgList]);

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedSpg(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
  };

  const openEditModal = (spg) => {
    setSelectedSpg(spg);
    setFormData({
      name: spg?.name || "",
      targetHargaPenjualan:
        spg?.targetHargaPenjualan === undefined || spg?.targetHargaPenjualan === null
          ? ""
          : String(spg.targetHargaPenjualan),
      targetQuantityPenjualan:
        spg?.targetQuantityPenjualan === undefined || spg?.targetQuantityPenjualan === null
          ? ""
          : String(spg.targetQuantityPenjualan),
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    resetForm();
  };

  const createMutation = useMutation({
    mutationFn: registerSpg,
    onSuccess: () => {
      toast.success("SPG reference berhasil ditambahkan");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["spg"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Gagal menambahkan SPG");
    },
  });

  const updateMutation = useMutation({
    mutationFn: editSpg,
    onSuccess: () => {
      toast.success("SPG reference berhasil diperbarui");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["spg"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Gagal memperbarui SPG");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: deleteSpg,
    onSuccess: (res) => {
      toast.success(res?.message || "Status SPG berhasil diubah");
      setDeleteConfirm({ show: false, id: null });
      queryClient.invalidateQueries({ queryKey: ["spg"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Gagal mengubah status SPG");
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      targetHargaPenjualan:
        formData.targetHargaPenjualan === ""
          ? 0
          : Number(formData.targetHargaPenjualan),
      targetQuantityPenjualan:
        formData.targetQuantityPenjualan === ""
          ? 0
          : Number(formData.targetQuantityPenjualan),
    };

    if (modalMode === "edit" && selectedSpg?._id) {
      updateMutation.mutate({ ...payload, id: selectedSpg._id });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleToggleStatus = (spgId) => {
    toggleMutation.mutate(spgId);
  };

  if (error) {
    return <div>Error: {error?.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-blue-100 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 shadow-lg shadow-blue-200">
                <DatabaseZap className="h-7 w-7 text-white" />
              </div>
              <div className="max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-800">
                  SPG Reference
                </h1>
                <p className="mt-1 text-gray-500">
                  SPG di sini adalah data referensi stateless. Tidak ada login,
                  password, atau session. Data ini dipakai untuk catatan,
                  target penjualan, dan laporan transaksi.
                  jika tidak muncul spg yang ditujukan, hubungkan dulu ke <a href="outlet_list" className="link text-blue-400">outlet</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total SPG"
            value={stats.total}
            accentClass="bg-gradient-to-r from-blue-600 to-blue-700"
            icon={UserRound}
          />
          <StatCard
            label="Aktif"
            value={stats.active}
            accentClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
            icon={Shield}
          />
          <StatCard
            label="Nonaktif"
            value={stats.inactive}
            accentClass="bg-gradient-to-r from-rose-500 to-rose-600"
            icon={ShieldOff}
          />
          <StatCard
            label="Item SKU Terjual"
            value={stats.skuEntries}
            accentClass="bg-gradient-to-r from-slate-700 to-slate-800"
            icon={DatabaseZap}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
          <div className="flex flex-col gap-3 border-b border-blue-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                CRUD SPG Reference
              </h2>
              <p className="text-sm text-gray-500">
                Tambah, ubah, nonaktifkan, atau aktifkan data SPG reference.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
              onClick={openCreateModal}
            >
              <Plus className="h-5 w-5" />
              Tambah SPG
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="font-medium text-gray-500">
                  Memuat data SPG reference...
                </p>
              </div>
            </div>
          ) : spgList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <UserRound className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-800">
                Belum Ada SPG
              </h3>
              <p className="mb-6 max-w-md text-gray-500">
                Buat data SPG reference untuk digunakan sebagai catatan transaksi
                dan penugasan outlet.
              </p>
              <button
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                onClick={openCreateModal}
              >
                <Plus className="h-5 w-5" />
                Tambah SPG
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Nama
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Target
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {spgList.map((spg) => (
                    <tr
                      key={spg._id}
                      className="group transition-all duration-200 hover:bg-blue-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50">
                            <UserRound className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {spg.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              SPG reference
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-emerald-500" />
                            <span>
                              Rp{" "}
                              {Number(
                                spg.targetHargaPenjualan || 0,
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-500" />
                            <span>{spg.targetQuantityPenjualan || 0} qty</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <DatabaseZap className="h-4 w-4 text-sky-500" />
                            <span>
                              Rp{" "}
                              {Number(
                                spg.totalHargaPenjualan || 0,
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DatabaseZap className="h-4 w-4 text-sky-500" />
                            <span>{spg.totalQuantityPenjualan || 0} qty</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-lg px-3 py-1 text-sm font-medium ${
                            spg.isDisabled
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {spg.isDisabled ? "Nonaktif" : "Aktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(spg)}
                            className="rounded-lg bg-blue-100 p-2 text-blue-700 transition-all duration-200 hover:bg-blue-200"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            className={`rounded-lg p-2 transition-all duration-200 ${
                              spg.isDisabled
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            }`}
                            onClick={() =>
                              setDeleteConfirm({
                                show: true,
                                id: spg._id,
                                isDisabled: spg.isDisabled,
                              })
                            }
                            disabled={toggleMutation.isPending}
                            title={spg.isDisabled ? "Aktifkan" : "Nonaktifkan"}
                          >
                            {spg.isDisabled ? (
                              <Shield className="h-5 w-5" />
                            ) : (
                              <ShieldOff className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl max-h-[90vh]">
              <div className="border-b border-blue-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
                      <UserRound className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {modalMode === "edit" ? "Edit SPG" : "Tambah SPG"}
                    </h3>
                  </div>
                  <button
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                    onClick={closeModal}
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nama SPG
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Sinta"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-950"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Target Harga Penjualan
                    </label>
                    <input
                      type="number"
                      name="targetHargaPenjualan"
                      value={formData.targetHargaPenjualan}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Target Quantity Penjualan
                    </label>
                    <input
                      type="number"
                      name="targetQuantityPenjualan"
                      value={formData.targetQuantityPenjualan}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-950"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        SPG bersifat stateless
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Data ini hanya dipakai sebagai referensi transaksi.
                        Tidak ada password, session, atau role akses seperti
                        user login.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
                    onClick={closeModal}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-medium text-white transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {modalMode === "edit"
                            ? "Memperbarui..."
                            : "Menyimpan..."}
                        </span>
                      </div>
                    ) : modalMode === "edit" ? (
                      "Perbarui"
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <ShieldOff className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-800">
                  Konfirmasi Status SPG
                </h3>
                <p className="mb-2 text-gray-600">
                  SPG akan{" "}
                  {deleteConfirm.isDisabled
                    ? "diaktifkan kembali"
                    : "dinonaktifkan"}
                  .
                </p>
                <p className="mb-6 text-sm text-gray-500">
                  Ini tidak menghapus relasi lama, hanya mengubah status.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
                    onClick={() => setDeleteConfirm({ show: false, id: null })}
                    disabled={toggleMutation.isPending}
                  >
                    Tidak
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 font-medium text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                    onClick={() => handleToggleStatus(deleteConfirm.id)}
                    disabled={toggleMutation.isPending}
                  >
                    {toggleMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memproses...</span>
                      </div>
                    ) : deleteConfirm.isDisabled ? (
                      "Ya, Aktifkan"
                    ) : (
                      "Ya, Nonaktifkan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpgReference;
