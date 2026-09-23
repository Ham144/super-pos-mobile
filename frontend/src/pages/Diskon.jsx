import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAllinventories } from "../api/itemLibraryApi";
import {
  getAllDiskon,
  updateDiskon,
  deleteDiskon,
  createDiskon,
  importDiskonCsv,
} from "../api/diskonApi";
import toast from "react-hot-toast";
import { useFilter } from "../store";
import FilterInventories from "../components/filterInventories";
import {
  BellRingIcon,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileWarningIcon,
  Info,
  InfoIcon,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ModalConfirmation from "@/components/ModalConfirmation";

const formatDiskonImportError = (data) => {
  if (!data) return "Terjadi kesalahan";
  const parts = [];
  if (data.missingSkus?.length) {
    parts.push(`SKU tidak terdaftar: ${data.missingSkus.join(", ")}`);
  }
  if (data.details?.length) {
    data.details.forEach((d) => {
      parts.push(
        d.judul
          ? `Baris ${d.row} (${d.judul}): ${d.reason}`
          : `Baris ${d.row}: ${d.reason}`,
      );
    });
  }
  if (parts.length) return parts.join(" | ");
  return data.message || "Terjadi kesalahan";
};

const Diskon = () => {
  const [selectedDiskon, setselectedDiskon] = useState();
  const [diskonBaru, setDiskonBaru] = useState();
  const [iseditingDiskon, setIseditingDiskon] = useState(false);

  const [tempBarangTerhubung, setTempBarangTerhubung] = useState([]);
  const [file, setFile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  //tanstack
  const queryClient = useQueryClient();

  //zustand
  const { filter, setFilter } = useFilter();

  const { data: diskonList, refetch: handlerefetchDiskon } = useQuery({
    queryFn: getAllDiskon,
    queryKey: ["diskon"],
  });

  const { data: inventoriList } = useQuery({
    queryKey: ["inventories", filter],
    queryFn: (filter) => getAllinventories(filter),
  });

  const { mutateAsync: handleUpdateDiskon } = useMutation({
    mutationFn: async (body) => {
      console.log("Update raw data:", body);

      if (!body.judulDiskon || body.judulDiskon.trim() === "") {
        throw new Error("Judul Diskon tidak boleh kosong");
      }

      if (!body.description || body.description.trim() === "") {
        throw new Error("Deskripsi tidak boleh kosong");
      }

      // Format the data before sending to backend
      const formattedData = {
        _id: body._id,
        judulDiskon: body.judulDiskon.trim(),
        description: body.description.trim(),
        RpPotonganHarga:
          body.RpPotonganHarga && body.RpPotonganHarga.$numberDecimal
            ? { $numberDecimal: body.RpPotonganHarga.$numberDecimal.toString() }
            : null,
        percentPotonganHarga:
          body.percentPotonganHarga && body.percentPotonganHarga.$numberDecimal
            ? {
                $numberDecimal:
                  body.percentPotonganHarga.$numberDecimal.toString(),
              }
            : null,
        berlakuDari: body.berlakuDari
          ? new Date(body.berlakuDari).toISOString()
          : new Date().toISOString(),
        berlakuHingga: body.berlakuHingga
          ? new Date(body.berlakuHingga).toISOString()
          : new Date().toISOString(),
        skuTanpaSyarat: Array.isArray(body.skuTanpaSyarat)
          ? body.skuTanpaSyarat
          : [],
        quantityTersedia: parseInt(body.quantityTersedia) || 0,
      };

      console.log("Update formatted data:", formattedData);

      if (
        !formattedData.RpPotonganHarga &&
        !formattedData.percentPotonganHarga
      ) {
        throw new Error("Pilih salah satu jenis potongan harga");
      }

      const response = await updateDiskon(formattedData);
      return response?.data;
    },
    mutationKey: ["diskon"],
    onSuccess: (response) => {
      toast.success(response?.message);
      queryClient.invalidateQueries(["diskon"]);
      setselectedDiskon(null);
      setDiskonBaru(null);
      setIseditingDiskon(false);
      setTempBarangTerhubung([]);
    },
    onError: (error) => {
      toast.error(error?.message || error?.response?.data?.message);
      console.log("Update error:", error);
    },
  });

  const { mutateAsync: handleDeleteDiskon } = useMutation({
    mutationFn: deleteDiskon,
    mutationKey: ["diskon"],
    onSuccess: () => {
      queryClient.invalidateQueries(["diskon"]);
      toast.success("Berhasil menghapus diskon");
      setselectedDiskon(null);
      setDiskonBaru(null);
      setIseditingDiskon(false);
    },
    onError: (error) => {
      toast.error(error?.message || error?.response?.data?.message);
      console.log("Delete error:", error);
    },
  });

  const { mutateAsync: handleImportCsvDiskon, isPending: isImporting } =
    useMutation({
      mutationFn: importDiskonCsv,
      onSuccess: (response) => {
        queryClient.invalidateQueries(["diskon"]);
        setIsOpen(false);
        setFile(null);
        toast.success(response?.message || "Import berhasil");
      },
      onError: (error) => {
        toast.error(formatDiskonImportError(error?.response?.data));
      },
    });

  const { mutateAsync: handleCreateDiskon } = useMutation({
    mutationFn: (body) => {
      console.log("Raw data:", body);

      if (!body.judulDiskon || body.judulDiskon.trim() === "") {
        throw new Error("Judul Diskon tidak boleh kosong");
      }

      if (!body.description || body.description.trim() === "") {
        throw new Error("Deskripsi tidak boleh kosong");
      }

      // Format the data before sending to backend
      const formattedData = {
        judulDiskon: body.judulDiskon.trim(),
        description: body.description.trim(),
        RpPotonganHarga:
          body.RpPotonganHarga && body.RpPotonganHarga !== ""
            ? { $numberDecimal: body.RpPotonganHarga.toString() }
            : null,
        percentPotonganHarga:
          body.percentPotonganHarga && body.percentPotonganHarga !== ""
            ? { $numberDecimal: body.percentPotonganHarga.toString() }
            : null,
        berlakuDari: body.berlakuDari
          ? new Date(body.berlakuDari).toISOString()
          : new Date().toISOString(),
        berlakuHingga: body.berlakuHingga
          ? new Date(body.berlakuHingga).toISOString()
          : new Date().toISOString(),
        skuTanpaSyarat: Array.isArray(body.skuTanpaSyarat)
          ? body.skuTanpaSyarat
          : [],
        quantityTersedia: parseInt(body.quantityTersedia) || 0,
      };

      if (
        !formattedData.RpPotonganHarga &&
        !formattedData.percentPotonganHarga
      ) {
        throw new Error("Pilih salah satu jenis potongan harga");
      }

      return createDiskon(formattedData);
    },
    mutationKey: ["diskon"],
    onSuccess: (response) => {
      queryClient.invalidateQueries(["diskon"]);
      toast.success(response?.message || "Berhasil register diskon");
      setDiskonBaru(null);
      setIseditingDiskon(false);
      setTempBarangTerhubung([]);
    },
    onError: (error) => {
      toast.error(error?.message || error?.response?.data?.message);
      console.log("Error:", error);
    },
  });

  const handlePickDiskonToEdit = async (diskon) => {
    setselectedDiskon(diskon);
    setDiskonBaru();
    setIseditingDiskon(true);
  };

  const handleKonfirmasiBarangTerhubung = () => {
    if (iseditingDiskon) {
      setselectedDiskon((prev) => ({
        ...prev,
        skuTanpaSyarat: tempBarangTerhubung,
      }));
    } else {
      setDiskonBaru((prev) => ({
        ...prev,
        skuTanpaSyarat: tempBarangTerhubung,
      }));
    }
    setTempBarangTerhubung([]);
    document.getElementById("pickdiskon").close();
  };

  const handleEditDiskon = (diskon) => {
    // Format the discount data for editing
    const formattedDiskon = {
      ...diskon,
      RpPotonganHarga: diskon.RpPotonganHarga || null,
      percentPotonganHarga: diskon.percentPotonganHarga || null,
      berlakuDari: diskon.berlakuDari
        ? new Date(diskon.berlakuDari).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      berlakuHingga: diskon.berlakuHingga
        ? new Date(diskon.berlakuHingga).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      skuTanpaSyarat: Array.isArray(diskon.skuTanpaSyarat)
        ? diskon.skuTanpaSyarat
        : [],
    };

    setDiskonBaru(null);
    setselectedDiskon(formattedDiskon);
    setIseditingDiskon(true);
  };

  const handleNewDiskon = () => {
    setselectedDiskon(null);
    const today = new Date().toISOString().split("T")[0];
    setDiskonBaru({
      judulDiskon: "",
      description: "",
      RpPotonganHarga: null,
      percentPotonganHarga: null,
      skuTanpaSyarat: [],
      berlakuDari: today,
      berlakuHingga: "",
      quantityTersedia: 1,
    });
    setIseditingDiskon(false);
  };

  const formatCurrency = (value) => {
    if (!value) return "";
    // Remove non-digit characters
    const number = value.toString().replace(/[^\d]/g, "");
    // Add commas for thousands
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseCurrency = (value) => {
    if (!value) return "";
    // Remove all non-digit characters
    return value.toString().replace(/[^\d]/g, "");
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleImportDiskon = () => {
    setFile(null);
    setIsOpen(true);
  };

  const handleSubmitImportDiskon = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }
    await handleImportCsvDiskon(file);
  };

  const handleExportDiskonTemplate = () => {
    const headers = [
      "Judul Diskon",
      "Deskripsi",
      "Berlaku Dari",
      "Berlaku Hingga",
      "Potongan Rp",
      "Potongan %",
      "SKU Terkait",
      "Kuota",
    ];
    const templateRows = [
      [
        "Diskon Lebaran",
        "Potongan harga lebaran",
        "2026-01-01",
        "2026-12-31",
        "5000",
        "",
        "SKU001,SKU002",
        "100",
      ],
      [
        "Diskon Persen",
        "Potongan persentase",
        "2026-06-01",
        "2026-06-30",
        "",
        "10",
        "SKU003",
        "50",
      ],
    ];
    const csvContent = [
      headers.join(";"),
      ...templateRows.map((row) => row.join(";")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_import_diskon.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const closeDiskonEditor = () => {
    setselectedDiskon(null);
    setDiskonBaru(null);
    setIseditingDiskon(false);
    document.getElementById("diskonEditor")?.close();
  };

  useEffect(() => {
    const editor = document.getElementById("diskonEditor");
    if (!editor) return;

    const shouldOpen = Boolean(selectedDiskon || diskonBaru);
    if (shouldOpen) {
      if (!editor.open) editor.showModal();
    } else if (editor.open) {
      editor.close();
    }
  }, [selectedDiskon, diskonBaru]);

  return (
    <div>
      <div className="flex gap-6 min-h-[95vh] max-h-[95vh] overflow-y-hidden bg-gray-100 ">
        {/* Left Panel: Item List */}
        <div className="flex-1 bg-white rounded-lg shadow-md overflow-y-auto flex flex-col">
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn m-1 btn-ghost btn-circle hover:bg-gray-100 transition-colors duration-200"
              aria-label="Notifications"
            >
              <div className="relative">
                <BellRingIcon className="w-6 h-6 text-gray-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </div>
            </label>
            <ul className="dropdown-content z-20 menu p-4 shadow-lg bg-white rounded-xl w-full mt-2 border border-gray-100 transform transition-all duration-300 ease-in-out">
              <li>
                <div
                  role="alert"
                  className="alert alert-warning flex items-start gap-3 p-3 rounded-lg mb-3 hover:bg-amber-50 transition-colors"
                >
                  <FileWarningIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                  <span className="text-sm text-gray-700">
                    <strong>Diskon:</strong> Daftar ketentuan yang menetapkan
                    inventori memiliki potongan harga dalam persentase atau
                    fixed value tanpa syarat sampai batas waktu tertentu.
                  </span>
                </div>
              </li>
              <li>
                <div
                  role="alert"
                  className="alert alert-info flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <span className="text-sm text-gray-700">
                    Yang belum memasuki waktu dan telah kadaluarsa memang tidak
                    muncul di mobile.
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div className="p-4  bg-white sticky top-0 z-10">
            <div className="flex justify-end gap-3">
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="btn btn-outline border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Import/Export
                </label>
                <ul className="dropdown-content z-40 menu p-2 shadow-xl bg-white rounded-xl w-56 border border-blue-100">
                  <li>
                    <button
                      onClick={handleImportDiskon}
                      className="flex items-center gap-2 text-gray-700 hover:bg-blue-50 rounded-lg p-3"
                    >
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span>Import CSV</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleExportDiskonTemplate}
                      className="flex items-center gap-2 text-gray-700 hover:bg-blue-50 rounded-lg p-3"
                    >
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span>Export Template</span>
                    </button>
                  </li>
                </ul>
              </div>
              <button
                className="btn"
                onClick={() => {
                  handleNewDiskon();
                }}
              >
                Buat Diskon Baru
              </button>
              <button className="btn">
                Total: {diskonList?.data?.data.length || "0"}
              </button>
              <button
                className="btn"
                onClick={handlerefetchDiskon}
                disabled={diskonList?.isFetching}
              >
                <RefreshCcw />
              </button>
            </div>
          </div>
          {/* table diskon */}
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  Judul Diskon
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Barang Terkait
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Periode Berlaku
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Potongan (Rp)
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Potongan (%)
                </th>
                <th className="px-4 py-3 text-center font-medium">Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {diskonList?.data?.data?.map((item) => (
                <tr
                  key={item._id}
                  className={`${
                    new Date(item?.berlakuHingga) < new Date()
                      ? "bg-red-50 text-gray-400"
                      : "hover:bg-blue-50 cursor-pointer"
                  } transition-colors duration-150`}
                  onClick={() => handleEditDiskon(item)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`${
                        new Date(item?.berlakuHingga) < new Date() &&
                        "line-through"
                      } font-medium`}
                    >
                      {item?.judulDiskon}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                      {item?.skuTanpaSyarat.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex flex-col">
                      <span>
                        {item?.berlakuDari
                          ? new Date(item?.berlakuDari).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Not set"}
                      </span>
                      <span className="text-xs text-gray-500">sampai</span>
                      <span
                        className={`${
                          new Date(item?.berlakuHingga) < new Date()
                            ? "text-red-500"
                            : "text-gray-700"
                        }`}
                      >
                        {item?.berlakuHingga
                          ? new Date(item?.berlakuHingga).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Not set"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item?.RpPotonganHarga?.$numberDecimal > 0 ? (
                      <span className="text-blue-600 font-semibold">
                        {Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(item?.RpPotonganHarga?.$numberDecimal)}
                      </span>
                    ) : (
                      <span className="italic text-gray-400">
                        Tidak berlaku
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item?.percentPotonganHarga?.$numberDecimal > 0 ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                        {item?.percentPotonganHarga?.$numberDecimal * 100}%
                      </span>
                    ) : (
                      <span className="italic text-gray-400">
                        Tidak berlaku
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {item?.quantityTersedia}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Editor Diskon (dialog) */}
        <dialog id="diskonEditor" className="modal">
          <div className="modal-box w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            {/* Header Section */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-20">
              <h1 className="text-xl font-semibold">
                {iseditingDiskon ? "Modifikasi Diskon" : "Buat Diskon Baru"}
              </h1>
              <div className="flex justify-between items-center mt-4 gap-3">
                <button
                  type="button"
                  className="flex items-center px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors flex-1 justify-center"
                  onClick={() =>
                    document.getElementById("modal_confirmation").showModal()
                  }
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Hapus
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center px-4 py-2 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors justify-center"
                  onClick={closeDiskonEditor}
                >
                  <X className="w-5 h-5 mr-2" />
                  Batal
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-green-50 transition-colors justify-center"
                  onClick={() => {
                    diskonBaru
                      ? handleCreateDiskon(diskonBaru)
                      : handleUpdateDiskon(selectedDiskon);
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {iseditingDiskon ? "Update" : "Simpan"}
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-5">
                {/* Judul Diskon */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Judul Diskon
                  </label>
                  <input
                    type="text"
                    name="judulDiskon"
                    placeholder="Contoh: Diskon 11.11"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    value={
                      iseditingDiskon
                        ? selectedDiskon?.judulDiskon
                        : diskonBaru?.judulDiskon
                    }
                    onChange={(e) => {
                      iseditingDiskon
                        ? setselectedDiskon((prev) => ({
                            ...prev,
                            judulDiskon: e.target.value,
                          }))
                        : setDiskonBaru((prev) => ({
                            ...prev,
                            judulDiskon: e.target.value,
                          }));
                    }}
                  />
                </div>

                {/* Deskripsi */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    name="description"
                    placeholder="Penjelasan atau Deskripsi Ketentuan untuk diskon untuk keterangan pada penerima"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950 h-24"
                    value={
                      iseditingDiskon
                        ? selectedDiskon?.description
                        : diskonBaru?.description
                    }
                    onChange={(e) => {
                      iseditingDiskon
                        ? setselectedDiskon((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        : setDiskonBaru((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }));
                    }}
                  />
                </div>

                {/* Periode Berlaku */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Berlaku Dari
                    </label>
                    <input
                      type="date"
                      name="berlakuDari"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      value={
                        iseditingDiskon
                          ? (selectedDiskon?.berlakuDari &&
                              new Date(selectedDiskon?.berlakuDari)
                                .toISOString()
                                .split("T")[0]) ||
                            ""
                          : diskonBaru?.berlakuDari
                      }
                      onChange={(e) => {
                        iseditingDiskon
                          ? setselectedDiskon((prev) => ({
                              ...prev,
                              berlakuDari: e.target.value,
                            }))
                          : setDiskonBaru((prev) => ({
                              ...prev,
                              berlakuDari: e.target.value,
                            }));
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Berlaku Hingga
                    </label>
                    <input
                      type="date"
                      name="berlakuHingga"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      value={
                        iseditingDiskon
                          ? selectedDiskon?.berlakuHingga &&
                            new Date(selectedDiskon?.berlakuHingga)
                              .toISOString()
                              .split("T")[0]
                          : diskonBaru?.berlakuHingga
                      }
                      onChange={(e) => {
                        iseditingDiskon
                          ? setselectedDiskon((prev) => ({
                              ...prev,
                              berlakuHingga: e.target.value,
                            }))
                          : setDiskonBaru((prev) => ({
                              ...prev,
                              berlakuHingga: e.target.value,
                            }));
                      }}
                    />
                  </div>
                </div>

                {/* Jenis Potongan */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Jenis Potongan Harga
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      value={
                        iseditingDiskon
                          ? selectedDiskon?.RpPotonganHarga?.$numberDecimal
                            ? "fixed"
                            : "percentage"
                          : diskonBaru?.RpPotonganHarga !== null
                            ? "fixed"
                            : "percentage"
                      }
                      onChange={(e) => {
                        const isFixed = e.target.value === "fixed";
                        if (iseditingDiskon) {
                          setselectedDiskon((prev) => ({
                            ...prev,
                            RpPotonganHarga: isFixed
                              ? { $numberDecimal: "" }
                              : null,
                            percentPotonganHarga: isFixed
                              ? null
                              : { $numberDecimal: "" },
                          }));
                        } else {
                          setDiskonBaru((prev) => ({
                            ...prev,
                            RpPotonganHarga: isFixed ? "" : null,
                            percentPotonganHarga: isFixed ? null : "",
                          }));
                        }
                      }}
                    >
                      <option value="fixed">Potongan Harga Tetap (Rp)</option>
                      <option value="percentage">
                        Potongan Harga Persentase (%)
                      </option>
                    </select>
                    <button
                      type="button"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => {
                        if (iseditingDiskon) {
                          setselectedDiskon((prev) => ({
                            ...prev,
                            RpPotonganHarga: null,
                            percentPotonganHarga: null,
                          }));
                        } else {
                          setDiskonBaru((prev) => ({
                            ...prev,
                            RpPotonganHarga: null,
                            percentPotonganHarga: null,
                          }));
                        }
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Potongan Input */}
                <div className="flex gap-x-3 w-full">
                  {(
                    iseditingDiskon
                      ? selectedDiskon?.RpPotonganHarga !== null
                      : diskonBaru?.RpPotonganHarga !== null
                  ) ? (
                    <div className="flex flex-col w-full">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Rp Potongan Harga
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          iseditingDiskon
                            ? formatCurrency(
                                selectedDiskon?.RpPotonganHarga?.$numberDecimal,
                              )
                            : formatCurrency(diskonBaru?.RpPotonganHarga)
                        }
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (iseditingDiskon) {
                            setselectedDiskon((prev) => ({
                              ...prev,
                              RpPotonganHarga: rawValue
                                ? {
                                    $numberDecimal: rawValue,
                                  }
                                : null,
                              percentPotonganHarga: null,
                            }));
                          } else {
                            setDiskonBaru((prev) => ({
                              ...prev,
                              RpPotonganHarga: rawValue,
                              percentPotonganHarga: null,
                            }));
                          }
                        }}
                        name="RpPotonganHarga"
                        placeholder="Contoh: 10,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col w-full">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Potongan Harga (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={
                          iseditingDiskon
                            ? selectedDiskon?.percentPotonganHarga
                                ?.$numberDecimal
                              ? Math.round(
                                  selectedDiskon.percentPotonganHarga
                                    .$numberDecimal * 100,
                                )
                              : ""
                            : diskonBaru?.percentPotonganHarga
                              ? Math.round(
                                  diskonBaru.percentPotonganHarga * 100,
                                )
                              : ""
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < 0 || value > 99) return;

                          const decimalValue = (value / 100).toString();
                          if (iseditingDiskon) {
                            setselectedDiskon((prev) => ({
                              ...prev,
                              percentPotonganHarga: {
                                $numberDecimal: decimalValue,
                              },
                              RpPotonganHarga: null,
                            }));
                          } else {
                            setDiskonBaru((prev) => ({
                              ...prev,
                              percentPotonganHarga: decimalValue,
                              RpPotonganHarga: null,
                            }));
                          }
                        }}
                        name="percentPotonganHarga"
                        placeholder="Contoh: 8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      />
                      <span className="text-xs text-gray-500 mt-1">
                        Masukkan nilai 1-99
                      </span>
                    </div>
                  )}
                </div>

                {/* SKU Tanpa Syarat */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    SKU Tanpa Syarat
                  </label>
                  <input
                    type="text"
                    name="skuTanpaSyarat"
                    placeholder="Klik untuk memilih produk"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    onClick={() => {
                      document.getElementById("pickdiskon").showModal();
                      iseditingDiskon
                        ? setTempBarangTerhubung([
                            ...selectedDiskon?.skuTanpaSyarat,
                          ])
                        : setTempBarangTerhubung([
                            ...diskonBaru?.skuTanpaSyarat,
                          ]);
                    }}
                    value={
                      iseditingDiskon === true
                        ? selectedDiskon?.skuTanpaSyarat
                        : diskonBaru?.skuTanpaSyarat
                    }
                    onChange={(e) => {
                      iseditingDiskon
                        ? setselectedDiskon((prev) => ({
                            ...prev,
                            skuTanpaSyarat: e.target.value,
                          }))
                        : setDiskonBaru((prev) => ({
                            ...prev,
                            skuTanpaSyarat: e.target.value,
                          }));
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {iseditingDiskon
                      ? selectedDiskon?.skuTanpaSyarat?.map((badge, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full"
                          >
                            {badge}
                          </span>
                        ))
                      : diskonBaru?.skuTanpaSyarat &&
                        diskonBaru?.skuTanpaSyarat?.map((badge, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full"
                          >
                            {badge}
                          </span>
                        ))}
                  </div>
                </div>

                {/* Kuota */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Kuota
                  </label>
                  <input
                    value={
                      iseditingDiskon
                        ? formatCurrency(selectedDiskon?.quantityTersedia)
                        : formatCurrency(diskonBaru?.quantityTersedia)
                    }
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      iseditingDiskon
                        ? setselectedDiskon((prev) => ({
                            ...prev,
                            quantityTersedia: rawValue,
                          }))
                        : setDiskonBaru((prev) => ({
                            ...prev,
                            quantityTersedia: rawValue,
                          }));
                    }}
                    type="text"
                    inputMode="numeric"
                    name="quantityTersedia"
                    placeholder="Contoh: 10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                  />
                </div>
              </form>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="submit" onClick={closeDiskonEditor}>
              close
            </button>
          </form>
        </dialog>
      </div>

      <dialog id="pickdiskon" className="modal">
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg mb-4">
            Pilih Barang Barang Implementasi Diskon ini
          </h3>
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 py-4">
              <FilterInventories
                onChange={(value) => {
                  setFilter({ ...filter, searchKey: value.searchKey });
                }}
              />
            </div>
            <table className="table w-full">
              <thead className="sticky top-16 bg-white">
                <tr className="text-center">
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Harga Dasar</th>
                  <th>Terpilih</th>
                </tr>
              </thead>
              <tbody>
                {inventoriList?.data?.map((item) => (
                  <tr key={item._id} className="text-center ">
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{item?.RpHargaDasar?.$numberDecimal}</td>
                    <td>
                      {tempBarangTerhubung?.includes(item.sku) ? (
                        <button
                          onClick={() =>
                            setTempBarangTerhubung((prev) => {
                              return prev?.filter((sku) => sku !== item.sku);
                            })
                          }
                          className="btn btn-sm bg-green-500"
                        >
                          Terpilih
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setTempBarangTerhubung((prev) => {
                              return [...prev, item?.sku];
                            })
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
          <div className="modal-action mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setTempBarangTerhubung([]);
                document.getElementById("pickdiskon").close();
              }}
            >
              Batal
            </button>
            <button
              className="btn btn-primary"
              onClick={handleKonfirmasiBarangTerhubung}
            >
              Konfirmasi
            </button>
          </div>
        </div>
      </dialog>
      <ModalConfirmation
        title={"Konfirmasi menghapus diskon"}
        message={"Diskon akan terhapus dan tak bisa dikembalikan"}
        onCancel={() => {}}
        onConfirm={() => handleDeleteDiskon(selectedDiskon._id)}
        key={"deleteDiskon"}
      />

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Upload CSV</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitImportDiskon} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Pilih file CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {file && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <span className="font-medium">File terpilih:</span>{" "}
                    {file.name}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isImporting || !file}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                  >
                    {isImporting ? "Mengimport..." : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diskon;
