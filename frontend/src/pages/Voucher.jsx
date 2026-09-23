import React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import {
  addVoucherLogic,
  deleteVoucher,
  getAllVouchers,
  updateVoucherLogic,
} from "../api/voucherApi";
import { getAllinventories } from "../api/itemLibraryApi";
import PickMultiInventoriesDialog from "../components/multiInventoriesList";
import { useFilter } from "../store";
import FilterInventories from "../components/filterInventories";
import {
  FileWarningIcon,
  X,
  Trash2,
  CheckCircle2,
  Copy,
  Share2,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router";
import GeneratedVoucherList from "@/components/GeneratedVoucherList";
import QRCode from "react-qr-code";

const Voucher = () => {
  const [selectedVoucher, setSelectedVoucher] = useState(null); // Voucher yang dipilih
  const [newVoucher, setNewVoucher] = useState();
  const [showEdit, setShowEdit] = useState(false); // Menampilkan layout kanan

  const [tempSkuterhubung, setTempSkuTerhubung] = useState([]);
  const [tempSkuTerputus, setTempSkuTerputus] = useState([]);

  //zustand
  const { filter, setFilter } = useFilter();

  const base = window.location.origin;
  const frontendURL = `${base}/voucher/generation?publicCode=`;

  //tanstack
  const { data: inventoryList } = useQuery({
    queryKey: ["inventories", filter],
    queryFn: (filter) => getAllinventories(filter),
  });
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  // Variable untuk menandai apakah kita hendak pindah ke mode edit
  const [isMovingToEdit, setIsMovingToEdit] = useState(false);

  const { mutateAsync: handleRegisterVoucher } = useMutation({
    mutationFn: async (body) => {
      if (body.tipeSyarat == "totalRp") {
        body.minimalPembelianTotalRp = Number(body.minimalPembelianTotalRp);
      }
      const res = await addVoucherLogic(body);
      return res?.data;
    },
    mutationKey: ["voucher"],
    onSuccess: (res) => {
      toast.success(res?.response?.data?.message || "Berhasil membuat voucher");
      queryClient.invalidateQueries(["voucher"]);
      setNewVoucher();
      setShowEdit(false);
      setSelectedVoucher(null);
      setTempSkuTerhubung([]);
      setTempSkuTerputus([]);
      setShowEdit(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message);
      setSelectedVoucher(null);
      setTempSkuTerhubung([]);
      setTempSkuTerputus([]);
    },
  });

  const { data: voucherList } = useQuery({
    queryFn: getAllVouchers,
    queryKey: ["voucher"],
  });

  const { mutateAsync: handleUpdateVoucher } = useMutation({
    mutationFn: (body) => updateVoucherLogic(body),
    mutationKey: ["voucher"],
    onSuccess: (response) => {
      queryClient.invalidateQueries(["inventories"]);
      toast.success(response?.message);
      setSelectedVoucher();
      setNewVoucher();
      setShowEdit(false);
      setSelectedVoucher(null);
      setTempSkuTerhubung([]);
      setTempSkuTerputus([]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message);
      setSelectedVoucher(null);
      setTempSkuTerhubung([]);
      setTempSkuTerputus([]);
    },
  });

  const { mutateAsync: handleDeleteVoucher } = useMutation({
    mutationFn: (id) => deleteVoucher(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["voucher"]);
      setSelectedVoucher(null);
      setNewVoucher(null);
      toast.success(response.message);
    },
  });

  const handleEditVoucher = () => {
    // Voucher terpilih harus sudah diset dari sebelumnya
    setShowEdit(true);
  };

  // Effect untuk menambahkan listener pada dialog
  useEffect(() => {
    const dialogElement = document.getElementById("showDetailVoucher");

    const handleDialogClose = () => {
      // Reset state saat dialog ditutup, tapi jangan reset jika pindah ke mode edit
      if (!isMovingToEdit) {
        setSelectedVoucher(null);
      }

      // Reset flag setelah dialog ditutup
      setIsMovingToEdit(false);
    };

    if (dialogElement) {
      dialogElement.addEventListener("close", handleDialogClose);
    }

    return () => {
      if (dialogElement) {
        dialogElement.removeEventListener("close", handleDialogClose);
      }
    };
  }, [isMovingToEdit]);

  // Tambah fungsi baru untuk mengelola transisi dari modal detail ke edit panel
  const handleMoveToEditFromDetail = () => {
    // Set flag bahwa kita akan pindah ke mode edit
    setIsMovingToEdit(true);

    // Tutup modal detail
    const modalElement = document.getElementById("showDetailVoucher");
    if (modalElement) {
      modalElement.close();
    }

    // Aktifkan mode edit
    setShowEdit(true);
  };

  const closeVoucherEditor = () => {
    setSelectedVoucher(null);
    setNewVoucher(null);
    setShowEdit(false);
    setTempSkuTerhubung([]);
    document.getElementById("voucherEditor")?.close();
  };

  useEffect(() => {
    const editor = document.getElementById("voucherEditor");
    if (!editor) return;

    if (showEdit) {
      if (!editor.open) editor.showModal();
    } else if (editor.open) {
      editor.close();
    }
  }, [showEdit]);

  // Handle klik baris voucher
  const handleRowClick = (voucher) => {
    // Reset state dahulu
    setSelectedVoucher(null);

    // Kemudian set state baru dengan data yang benar
    setTimeout(() => {
      // Format data terlebih dahulu
      const formattedVoucher = {
        ...voucher,
        berlakuDari: new Date(voucher?.berlakuDari).toISOString().split("T")[0],
        berlakuHingga: new Date(voucher?.berlakuHingga)
          .toISOString()
          .split("T")[0],
      };

      setSelectedVoucher(formattedVoucher);
      setTempSkuTerhubung(voucher.skuList || []);

      // Pastikan elemen modal ada sebelum dipanggil
      setTimeout(() => {
        const modalElement = document.getElementById("showDetailVoucher");
        if (modalElement) {
          modalElement.showModal();
        } else {
          toast.error("Modal tidak ditemukan");
        }
      }, 0);
    }, 0);
  };

  // Handle klik tombol "Buat Aturan Voucher Baru"
  const handleNewVoucher = () => {
    setSelectedVoucher(null);
    setNewVoucher();
    setNewVoucher({
      judulVoucher: "",
      tipeSyarat: "quantity",
      potongan: "",
      minimalPembelianQuantity: "",
      minimalPembelianTotalRp: "",
      berlakuDari: new Date().toISOString().split("T")[0],
      berlakuHingga: "",
      quantityTersedia: "",
      skuList: "",
    });
    setShowEdit(true);
  };

  const handleKonfirmasiVoucherTerhubung = async () => {
    selectedVoucher
      ? setSelectedVoucher((prev) => ({
          ...prev,
          skuList: tempSkuterhubung,
        }))
      : setNewVoucher((prev) => ({
          ...prev,
          skuList: tempSkuterhubung,
        }));
    document.getElementById("pickvoucher").close();
  };

  const [currentTab, setCurrentTab] = useState("voucherRefrence"); //generatedVoucher

  return (
    <div className="flex flex-col">
      {/* Tab Navigation */}
      <div className="tabs tabs-boxed bg-blue-100 rounded-lg p-1 shadow-md">
        {/* Tombol Daftar Voucher */}
        <button
          className={`tab tab-lg flex-grow text-blue-800 font-semibold transition-all duration-300 ease-in-out
      ${
        currentTab === "voucherRefrence"
          ? "tab-active bg-blue-600 text-white shadow-lg"
          : "hover:bg-blue-200"
      }
    `}
          onClick={() => setCurrentTab("voucherRefrence")}
        >
          Daftar Voucher
        </button>

        {/* Tombol Generated Voucher */}
        <button
          className={`tab tab-lg flex-grow text-blue-800 font-semibold transition-all duration-300 ease-in-out
      ${
        currentTab === "generatedVoucher"
          ? "tab-active bg-blue-600 text-white shadow-lg"
          : "hover:bg-blue-200"
      }
    `}
          onClick={() => setCurrentTab("generatedVoucher")}
        >
          Generated Voucher
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="bg-white rounded-lg p-4 shadow-sm min-h-[80vh]">
        {/* Conditional Tab Content */}
        {currentTab === "voucherRefrence" ? (
          <div id="voucherRefrenceContent">
            {/* Konten tab Daftar Voucher akan ditampilkan di sini */}
            <div className="h-screen">
              <div className="flex w-full gap-x-4 min-h-[95vh] max-h-[95vh] overflow-y-hidden">
                {/* Layout Kiri (Tabel Voucher) */}
                <div className="transition-all justify-between duration-300 overflow-y-auto w-full bg-white p-4">
                  <div className="flex self-end   mb-4 justify-between">
                    <h2 className="md:text-xl font-bold">Daftar Voucher</h2>
                    <div className="flex gap-x-3 itemc">
                      <button
                        className="btn max-md:text-sm"
                        onClick={handleNewVoucher}
                      >
                        Buat Aturan Voucher Baru
                      </button>
                      <button className="bg-primary text-white px-4 py-2 rounded">
                        total : {voucherList?.data?.length || "0"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-x-2  ">
                    {!voucherList?.data?.length ? (
                      <div className="flex flex-col flex-wrap items-center justify-center h-full">
                        <div className="text-center text-2xl font-bold text-gray-600">
                          Tidak ada voucher
                        </div>
                        <button
                          onClick={handleNewVoucher}
                          className="btn mt-4 w-full "
                        >
                          Buat Voucher Baru
                        </button>
                      </div>
                    ) : (
                      <table className="w-full  border-collapse rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">
                              Judul Voucher
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Potongan
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Syarat Minimum
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Berlaku Dari
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Berlaku Hingga
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              Barang Terkait
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              Kuota
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              Terpakai
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y  divide-gray-200 bg-white">
                          {voucherList?.data?.map((voucher) => (
                            <tr
                              key={voucher.id}
                              className={`${
                                new Date(voucher.berlakuHingga) < new Date()
                                  ? "bg-red-50 text-gray-400"
                                  : "hover:bg-blue-50 "
                              } transition-colors duration-150 cursor-pointer`}
                              onClick={(e) => {
                                handleRowClick(voucher);
                              }}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`${
                                    new Date(voucher.berlakuHingga) <
                                      new Date() && "line-through"
                                  } font-medium`}
                                >
                                  {voucher?.judulVoucher || "Tanpa Judul"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-blue-600 font-semibold">
                                {Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                  minimumFractionDigits: 0,
                                }).format(voucher?.potongan)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {voucher.tipeSyarat === "totalRp"
                                  ? `Min. belanja ${Number(
                                      voucher.minimalPembelianTotalRp,
                                    ).toLocaleString("id-ID", {
                                      style: "currency",
                                      currency: "IDR",
                                      minimumFractionDigits: 0,
                                    })}`
                                  : `Min. ${voucher.minimalPembelianQuantity} item`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {new Date(
                                  voucher.berlakuDari,
                                ).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`${
                                    new Date(voucher.berlakuHingga) < new Date()
                                      ? "text-red-500"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {new Date(
                                    voucher.berlakuHingga,
                                  ).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                                  {voucher?.skuList?.length || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {voucher.quantityTersedia}
                              </td>
                              <td className="px-4 py-3 text-center font-medium">
                                {voucher.terjadi}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Editor Voucher (dialog) */}
                <dialog id="voucherEditor" className="modal">
                  <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                    <form
                      onSubmit={() => {
                        selectedVoucher
                          ? handleUpdateVoucher(selectedVoucher)
                          : handleRegisterVoucher(newVoucher);
                      }}
                      className="space-y-5"
                    >
                      {/* header form */}
                      <div className="p-6  border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-20">
                        <h2 className="text-xl font-semibold">
                          {selectedVoucher
                            ? "Edit Aturan Voucher"
                            : "Buat Voucher Baru"}
                        </h2>
                        <div className="flex justify-between items-center mt-4 gap-3">
                          <button
                            type="button"
                            className="flex items-center px-4 py-2 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex-1 justify-center"
                            onClick={closeVoucherEditor}
                          >
                            <X className="w-5 h-5 mr-2" />
                            Batal
                          </button>
                          {selectedVoucher && (
                            <button
                              type="button"
                              className="flex items-center px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors flex-1 justify-center"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Apakah Anda yakin ingin menghapus voucher ini?",
                                  )
                                ) {
                                  handleDeleteVoucher(selectedVoucher?._id);
                                }
                              }}
                            >
                              <Trash2 className="w-5 h-5 mr-2" />
                              Hapus
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-green-50 transition-colors flex-1 justify-center"
                            onClick={() => {
                              selectedVoucher
                                ? handleUpdateVoucher(selectedVoucher)
                                : handleRegisterVoucher(newVoucher);
                            }}
                          >
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            {selectedVoucher ? "Simpan" : "Buat Voucher"}
                          </button>
                        </div>
                      </div>

                      {/* form body */}
                      <div className="space-y-5 p-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Judul Voucher
                          </label>
                          <input
                            type="text"
                            value={
                              selectedVoucher
                                ? selectedVoucher?.judulVoucher
                                : newVoucher?.judulVoucher
                            }
                            onChange={(e) => {
                              selectedVoucher
                                ? setSelectedVoucher((prev) => ({
                                    ...prev,
                                    judulVoucher: e.target.value,
                                  }))
                                : setNewVoucher((prev) => ({
                                    ...prev,
                                    judulVoucher: e.target.value,
                                  }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                            defaultValue={selectedVoucher?.judulVoucher || ""}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Potongan (fixed)
                          </label>
                          <input
                            type="number"
                            value={
                              selectedVoucher
                                ? selectedVoucher?.potongan
                                : newVoucher?.potongan
                            }
                            onChange={(e) =>
                              selectedVoucher
                                ? setSelectedVoucher((prev) => ({
                                    ...prev,
                                    potongan: e.target.value,
                                  }))
                                : setNewVoucher((prev) => ({
                                    ...prev,
                                    potongan: e.target.value,
                                  }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipe Syarat
                          </label>
                          <select
                            value={
                              selectedVoucher?.tipeSyarat ||
                              newVoucher?.tipeSyarat
                            }
                            onChange={(e) =>
                              selectedVoucher
                                ? setSelectedVoucher((prev) => ({
                                    ...prev,
                                    tipeSyarat: e.target.value,
                                  }))
                                : setNewVoucher((prev) => ({
                                    ...prev,
                                    tipeSyarat: e.target.value,
                                  }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                          >
                            <option value={"quantity"}>Quantity</option>
                            <option value={"totalRp"}>Total Harga</option>
                          </select>
                        </div>

                        {selectedVoucher?.tipeSyarat == "quantity" ||
                        newVoucher?.tipeSyarat == "quantity" ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Minimal Pembelian (Qtty)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={
                                selectedVoucher
                                  ? selectedVoucher?.minimalPembelianQuantity
                                  : newVoucher?.minimalPembelianQuantity
                              }
                              onChange={(e) => {
                                selectedVoucher
                                  ? setSelectedVoucher((prev) => ({
                                      ...prev,
                                      minimalPembelianQuantity: e.target.value,
                                    }))
                                  : setNewVoucher((prev) => ({
                                      ...prev,
                                      minimalPembelianQuantity: e.target.value,
                                    }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Minimal Pembelian (Total Harga)
                            </label>
                            <input
                              type="number"
                              value={
                                selectedVoucher
                                  ? selectedVoucher?.minimalPembelianTotalRp
                                  : newVoucher?.minimalPembelianTotalRp
                              }
                              onChange={(e) => {
                                selectedVoucher
                                  ? setSelectedVoucher((prev) => ({
                                      ...prev,
                                      minimalPembelianTotalRp: e.target.value,
                                    }))
                                  : setNewVoucher((prev) => ({
                                      ...prev,
                                      minimalPembelianTotalRp: e.target.value,
                                    }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Berlaku Dari
                            </label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                              defaultValue={selectedVoucher?.validFrom || ""}
                              value={
                                selectedVoucher
                                  ? selectedVoucher?.berlakuDari
                                  : newVoucher?.berlakuDari
                              }
                              onChange={(e) => {
                                selectedVoucher
                                  ? setSelectedVoucher((prev) => ({
                                      ...prev,
                                      berlakuDari: e.target.value,
                                    }))
                                  : setNewVoucher((prev) => ({
                                      ...prev,
                                      berlakuDari: e.target.value,
                                    }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Berlaku Hingga
                            </label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                              defaultValue={selectedVoucher?.validTo || ""}
                              value={
                                selectedVoucher
                                  ? selectedVoucher?.berlakuHingga
                                  : newVoucher?.berlakuHingga
                              }
                              onChange={(e) => {
                                selectedVoucher
                                  ? setSelectedVoucher((prev) => ({
                                      ...prev,
                                      berlakuHingga: e.target.value,
                                    }))
                                  : setNewVoucher((prev) => ({
                                      ...prev,
                                      berlakuHingga: e.target.value,
                                    }));
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kuota / Maksimal Implementasi
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                            defaultValue={selectedVoucher?.maxUsage || ""}
                            value={
                              selectedVoucher
                                ? selectedVoucher?.quantityTersedia
                                : newVoucher?.quantityTersedia
                            }
                            onChange={(e) => {
                              selectedVoucher
                                ? setSelectedVoucher((prev) => ({
                                    ...prev,
                                    quantityTersedia: e.target.value,
                                  }))
                                : setNewVoucher((prev) => ({
                                    ...prev,
                                    quantityTersedia: e.target.value,
                                  }));
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU Terhubung
                          </label>
                          <input
                            type="text"
                            name="skuList"
                            placeholder="Klik untuk memilih produk"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                            onClick={() => {
                              const pickVoucherModal =
                                document.getElementById("pickvoucher");
                              if (pickVoucherModal) {
                                pickVoucherModal.showModal();
                                selectedVoucher
                                  ? setTempSkuTerhubung([
                                      ...selectedVoucher?.skuTanpaSyarat,
                                    ])
                                  : setTempSkuTerhubung([
                                      ...newVoucher?.skuTanpaSyarat,
                                    ]);
                              } else {
                                toast.error(
                                  "Modal pilih voucher tidak ditemukan",
                                );
                              }
                            }}
                            value={
                              selectedVoucher
                                ? selectedVoucher?.skuList
                                : newVoucher?.skuList
                            }
                            onChange={(e) => {
                              selectedVoucher
                                ? setSelectedVoucher((prev) => ({
                                    ...prev,
                                    skuList: e.target.value,
                                  }))
                                : setNewVoucher((prev) => ({
                                    ...prev,
                                    skuList: e.target.value,
                                  }));
                            }}
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedVoucher
                              ? selectedVoucher?.skuList?.map(
                                  (badge, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full"
                                    >
                                      {badge}
                                    </span>
                                  ),
                                )
                              : voucherList.skuList &&
                                voucherList?.skuList?.map((badge, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full"
                                  >
                                    {badge}
                                  </span>
                                ))}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                  <form method="dialog" className="modal-backdrop">
                    <button type="submit" onClick={closeVoucherEditor}>
                      close
                    </button>
                  </form>
                </dialog>

                <dialog id="pickvoucher" className="modal">
                      <div className="modal-box w-11/12 max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">
                          Pilih Produk untuk Voucher
                        </h3>
                        <div
                          className="overflow-y-auto mb-4"
                          style={{ maxHeight: "60vh" }}
                        >
                          <div className="sticky top-0 z-10 bg-white pb-2">
                            <FilterInventories
                              onChange={(value) => {
                                setFilter({
                                  ...filter,
                                  searchKey: value.searchKey,
                                });
                              }}
                            />
                          </div>
                          <table className="table w-full">
                            <thead className="sticky top-12 bg-white">
                              <tr>
                                <th className="text-left">Description</th>
                                <th className="text-center">Quantity</th>
                                <th className="text-center">Harga Dasar</th>
                                <th className="text-center">Terpilih</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inventoryList?.data?.map((item) => (
                                <tr key={item._id}>
                                  <td>
                                    {item?.description ||
                                      item.sku + " (ini sku)"}
                                  </td>
                                  <td className="text-center">
                                    {item.quantity}
                                  </td>
                                  <td className="text-center">
                                    {item?.RpHargaDasar?.$numberDecimal}
                                  </td>
                                  <td className="text-center">
                                    {tempSkuterhubung?.includes(item.sku) ? (
                                      <button
                                        onClick={() =>
                                          setTempSkuTerhubung((prev) =>
                                            prev?.filter(
                                              (sku) => sku !== item.sku,
                                            ),
                                          )
                                        }
                                        className="btn btn-sm bg-green-500 text-white"
                                      >
                                        Terpilih
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() =>
                                          setTempSkuTerhubung((prev) => [
                                            ...prev,
                                            item?.sku,
                                          ])
                                        }
                                      >
                                        Pilih
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="modal-action">
                          <button
                            className="btn"
                            onClick={() => {
                              setTempSkuTerhubung([]);
                              document.getElementById("pickvoucher").close();
                            }}
                          >
                            Batal
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={handleKonfirmasiVoucherTerhubung}
                          >
                            Konfirmasi
                          </button>
                        </div>
                      </div>
                    </dialog>
              </div>

              <PickMultiInventoriesDialog
                inventoryList={inventoryList?.data}
                tempSkuTerhubung={tempSkuterhubung}
                setTempInventoryTerputus={tempSkuTerputus}
                handleKonfirmasiTerhubung={handleKonfirmasiVoucherTerhubung}
                key={"pickvoucher"}
              />
              <dialog id="showDetailVoucher" className="modal">
                <Toaster />
                <div className="modal-box border-2 border-blue-200 bg-white  w-11/12 max-w-5xl">
                  <div className="flex flex-col items-center">
                    {/* Header dengan gradien */}
                    <h3 className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 w-full  rounded-t-lg  text-center">
                      {selectedVoucher?.judulVoucher || "Detail Voucher"}
                    </h3>

                    <div className="flex flex-col md:flex-row gap-8 w-full">
                      {/* QR Code Section */}
                      <div className="md:w-1/3 flex flex-col items-center">
                        <div className="bg-white p-5 rounded-lg border-2 border-blue-200 shadow-md mb-4 w-fit mx-auto">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                            {selectedVoucher &&
                            selectedVoucher.publicVoucherCode ? (
                              <QRCode
                                value={
                                  frontendURL +
                                  selectedVoucher?.publicVoucherCode
                                }
                                size={180}
                                level="H"
                                className="mx-auto"
                                fgColor="#1d4ed8"
                                bgColor="transparent"
                                key={`qr-${selectedVoucher._id}-${Date.now()}`}
                              />
                            ) : (
                              <div className="h-[180px] w-[180px] flex items-center justify-center">
                                <span className="loading loading-spinner text-primary"></span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kode Voucher Publik
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={selectedVoucher?.publicVoucherCode}
                              className="input input-bordered w-full font-mono text-sm"
                              readOnly
                            />
                            <button
                              className="btn btn-square btn-primary"
                              onClick={(e) => {
                                e.preventDefault();
                                const text = selectedVoucher?.publicVoucherCode;
                                if (
                                  navigator.clipboard &&
                                  navigator.clipboard.writeText
                                ) {
                                  navigator.clipboard
                                    .writeText(text)
                                    .then(() => {
                                      toast.success(
                                        "Kode voucher berhasil disalin!",
                                      );
                                    })
                                    .catch((error) => {
                                      console.error("Copy failed", error);
                                      toast.error(
                                        "Gagal menyalin kode voucher",
                                      );
                                    });
                                } else {
                                  console.error("Clipboard API not supported");
                                  toast.error(
                                    "Fitur salin tidak didukung pada browser ini",
                                  );
                                }
                              }}
                              title="Salin Kode"
                            >
                              <Copy size={18} />
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 mt-2 text-center">
                            Catatan: Qr code public tidak bisa di tukar, qr code
                            public hanya dapat generate kode voucher private,
                            yang ada di generatedVouched.
                          </p>

                          <button
                            className="btn btn-outline btn-primary w-full mt-4 gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              // Implementasi share jika dibutuhkan
                              try {
                                toast.success("Fitur ini belum terseidia");
                              } catch (error) {
                                console.error(error);
                                toast.error("Gagal membagikan voucher");
                              }
                            }}
                          >
                            <Share2 size={18} /> Bagikan Voucher
                          </button>
                        </div>
                      </div>

                      {/* Detail Section */}
                      <div className="md:w-2/3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold mb-3 text-blue-700">
                              Detail Voucher
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between border-b border-blue-100 pb-2">
                                <span className="text-gray-600">Potongan:</span>
                                <span className="font-medium text-blue-800">
                                  {Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    minimumFractionDigits: 0,
                                  }).format(selectedVoucher?.potongan || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-blue-100 pb-2">
                                <span className="text-gray-600">Syarat:</span>
                                <span className="font-medium">
                                  {selectedVoucher?.tipeSyarat === "totalRp"
                                    ? `Min. belanja ${Intl.NumberFormat(
                                        "id-ID",
                                        {
                                          style: "currency",
                                          currency: "IDR",
                                          minimumFractionDigits: 0,
                                        },
                                      ).format(
                                        selectedVoucher?.minimalPembelianTotalRp ||
                                          0,
                                      )}`
                                    : `Min. ${
                                        selectedVoucher?.minimalPembelianQuantity ||
                                        0
                                      } item`}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-blue-100 pb-2">
                                <span className="text-gray-600">
                                  Stok Tersedia:
                                </span>
                                <span className="font-medium">
                                  {selectedVoucher?.quantityTersedia || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Sudah Terpakai:
                                </span>
                                <span className="font-medium">
                                  {selectedVoucher?.terjadi || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold mb-3 text-blue-700">
                              Masa Berlaku
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between border-b border-blue-100 pb-2">
                                <span className="text-gray-600">
                                  Berlaku Dari:
                                </span>
                                <span className="font-medium">
                                  {selectedVoucher?.berlakuDari
                                    ? new Date(
                                        selectedVoucher.berlakuDari,
                                      ).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Berlaku Hingga:
                                </span>
                                <span
                                  className={`font-medium ${
                                    new Date(selectedVoucher?.berlakuHingga) <
                                    new Date()
                                      ? "text-red-500"
                                      : ""
                                  }`}
                                >
                                  {selectedVoucher?.berlakuHingga
                                    ? new Date(
                                        selectedVoucher.berlakuHingga,
                                      ).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedVoucher?.skuList?.length > 0 && (
                          <div className="bg-blue-50 p-4 rounded-lg shadow-sm mb-6">
                            <h4 className="font-semibold mb-3 text-blue-700">
                              Produk Terhubung
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedVoucher.skuList.map((sku, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full"
                                >
                                  {sku}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3 mt-4">
                          <button
                            className="btn btn-primary gap -2 text-white"
                            onClick={() => {
                              const modalElement =
                                document.getElementById("showDetailVoucher");
                              if (modalElement) {
                                modalElement.close();
                              }
                              handleMoveToEditFromDetail();
                            }}
                          >
                            <Pencil size={18} />
                            Edit Voucher
                          </button>
                          <button
                            onClick={() => {
                              const modalElement =
                                document.getElementById("showDetailVoucher");
                              if (modalElement) {
                                modalElement.close();
                              }
                            }}
                            className="btn"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="modal-backdrop"
                    onClick={() => {
                      setSelectedVoucher(null);
                      const modalElement =
                        document.getElementById("showDetailVoucher");
                      if (modalElement) {
                        modalElement.close();
                      }
                    }}
                  >
                    <button onClick={(e) => e.stopPropagation()}>close</button>
                  </div>
                </div>
              </dialog>
            </div>
          </div>
        ) : (
          <div id="generatedVoucherContent">
            <GeneratedVoucherList />
          </div>
        )}
      </div>

      {/* Modals and other UI elements will be added here */}
    </div>
  );
};

export default Voucher;
