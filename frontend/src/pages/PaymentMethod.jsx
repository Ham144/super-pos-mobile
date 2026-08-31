import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllPaymentMethod,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
} from "../api/paymentMethodApi";
import { getOuletList } from "../api/outletApi";

import {
  Plus,
  CreditCard,
  Percent,
  Coins,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Banknote,
  QrCode,
  Wallet,
  Landmark,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Info,
  Edit,
} from "lucide-react";

const PaymentMethod = () => {
  const queryClient = useQueryClient();

  const initialFormData = {
    method: "",
    discount: "",
    additional_fee: "",
    gatewayProvider: null,
    status: true,
    outletIds: [],
  };

  // State untuk modal tambah/edit metode pembayaran
  const [modalMode, setModalMode] = useState(null);

  // State untuk alert/notifikasi
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedOutletFilter, setSelectedOutletFilter] = useState("all");

  // State untuk form
  const [formData, setFormData] = useState(initialFormData);

  // State untuk konfirmasi hapus
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  const { data: outletResponse, isLoading: isOutletLoading } = useQuery({
    queryKey: ["outlets"],
    queryFn: getOuletList,
  });

  const outletList = outletResponse?.data || [];

  // Menggunakan TanStack Query untuk fetch data
  const {
    data: paymentMethods = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["paymentMethods", selectedOutletFilter],
    queryFn: () =>
      getAllPaymentMethod(
        selectedOutletFilter && selectedOutletFilter !== "all"
          ? { outletId: selectedOutletFilter }
          : {}
      ),
  });

  const resetFormData = () => {
    setFormData(initialFormData);
    setSelectedMethod(null);
  };

  const getOutletIdsForMethod = (methodId) =>
    outletList
      .filter((outlet) =>
        (outlet.paymentList || []).some(
          (paymentId) => String(paymentId) === String(methodId)
        )
      )
      .map((outlet) => outlet._id);

  const openCreateModal = () => {
    resetFormData();
    setModalMode("create");
  };

  const openEditModal = (method) => {
    setSelectedMethod(method);
    setFormData({
      method: method.method || "",
      discount:
        method.discount === undefined || method.discount === null
          ? ""
          : String(method.discount),
      additional_fee:
        method.additional_fee === undefined || method.additional_fee === null
          ? ""
          : String(method.additional_fee),
      gatewayProvider: method.gatewayProvider || null,
      status: Boolean(method.status),
      outletIds: getOutletIdsForMethod(method._id),
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    resetFormData();
  };

  const toggleOutletSelection = (outletId) => {
    setFormData((prev) => {
      const outletIds = prev.outletIds || [];
      const nextOutletIds = outletIds.includes(outletId)
        ? outletIds.filter((id) => id !== outletId)
        : [...outletIds, outletId];

      return {
        ...prev,
        outletIds: nextOutletIds,
      };
    });
  };

  // Mutasi untuk menambah metode pembayaran
  const createMutation = useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      showAlert("Metode pembayaran berhasil ditambahkan");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
    onError: () => {
      showAlert("Gagal menambahkan metode pembayaran", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePaymentMethod(id, data),
    onSuccess: () => {
      showAlert("Metode pembayaran berhasil diperbarui");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
    onError: () => {
      showAlert("Gagal memperbarui metode pembayaran", "error");
    },
  });

  // Mutasi untuk menghapus metode pembayaran
  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      showAlert("Metode pembayaran berhasil dihapus");
      setDeleteConfirm({ show: false, id: null });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
    onError: () => {
      showAlert("Gagal menghapus metode pembayaran", "error");
    },
  });

  // Mutasi untuk mengubah status metode pembayaran
  const toggleStatusMutation = useMutation({
    mutationFn: togglePaymentMethodStatus,
    onSuccess: () => {
      showAlert("Status metode pembayaran berhasil diubah");
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
    onError: () => {
      showAlert("Gagal mengubah status metode pembayaran", "error");
    },
  });
  
  // Fungsi untuk menampilkan alert/notifikasi
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Fungsi untuk menangani perubahan pada form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : name === "gatewayProvider"
          ? value || null
          : value,
    });
  };

  // Fungsi untuk menambah metode pembayaran baru
  const handleAddPaymentMethod = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      outletIds: formData.outletIds || [],
    };

    if (modalMode === "edit" && selectedMethod?._id) {
      updateMutation.mutate({ id: selectedMethod._id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  // Fungsi untuk menghapus metode pembayaran
  const handleDeletePaymentMethod = (id) => {
    deleteMutation.mutate(id);
  };

  // Fungsi untuk mengubah status aktif/nonaktif metode pembayaran
  const handleToggleStatus = (id) => {
    toggleStatusMutation.mutate(id);
  };

  if (error) {
    return <div>Error: {error?.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert/Notifikasi */}
        {alert.show && (
          <div className="fixed top-4 right-4 z-50 animate-slideIn">
            <div
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl ${
                alert.type === "error"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600"
              } text-white`}
            >
              {alert.type === "error" ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
              <span className="font-medium">{alert.message}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Metode Pembayaran external
                </h1>
                <p className="text-gray-500 mt-1 flex items-center gap-1">
                  Atur kategori pembayaran offline (pengganti online payment e.g:midtrans), berguna untuk transaksi offline
                  <div
                    className="tooltip tooltip-right"
                    data-tip="Metode pembayaran yang aktif akan tersedia untuk transaksi"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </div>
                </p>
              </div>
            </div>
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-blue-200"
              onClick={openCreateModal}
            >
              <Plus className="w-5 h-5" />
              Tambah Metode Pembayaran
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Outlet
              </label>
              <select
                className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                value={selectedOutletFilter}
                onChange={(e) => setSelectedOutletFilter(e.target.value)}
                disabled={isOutletLoading}
              >
                <option value="all">Semua Outlet</option>
                {outletList.map((outlet) => (
                  <option key={outlet._id} value={outlet._id}>
                    {outlet.kodeOutlet} - {outlet.namaOutlet}
                  </option>
                ))}
              </select>
            </div>
            
          </div>
        </div>

        {/* Tabel Metode Pembayaran */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center p-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">
                  Memuat data metode pembayaran...
                </p>
              </div>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <CreditCard className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Belum Ada Metode Pembayaran
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Tambahkan metode pembayaran pertama Anda untuk mulai menerima
                pembayaran melalui aplikasi mobile.
              </p>
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                onClick={openCreateModal}
              >
                <Plus className="w-5 h-5" />
                Tambah Metode Pembayaran
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Metode Pembayaran
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Diskon
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Biaya Tambahan
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Integrasi
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Outlet
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
                  {paymentMethods.map((method) => (
                    <tr
                      key={method._id}
                      className="hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                            {method.method.toLowerCase().includes("qris") ? (
                              <QrCode className="w-5 h-5 text-blue-600" />
                            ) : method.method.toLowerCase().includes("bank") ? (
                              <Landmark className="w-5 h-5 text-blue-600" />
                            ) : method.method.toLowerCase().includes("cash") ? (
                              <Banknote className="w-5 h-5 text-blue-600" />
                            ) : method.method
                                .toLowerCase()
                                .includes("wallet") ? (
                              <Wallet className="w-5 h-5 text-blue-600" />
                            ) : (
                              <CreditCard className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <span className="font-medium text-gray-800">
                            {method.method}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {method.discount ? (
                          <div className="flex items-center gap-1">
                            <Percent className="w-4 h-4 text-emerald-500" />
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium">
                              {method.discount}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {method.additional_fee ? (
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm font-medium">
                              Rp {method.additional_fee.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {method.isSystem || method.gatewayProvider === "midtrans" ? (
                          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-medium">
                            Sistem
                          </span>
                        ) : method.gatewayProvider === "midtrans" ? (
                          <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-lg text-sm font-medium">
                            Midtrans
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Manual</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 max-w-md">
                          {outletList
                            .filter((outlet) =>
                              (outlet.paymentList || []).some(
                                (paymentId) =>
                                  String(paymentId) === String(method._id)
                              )
                            )
                            .map((outlet) => (
                              <span
                                key={outlet._id}
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium"
                              >
                                {outlet.kodeOutlet}
                              </span>
                            ))}
                          {!outletList.some((outlet) =>
                            (outlet.paymentList || []).some(
                              (paymentId) =>
                                String(paymentId) === String(method._id)
                            )
                          ) && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              method.status
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {method.status ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {method.isSystem || method.gatewayProvider === "midtrans" ? (
                          <span className="text-xs font-medium text-purple-600">
                            Terkunci oleh sistem
                          </span>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <div className="tooltip" data-tip={"manage"}>
                              <button
                                onClick={() => openEditModal(method)}
                                disabled={toggleStatusMutation.isPending}
                                className="p-2 rounded-lg transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200"
                              >
                                <Edit />
                              </button>
                            </div>
                            <div
                              className="tooltip"
                              data-tip={
                                method.status ? "Nonaktifkan" : "Aktifkan"
                              }
                            >
                              <button
                                onClick={() => handleToggleStatus(method._id)}
                                disabled={toggleStatusMutation.isPending}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  method.status
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {method.status ? (
                                  <ToggleRight className="w-5 h-5" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5" />
                                )}
                              </button>
                            </div>

                            <div className="tooltip" data-tip="Hapus">
                              <button
                                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                                onClick={() =>
                                  setDeleteConfirm({ show: true, id: method._id })
                                }
                                disabled={
                                  toggleStatusMutation.isPending ||
                                  deleteMutation.isPending
                                }
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Tambah/Edit Metode Pembayaran */}
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {modalMode === "edit"
                        ? "Edit Metode Pembayaran"
                        : "Tambah Metode Pembayaran"}
                    </h3>
                  </div>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={closeModal}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddPaymentMethod} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nama Metode Pembayaran
                  </label>
                  <input
                    type="text"
                    name="method"
                    value={formData.method}
                    onChange={handleInputChange}
                    placeholder="Contoh: QRIS, Bank Transfer, Cash"
                    className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Masukkan nama metode pembayaran
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      Detail Tambahan (Opsional)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Percent className="w-4 h-4 text-blue-950" />
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      placeholder="0 - 100"
                      className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500" />
                      Biaya Tambahan (Rp)
                    </label>
                    <input
                      type="number"
                      name="additional_fee"
                      value={formData.additional_fee}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Contoh: 5000"
                      className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-purple-700 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">
                        Midtrans adalah metode sistem
                      </p>
                      <p className="text-xs text-purple-800 mt-1">
                        Metode gateway ini dibuat otomatis oleh sistem, selalu aktif, dan tidak bisa dibuat, diubah, atau dihapus dari halaman ini.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Info className="w-4 h-4 text-blue-950" />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-700">
                          Status Aktif
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.status
                            ? "Metode pembayaran akan langsung tersedia untuk transaksi"
                            : "Metode pembayaran tidak akan ditampilkan di aplikasi"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          status: !prev.status,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.status ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.status ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </label>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Tautkan Outlet
                      </h4>
                      <p className="text-xs text-gray-500">
                        Centang outlet yang boleh memakai metode ini. Data ini disimpan ke
                        <span className="font-medium"> Outlet.paymentList</span>.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {formData.outletIds?.length || 0} outlet dipilih
                    </span>
                  </div>

                  {outletList.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Belum ada outlet yang tersedia.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {outletList.map((outlet) => {
                        const checked = (formData.outletIds || []).includes(
                          outlet._id
                        );

                        return (
                          <label
                            key={outlet._id}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                              checked
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600"
                              checked={checked}
                              onChange={() => toggleOutletSelection(outlet._id)}
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-800 truncate">
                                {outlet.namaOutlet}
                              </div>
                              <div className="text-xs text-gray-500">
                                {outlet.kodeOutlet}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                    onClick={closeModal}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {modalMode === "edit" ? "Memperbarui..." : "Menyimpan..."}
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

        {/* Modal Konfirmasi Hapus */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-scaleIn">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Konfirmasi Hapus
                </h3>
                <p className="text-gray-600 mb-2">
                  Apakah Anda yakin ingin menghapus metode pembayaran ini?
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                    onClick={() => setDeleteConfirm({ show: false, id: null })}
                    disabled={deleteMutation.isPending}
                  >
                    Tidak
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    onClick={() => handleDeletePaymentMethod(deleteConfirm.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghapus...</span>
                      </div>
                    ) : (
                      "Ya, Hapus"
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

export default PaymentMethod;
