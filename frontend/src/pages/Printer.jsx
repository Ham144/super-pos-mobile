import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPrinter,
  deletePrinter,
  getAllPrinter,
  setDefaultPrinter,
  testPrinter,
  updatePrinter,
} from "@/api/printerApi";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  Printer as PrinterIcon,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  MapPin,
  Cpu,
  Network,
  Pin,
} from "lucide-react";
import toast from "react-hot-toast";

const initialFormData = {
  name: "",
  tipePrinter: "",
  ipPrinter: "",
  portPrinter: "9100",
  isDefault: false,
};

const Printer = () => {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [testingId, setTestingId] = useState(null);

  const { data: printerResponse, isLoading, error } = useQuery({
    queryKey: ["printers"],
    queryFn: getAllPrinter,
  });

  const printerList = printerResponse?.data || [];

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedPrinter(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFormData({
      ...initialFormData,
      isDefault: printerList.length === 0,
    });
    setModalMode("create");
  };

  const openEditModal = (printer) => {
    setSelectedPrinter(printer);
    setFormData({
      name: printer.name || "",
      tipePrinter: printer.tipePrinter || "",
      ipPrinter: printer.ipPrinter || "",
      portPrinter: printer.portPrinter || printer.port || "9100",
      isDefault: Boolean(printer.isDefault),
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    resetForm();
  };

  const createMutation = useMutation({
    mutationFn: createPrinter,
    onSuccess: () => {
      toast.success("Printer berhasil ditambahkan");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Gagal menambahkan printer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePrinter(id, data),
    onSuccess: () => {
      toast.success("Printer berhasil diperbarui");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui printer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrinter,
    onSuccess: () => {
      toast.success("Printer berhasil dihapus");
      setDeleteConfirm({ show: false, id: null });
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Gagal menghapus printer");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultPrinter,
    onSuccess: () => {
      toast.success("Default printer berhasil diubah");
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Gagal mengubah default printer");
    },
  });

  const testMutation = useMutation({
    mutationFn: testPrinter,
    onSuccess: () => {
      toast.success("Printer berhasil diuji");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "Gagal test printer");
    },
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      portPrinter: String(formData.portPrinter || "9100").trim(),
    };

    if (modalMode === "edit" && selectedPrinter?._id) {
      updateMutation.mutate({ id: selectedPrinter._id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleTestCurrentForm = () => {
    testMutation.mutate(formData);
  };

  const handleTestPrinter = (printer) => {
    setTestingId(printer._id);
    testPrinter(printer)
      .then(() => toast.success("Printer berhasil diuji"))
      .catch((error) =>
        toast.error(error?.response?.data?.message || error?.message || "Gagal test printer"),
      )
      .finally(() => setTestingId(null));
  };

  const handleDeletePrinter = (id) => {
    deleteMutation.mutate(id);
  };

  const handleSetDefault = (id) => {
    defaultMutation.mutate(id);
  };

  if (error) {
    return <div>Error: {error?.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
                <PrinterIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Printer Configuration
                </h1>
                <p className="text-gray-500 mt-1 max-w-2xl">
                  Kelola konfigurasi printer di web. Mobile hanya memilih config
                  yang sudah tersedia.
                </p>
              </div>
            </div>

            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-blue-200"
              onClick={openCreateModal}
            >
              <Plus className="w-5 h-5" />
              Tambah Printer
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center p-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">
                  Memuat data printer...
                </p>
              </div>
            </div>
          ) : printerList.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <PrinterIcon className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Belum Ada Printer
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Tambahkan konfigurasi printer pertama agar bisa dipilih dari
                mobile.
              </p>
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                onClick={openCreateModal}
              >
                <Plus className="w-5 h-5" />
                Tambah Printer
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
                      Tipe
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Alamat
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Default
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {printerList.map((printer) => (
                    <tr
                      key={printer._id}
                      className="hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {printer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium">
                          {printer.tipePrinter}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-sm text-gray-700">
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            {printer.ipPrinter}
                          </span>
                          <span className="flex items-center gap-2 text-gray-500">
                            <Pin className="w-4 h-4 text-gray-400" />
                            Port {printer.portPrinter || printer.port || "9100"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            printer.isDefault
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {printer.isDefault ? "Default" : "Bukan Default"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(printer)}
                            className="p-2 rounded-lg transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => handleTestPrinter(printer)}
                            disabled={testingId === printer._id}
                            className="p-2 rounded-lg transition-all duration-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                            title="Test printer"
                          >
                            {testingId === printer._id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleSetDefault(printer._id)}
                            disabled={printer.isDefault || defaultMutation.isPending}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              printer.isDefault
                                ? "bg-gray-100 text-gray-400"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                            title="Set default"
                          >
                            {printer.isDefault ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>

                          <button
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                            onClick={() =>
                              setDeleteConfirm({ show: true, id: printer._id })
                            }
                            disabled={deleteMutation.isPending}
                            title="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                      <PrinterIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {modalMode === "edit" ? "Edit Printer" : "Tambah Printer"}
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

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nama Printer
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Printer Kasir 1"
                    className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Tipe Printer
                    </label>
                    <select
                      name="tipePrinter"
                      value={formData.tipePrinter}
                      onChange={handleInputChange}
                      className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="">Pilih Tipe Printer</option>
                      <option value="EPSON">EPSON</option>
                      <option value="DARUMA">DARUMA</option>
                      <option value="STAR">STAR</option>
                      <option value="TANCA">TANCA</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Port Printer
                    </label>
                    <input
                      type="text"
                      name="portPrinter"
                      value={formData.portPrinter}
                      onChange={handleInputChange}
                      placeholder="9100"
                      className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    IP Printer
                  </label>
                  <input
                    type="text"
                    name="ipPrinter"
                    value={formData.ipPrinter}
                    onChange={handleInputChange}
                    placeholder="192.168.1.25"
                    className="w-full border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-950 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <AlertCircle className="w-4 h-4 text-blue-950" />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-700">
                          Default Printer
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Printer default akan dipakai oleh mobile jika belum ada
                          pilihan lain.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
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
                    type="button"
                    className="flex-1 px-4 py-3 border border-emerald-200 rounded-xl text-emerald-700 font-medium hover:bg-emerald-50 transition-all duration-200"
                    onClick={handleTestCurrentForm}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      testMutation.isPending ||
                      !formData.name ||
                      !formData.tipePrinter ||
                      !formData.ipPrinter ||
                      !formData.portPrinter
                    }
                  >
                    {testMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Testing...</span>
                      </div>
                    ) : (
                      "Test"
                    )}
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
                  Apakah Anda yakin ingin menghapus printer ini?
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
                    onClick={() => handleDeletePrinter(deleteConfirm.id)}
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

export default Printer;
