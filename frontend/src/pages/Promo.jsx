import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buatPromoBaru,
  deletePromo,
  getAllBarangPromo,
  updatePromo,
  importPromoCsv,
} from "../api/promoApi";
import { getAllinventories } from "../api/itemLibraryApi";
import { toast } from "react-hot-toast";
import { useFilter, useUserInfo } from "../store";
import FilterInventories from "../components/filterInventories";
import {
  BadgeHelp,
  BellRingIcon,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileWarningIcon,
  InfoIcon,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ModalConfirmation from "@/components/ModalConfirmation";
import { getOuletList } from "@/api/outletApi";
import ModalOutletOption from "@/components/ModalOutletOption";

const formatPromoImportError = (data, error) => {
  if (!data) {
    const status = error?.response?.status;
    if (!error?.response || status === 502 || status === 504) {
      return "Server tidak merespons. Coba lagi atau periksa log backend.";
    }
    return "Terjadi kesalahan";
  }
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

const Promo = () => {
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoBaru, setPromoBaru] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredPromoList, setFilteredPromoList] = useState([]);

  const [editingPromo, setEditingPromo] = useState(false); // [setEditingPromo]
  const [ShowpemilihanTerhubung, setShowPemilihanTerhubung] = useState(false);

  const [tempPickPromo, setTempPickPromo] = useState(null);
  const [tempPickTerhubung, setTempPickTerhubung] = useState([null]);
  const [editingTerhubungItem, setEditingTerhubungItem] = useState(null);
  const [file, setFile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  //zustand
  const { filter, setFilter } = useFilter();
  const { userInfo } = useUserInfo();

  const { data: myOutlet } = useQuery({
    queryKey: ["outlet", userInfo?._id],
    queryFn: () => getOutletByUserId(userInfo?._id),
    enabled: !!userInfo?._id,
  });

  // Initialize filter with brandIds from outlet
  useEffect(() => {
    if (myOutlet?.data?.brandIds) {
      setFilter({
        ...filter,
        brandIds: myOutlet.data.brandIds,
        page: 1,
        skip: 0,
        limit: 100,
        asc: true,
        searchKey: "",
        startDate: "",
        endDate: "",
      });
    }
  }, [myOutlet?.data?.brandIds]);
  //tanstack
  const queryClient = useQueryClient();

  const { data: inventoriList } = useQuery({
    queryKey: ["inventories", filter],
    queryFn: (filter) => getAllinventories(filter),
  });

  const { data: promoList } = useQuery({
    queryFn: getAllBarangPromo,
    queryKey: ["promo"],
  });

  const { data: outletList } = useQuery({
    queryKey: ["outlet"],
    queryFn: getOuletList,
  });

  const { mutateAsync: handleImportCsvPromo, isPending: isImporting } =
    useMutation({
      mutationFn: importPromoCsv,
      onSuccess: (response) => {
        queryClient.invalidateQueries(["promo"]);
        setIsOpen(false);
        setFile(null);
        toast.success(response?.message || "Import berhasil");
      },
      onError: (error) => {
        toast.error(formatPromoImportError(error?.response?.data, error));
      },
    });

  const { mutateAsync: registerPromo } = useMutation({
    mutationFn: (body) => buatPromoBaru(body),
    mutationKey: ["promo"],
    onSuccess: () => {
      queryClient.invalidateQueries(["promo"]);
      toast.success("berhasil register promo baru");
      setPromoBaru(null);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message);
      document.getElementById("promoActions").close();
    },
  });

  const { mutateAsync: handleUpdatePromo } = useMutation({
    mutationFn: updatePromo,
    mutationKey: ["promo"],
    onSuccess: () => {
      setSelectedPromo(null);
      setPromoBaru(null);
      setEditingPromo(false); // [setEditingPromo]
      setShowPemilihanTerhubung(false);
      setTempPickPromo(null);
      setTempPickTerhubung([null]);
      setEditingTerhubungItem(null);
      queryClient.invalidateQueries(["promo"]);
      toast.success("berhasil Update");
    },
    onError: (error) => {
      console.log(error);
      toast.error("gagal mengupdate");
      console.log("ini error dari tanstack: ", error);
    },
  });

  const { mutateAsync: handleHapusPromo } = useMutation({
    mutationFn: async (id) => deletePromo(id),
    mutationKey: ["promo"],
    onSuccess: () => {
      queryClient.invalidateQueries(["promo"]);
      toast.success("berhasil menghapus promo");
      setSelectedPromo(null);
      document.getElementById("modal_confirmation").close();
      setSelectedPromo(null);
      setEditingPromo(null);
      document.getElementById("promoActions").close();
    },
    onError: (res) => {
      toast?.error(res?.response?.data?.message || "gagal menghapus promo");
      document.getElementById("modal_confirmation").close();
      document.getElementById("promoActions").close();
    },
  });

  const handleRegisterPromo = async (e) => {
    e.preventDefault();
    if (
      !promoBaru?.judulPromo ||
      !promoBaru?.quantityBerlaku ||
      !promoBaru?.berlakuHingga ||
      !promoBaru?.skuBarangBonus ||
      !promoBaru?.quantityBonus
    ) {
      return toast.error("lengkapi field yang diperlukan");
    }
    if (!promoBaru?.syaratQuantity && !promoBaru?.syaratTotalRp) {
      return toast.error(
        "syaratQuantity atau syaratTotalRp diperlukan salah satunya",
      );
    }

    const body = {
      judulPromo: promoBaru?.judulPromo,
      skuList: promoBaru?.skuList,
      quantityBerlaku: promoBaru?.quantityBerlaku,
      berlakuHingga: promoBaru?.berlakuHingga,
      syaratQuantity: promoBaru?.syaratQuantity,
      syaratTotalRp: promoBaru?.syaratTotalRp,
      skuBarangBonus: promoBaru?.skuBarangBonus,
      quantityBonus: promoBaru?.quantityBonus,
      mode: promoBaru?.mode,
    };
    try {
      const response = await registerPromo(body);
      if (response?.data?.error) {
        console.log(response?.data?.error);
        return toast.error("gagal register promo");
      } else {
        toast.success(response.data.message);
        setPromoBaru(null);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    }
  };

  const handlePickBonus = async (sku) => {
    console.log(sku);
    setTempPickPromo(sku);
  };

  const handleAturUlangBarangTerkait = async (promo) => {
    setSelectedPromo(promo);
    setEditingPromo(true);
    setShowPemilihanTerhubung(false);
    setEditingTerhubungItem(promo);
    setTempPickTerhubung([...promo.skuList]);
    document.getElementById("pickterkait").showModal();
  };

  const handleKonfirmasiTerhubung = async () => {
    editingTerhubungItem.skuList = [...tempPickTerhubung];
    handleUpdatePromo(editingTerhubungItem);
  };

  const handleChangeFilter = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    if (value === "all") {
      setFilteredPromoList(promoList?.data);
    } else {
      if (value === "active") {
        setFilteredPromoList(
          promoList?.data?.filter(
            (promo) => new Date(promo.berlakuHingga) > new Date(),
          ),
        );
      } else {
        setFilteredPromoList(
          promoList?.data?.filter(
            (promo) => new Date(promo.berlakuHingga) < new Date(),
          ),
        );
      }
    }
  };

  const outletExtractor = (outletIds, allOutlets) => {
    if (!Array.isArray(outletIds)) return "Semua Outlet";

    const matchedOutlets = allOutlets?.filter((outlet) =>
      outletIds.includes(outlet._id),
    );

    if (!matchedOutlets?.length) return "Semua Outlet";

    return matchedOutlets.map((o) => o.namaOutlet).join(", ");
  };

  useEffect(() => {
    setFilteredPromoList(promoList?.data);
  }, [promoList]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleImportPromo = () => {
    setFile(null);
    setIsOpen(true);
  };

  const handleSubmitImportPromo = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }
    await handleImportCsvPromo(file);
  };

  const handleExportPromoTemplate = () => {
    const headers = [
      "Judul Promo",
      "Mode",
      "SKU Terkait",
      "Outlet",
      "Kuota",
      "Berlaku Dari",
      "Berlaku Hingga",
      "Syarat Quantity",
      "Syarat Total Rp",
      "SKU Barang Bonus",
      "Quantity Bonus",
    ];
    const templateRows = [
      [
        "Promo Beli 3 Gratis 1",
        "particular",
        "SKU001,SKU002",
        "",
        "100",
        "2026-01-01",
        "2026-12-31",
        "3",
        "",
        "SKU003",
        "1",
      ],
      [
        "Promo Total Belanja",
        "simple_total",
        "",
        "Outlet Jakarta",
        "50",
        "2026-06-01",
        "2026-06-30",
        "",
        "500000",
        "SKU004",
        "2",
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
    link.download = "template_import_promo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen  bg-gray-100">
      <div className="flex flex-1 gap-x-4 min-h-[95vh] max-h-[95vh] overflow-y-hidden">
        <div className="flex flex-col bg-white rounded-md shadow-md overflow-y-auto  w-full">
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
                    Promo : Daftar Ketentuan yang membuat inventori menjadi
                    gratis sebagai apresiasi atas pembelian dengan kuantitas
                    atau value yang besar
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
                    muncul di mobile. begitu juga dengan outlet yang tidak
                    terkait dengan promo
                  </span>
                </div>
              </li>
              <li>
                <div
                  role="alert"
                  className="alert mt-3 alert-info flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <span className="text-sm text-gray-700">
                    Jika mode simple, barang terkait harunya "semua barang"
                    tidak boleh spesifik karena perhitungannya keseluruhan
                    invoice bukan peritem seperti mode:particular, jika terdapat
                    sku tertentu pada barang terkait dengan mode:simple_total
                    beritahu developer itu adalah kesalahan yang belum dicek
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div className="flex justify-between p-4  items-center">
            <h1 className="text-xl font-bold">Promo</h1>
            <div className="flex items-center gap-x-3">
              <div className="p-4 w-1/3">
                <select
                  onChange={handleChangeFilter}
                  className="select w-full border-gray-300"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
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
                      onClick={handleImportPromo}
                      className="flex items-center gap-2 text-gray-700 hover:bg-blue-50 rounded-lg p-3"
                    >
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span>Import CSV</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleExportPromoTemplate}
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
                  setPromoBaru({
                    judulPromo: "",
                    sku: [],
                    skuBarangBonus: "",
                    quantityBonus: 1,
                    berlakuDari: new Date().toISOString(),
                  });
                  setSelectedPromo();
                  setEditingPromo(false);
                  document.getElementById("pickbonus").close();
                  document.getElementById("pickbonus").close();
                  setShowPemilihanTerhubung(false);
                }}
              >
                Buat Promo Baru
              </button>

              <button className="btn">
                Total : {promoList?.data?.length || "0"}
              </button>
              <button
                className="btn"
                disabled={promoList?.isFetching}
                onClick={() => queryClient.invalidateQueries(["promo"])}
              >
                <RefreshCcw />
              </button>
            </div>
          </div>
          {/* Table utama */}
          <div className="flex overflow-x-auto ">
            <table className=" relative  border-collapse rounded-lg shadow-sm">
              <thead className="bg-gradient-to-r sticky top-0 from-blue-600 to-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    Judul Promo
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Barang Terkait
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Authorized Outlet
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Periode Berlaku
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Kuota</th>
                  <th className="px-4 py-3 text-center font-medium">Mode</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Min. Item
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Min. Belanja (Rp)
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Barang Bonus
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white ">
                {filteredPromoList?.map((promo) => (
                  <tr
                    key={promo.judulPromo}
                    className={`${
                      new Date(promo.berlakuHingga) < new Date()
                        ? "bg-red-50 text-gray-400"
                        : "hover:bg-blue-50 cursor-pointer"
                    } transition-colors duration-150`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`${
                          new Date(promo.berlakuHingga) < new Date() &&
                          "line-through"
                        } font-medium`}
                      >
                        {promo.judulPromo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                        {promo?.skuList?.length
                          ? promo?.skuList.map((sku) => sku).join(", ")
                          : "Semua Barang"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                        {outletExtractor(
                          promo?.authorizedOutlets,
                          outletList?.data || [],
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col">
                        <span>
                          {promo?.berlakuDari
                            ? new Date(promo?.berlakuDari).toLocaleDateString(
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
                            new Date(promo.berlakuHingga) < new Date()
                              ? "text-red-500"
                              : "text-gray-700"
                          }`}
                        >
                          {promo?.berlakuHingga
                            ? new Date(promo?.berlakuHingga).toLocaleDateString(
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
                    <td className="px-4 py-3 text-center font-medium">
                      {promo?.quantityBerlaku}x
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {promo?.mode}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {promo?.syaratQuantity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {promo?.syaratTotalRp > 0 ? (
                        <span className="text-blue-600 font-semibold">
                          {Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(promo?.syaratTotalRp)}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="truncate max-w-xs">
                          {promo?.skuBarangBonus}
                        </span>
                        <button
                          className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs hover:bg-blue-200 transition-colors"
                          onClick={() => {
                            setSelectedPromo(promo);
                            setEditingPromo(true);
                            setShowPemilihanTerhubung(false);
                            setEditingTerhubungItem();
                            document.getElementById("pickbonus").showModal();
                          }}
                        >
                          Ganti
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={selectedPromo}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setSelectedPromo(promo);
                          document.getElementById("promoActions").showModal();
                        }}
                      >
                        Pilihan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {(selectedPromo || promoBaru) && (
          <div className="w-1/2 bg-white rounded-xl shadow-lg flex flex-col border border-gray-200 overflow-y-auto">
            {/* Header Section */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-20">
              <h2 className="text-xl font-semibold">
                {selectedPromo ? "Edit Promo" : "Buat Promo"}
              </h2>
              <div className="flex justify-between items-center mt-4 gap-3">
                {editingPromo && (
                  <button
                    type="button"
                    className="flex items-center px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors flex-1 justify-center"
                    onClick={() => {
                      setSelectedPromo(selectedPromo);
                      document.getElementById("modal_confirmation").showModal();
                    }}
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  className="flex flex-1 items-center px-4 py-2 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors justify-center"
                  onClick={() => {
                    setSelectedPromo(null);
                    setPromoBaru();
                  }}
                >
                  <X className="w-5 h-5 mr-2" />
                  Batal
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-green-50 transition-colors justify-center"
                  onClick={
                    editingPromo
                      ? () => handleUpdatePromo(selectedPromo)
                      : handleRegisterPromo
                  }
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {editingPromo ? "Update" : "Register"}
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-5">
                {/* Judul Promo */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Judul Promo
                  </label>
                  <input
                    type="text"
                    id="judulPromo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    value={
                      editingPromo
                        ? selectedPromo?.judulPromo
                        : promoBaru?.judulPromo
                    }
                    onChange={(e) =>
                      editingPromo
                        ? setSelectedPromo((prev) => ({
                            ...prev,
                            judulPromo: e.target.value,
                          }))
                        : setPromoBaru((prev) => ({
                            ...prev,
                            judulPromo: e.target.value,
                          }))
                    }
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-800 font-bold mb-3 text-lg">
                    Pilih Jenis Mode triger Promo
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* Simple Total Mode */}
                    <div
                      className="tooltip tooltip-top"
                      data-tip="Promo berdasarkan keseluruhan invoice"
                      onClick={(e) => {
                        if (selectedPromo) {
                          if (
                            selectedPromo?.skuList?.length ||
                            promoBaru?.skuList?.length
                          ) {
                            const yes = confirm(
                              "Mengganti mode dari particular ke simple_total akan menghapus sku terhubung karena hal itu tidak diperlukan, konfirmasi?",
                            );
                            if (yes) {
                              setSelectedPromo((pre) => ({
                                ...pre,
                                skuList: [],
                                mode: "simple_total",
                              }));
                            } else {
                              e.preventDefault();
                              return;
                            }
                          } else {
                            setSelectedPromo((pre) => ({
                              ...pre,
                              mode: "simple_total",
                            }));
                          }
                        } else {
                          setPromoBaru((pre) => ({
                            ...pre,
                            mode: "simple_total",
                          }));
                        }
                      }}
                    >
                      <div
                        className={`w-full py-4 px-5 rounded-xl border-2 font-semibold transition-all duration-300 cursor-pointer ${
                          selectedPromo?.mode === "simple_total" ||
                          promoBaru?.mode === "simple_total"
                            ? "bg-gradient-to-r from-blue-600 to-blue-950 text-white shadow-lg border-blue-700 transform scale-[1.02]"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {(selectedPromo?.mode === "simple_total" ||
                            promoBaru?.mode === "simple_total") && <Check />}
                          Simple Total
                        </div>
                      </div>
                    </div>

                    {/* Particular Mode */}
                    <div
                      className="tooltip tooltip-top"
                      data-tip="Promo berdasarkan per item"
                      onClick={() => {
                        editingPromo
                          ? setSelectedPromo((pre) => ({
                              ...pre,
                              mode: "particular",
                            }))
                          : setPromoBaru((pre) => ({
                              ...pre,
                              mode: "particular",
                            }));
                      }}
                    >
                      <div
                        className={`w-full py-4 px-5 rounded-xl border-2 font-semibold transition-all duration-300 cursor-pointer ${
                          selectedPromo?.mode === "particular" ||
                          promoBaru?.mode === "particular"
                            ? "bg-gradient-to-r from-blue-600 to-blue-950 text-white shadow-lg border-blue-700 transform scale-[1.02]"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {(selectedPromo?.mode === "particular" ||
                            promoBaru?.mode === "particular") && <Check />}
                          Particular
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-950 rounded-r-lg p-4 transition-all duration-300">
                    {selectedPromo?.mode === "simple_total" ||
                    promoBaru?.mode === "simple_total" ? (
                      <p className="text-gray-700">
                        <span className="font-semibold text-blue-600">
                          Mode simple_total:
                        </span>{" "}
                        Promo ini diaktifkan berdasarkan total keseluruhan dalam
                        satu invoice. Sistem hanya menghitung total keseluruhan
                        belanja/invoice (bukan per item). Jika syarat promo
                        terpenuhi, maka promo akan muncul dan hanya satu promo
                        ini yang berlaku per invoice.
                      </p>
                    ) : (
                      <p className="text-gray-700">
                        <span className="font-semibold text-blue-600">
                          Mode particular:
                        </span>
                        Promo diaktifkan berdasarkan item-item tertentu. Contoh:
                        Walaupun total belanja memenuhi syarat promo, jika tidak
                        ada item yang memenuhi syarat maka promo gagal.
                        Kelebihan mode ini adalah promo bisa berlaku lebih dari
                        sekali jika beberapa item memenuhi syarat.
                      </p>
                    )}
                  </div>
                </div>

                {/* SKU Terkait */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      SKU Barang Terkait
                    </label>
                    <div className="dropdown dropdown-hover">
                      <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                      <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                        Tambah pengecekan inventory? jika outlet terhubung ke
                        promo ini tapi sku tidak terdaftar di sku barang
                        terkait, maka batal.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="sku"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                      value={
                        selectedPromo?.skuList?.length ||
                        promoBaru?.skuList?.length
                          ? selectedPromo?.skuList?.join(",") ||
                            promoBaru?.skuList?.join(",")
                          : "Semua Barang"
                      }
                      readOnly
                    />
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        if (
                          selectedPromo?.mode === "simple_total" ||
                          promoBaru?.mode === "simple_total"
                        ) {
                          toast.error(
                            "Tidak Boleh menambahkan sku dalam mode ini",
                          );
                          return;
                        }
                        document.getElementById("pickterkait").showModal();
                      }}
                    >
                      Pilih
                    </button>
                  </div>
                </div>

                {/* SKU Terkait */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Outlet Berlaku
                    </label>
                    <div className="dropdown dropdown-hover">
                      <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                      <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                        Tambah pengecekan outlet? jika barang triger promo ini
                        tapi outlet tidak terdaftar di outlet berlaku promo ini,
                        maka batal
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="sku"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                      value={outletExtractor(
                        selectedPromo?.authorizedOutlets ||
                          promoBaru?.authorizedOutlets,
                        outletList?.data || [],
                      )}
                      readOnly
                    />

                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        document.getElementById("pickmultioutlet").showModal();
                      }}
                    >
                      Pilih
                    </button>
                  </div>
                </div>

                {/* Kuota */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Kuota
                  </label>
                  <input
                    type="number"
                    id="quantityBerlaku"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    value={
                      selectedPromo?._id
                        ? selectedPromo?.quantityBerlaku || 0
                        : promoBaru?.quantityBerlaku || 0
                    }
                    onChange={(e) =>
                      selectedPromo
                        ? setSelectedPromo((prev) => ({
                            ...prev,
                            quantityBerlaku: parseInt(e.target.value),
                          }))
                        : setPromoBaru((prev) => ({
                            ...prev,
                            quantityBerlaku: parseInt(e.target.value),
                          }))
                    }
                  />
                </div>

                {/* Periode Berlaku */}
                <div className="border border-gray-200 rounded-md p-4 space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Berlaku Dari
                    </label>
                    <input
                      type="date"
                      id="berlakuDari"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      value={
                        selectedPromo
                          ? selectedPromo?.berlakuDari
                            ? new Date(selectedPromo?.berlakuDari)
                                .toISOString()
                                .split("T")[0]
                            : ""
                          : promoBaru?.berlakuDari
                            ? new Date(promoBaru?.berlakuDari)
                                .toISOString()
                                .split("T")[0]
                            : ""
                      }
                      onChange={(e) =>
                        editingPromo
                          ? setSelectedPromo((prev) => ({
                              ...prev,
                              berlakuDari: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            }))
                          : setPromoBaru((prev) => ({
                              ...prev,
                              berlakuDari: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            }))
                      }
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Berlaku Hingga
                    </label>
                    <input
                      type="date"
                      id="berlakuHingga"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                      value={
                        selectedPromo
                          ? selectedPromo?.berlakuHingga
                            ? new Date(selectedPromo?.berlakuHingga)
                                .toISOString()
                                .split("T")[0]
                            : ""
                          : promoBaru?.berlakuHingga
                            ? new Date(promoBaru?.berlakuHingga)
                                .toISOString()
                                .split("T")[0]
                            : ""
                      }
                      min={
                        selectedPromo?.berlakuDari
                          ? new Date(selectedPromo?.berlakuDari)
                              .toISOString()
                              .split("T")[0]
                          : promoBaru?.berlakuDari
                            ? new Date(promoBaru?.berlakuDari)
                                .toISOString()
                                .split("T")[0]
                            : ""
                      }
                      onChange={(e) =>
                        editingPromo
                          ? setSelectedPromo((prev) => ({
                              ...prev,
                              berlakuHingga: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            }))
                          : setPromoBaru((prev) => ({
                              ...prev,
                              berlakuHingga: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            }))
                      }
                    />
                  </div>
                </div>

                {/* Jenis Syarat */}
                <div className="border border-gray-200 rounded-md p-4 space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Jenis Syarat
                    </label>
                  </div>

                  {/* Conditional Input Fields */}
                  {(editingPromo
                    ? selectedPromo?.syaratQuantity
                    : promoBaru?.syaratQuantity) !== null ? (
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Minimal Quantity
                      </label>
                      <input
                        type="number"
                        id="syaratQuantity"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                        min={1}
                        value={
                          (editingPromo && selectedPromo?.syaratQuantity) ||
                          (promoBaru && promoBaru?.syaratQuantity) ||
                          ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || !isNaN(value)) {
                            const intValue = value ? parseInt(value, 10) : "";
                            if (editingPromo) {
                              setSelectedPromo((prev) => ({
                                ...prev,
                                syaratQuantity: intValue,
                              }));
                            } else {
                              setPromoBaru((prev) => ({
                                ...prev,
                                syaratQuantity: intValue,
                              }));
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Minimal Total Harga (Rp)
                      </label>
                      <input
                        type="number"
                        id="syaratTotalRp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                        min={0}
                        value={
                          editingPromo
                            ? selectedPromo?.syaratTotalRp || ""
                            : promoBaru?.syaratTotalRp || ""
                        }
                        onChange={(e) =>
                          editingPromo
                            ? setSelectedPromo((prev) => ({
                                ...prev,
                                syaratTotalRp: e.target.value,
                              }))
                            : setPromoBaru((prev) => ({
                                ...prev,
                                syaratTotalRp: e.target.value,
                              }))
                        }
                      />
                    </div>
                  )}
                  <select
                    id="syaratType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    value={
                      editingPromo
                        ? selectedPromo?.syaratQuantity
                          ? "quantity"
                          : "total"
                        : promoBaru?.syaratQuantity
                          ? "quantity"
                          : "total"
                    }
                    onChange={(e) => {
                      const isQuantity = e.target.value === "quantity";
                      if (editingPromo) {
                        setSelectedPromo((prev) => ({
                          ...prev,
                          syaratQuantity: isQuantity ? 1 : null,
                          syaratTotalRp: isQuantity ? null : 0,
                        }));
                      } else {
                        setPromoBaru((prev) => ({
                          ...prev,
                          syaratQuantity: isQuantity ? 1 : null,
                          syaratTotalRp: isQuantity ? null : 0,
                        }));
                      }
                    }}
                  >
                    <option value="quantity">Berdasarkan Quantity</option>
                    <option value="total">Berdasarkan Total Harga</option>
                  </select>
                </div>

                {/* SKU Barang Bonus */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      SKU Barang Bonus
                    </label>
                    <div className="dropdown dropdown-hover">
                      <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                      <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-64 text-xs text-gray-600">
                        Barang Gratis yang diberikan jika memenuhi syarat (bisa
                        diganti ditengah transaksi di aplikasi)
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="skuBarangBonus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    value={
                      selectedPromo?.skuBarangBonus || promoBaru?.skuBarangBonus
                    }
                    onChange={(e) =>
                      editingPromo
                        ? setSelectedPromo((prev) => ({
                            ...prev,
                            skuBarangBonus: e.target.value,
                          }))
                        : setPromoBaru((prev) => ({
                            ...prev,
                            skuBarangBonus: e.target.value,
                          }))
                    }
                    onClick={() =>
                      document.getElementById("pickbonus").showModal()
                    }
                  />
                </div>

                {/* Quantity Bonus */}
                <div className="flex flex-col">
                  <label className="text-sm flex items-center gap-x-2 font-medium text-gray-700 mb-1">
                    Quantity Bonus
                    <div className="dropdown dropdown-hover">
                      <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                      <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                        Quantity barang bonus yang didapat (default: 1)
                      </div>
                    </div>
                  </label>

                  <input
                    type="number"
                    id="quantityBonus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                    min={1}
                    value={
                      selectedPromo?.quantityBonus || promoBaru.quantityBonus
                    }
                    onChange={(e) =>
                      editingPromo
                        ? setSelectedPromo((prev) => ({
                            ...prev,
                            quantityBonus: parseInt(e.target.value),
                          }))
                        : setPromoBaru((prev) => ({
                            ...prev,
                            quantityBonus: parseInt(e.target.value),
                          }))
                    }
                  />
                  <span className="text-xs text-gray-500 mt-1">
                    Bisa diganti diaplikasi mobile{" "}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Selection Section */}
            {ShowpemilihanTerhubung && (
              <div className="flex flex-col h-full p-4">
                <h2 className="font-bold text-center mb-4 text-gray-700">
                  Pilih produk untuk implementasi promo ini
                </h2>

                <div
                  className="overflow-y-auto flex-grow"
                  style={{ maxHeight: "700px" }}
                >
                  <div className="sticky top-0 bg-white z-10 pb-2">
                    <FilterInventories
                      onChange={(value) => {
                        setFilter({ ...filter, searchKey: value.searchKey });
                      }}
                    />
                  </div>
                  <table className="table w-full border-collapse">
                    <thead className="sticky top-12 bg-white">
                      <tr className="text-left">
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Deskripsi</th>
                        <th className="px-4 py-2">Harga Dasar</th>
                        <th className="px-4 py-2">Quantity</th>
                        <th className="px-4 py-2">Terpilih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {inventoriList?.data?.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{item.sku}</td>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2">
                            {item.RpHargaDasar.$numberDecimal}
                          </td>
                          <td className="px-4 py-2">{item.quantity}</td>
                          <td className="px-4 py-2">
                            {(
                              (editingPromo
                                ? selectedPromo?.skuList
                                : promoBaru?.skuList) || []
                            ).includes(item.sku) ? (
                              <button
                                onClick={() => {
                                  if (editingPromo) {
                                    setSelectedPromo((prev) => ({
                                      ...prev,
                                      skuList: prev.skuList.filter(
                                        (sku) => sku !== item.sku,
                                      ),
                                    }));
                                  } else {
                                    setPromoBaru((prev) => ({
                                      ...prev,
                                      skuList: prev.skuList.filter(
                                        (sku) => sku !== item.sku,
                                      ),
                                    }));
                                  }
                                }}
                                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                              >
                                Terpilih
                              </button>
                            ) : (
                              <button
                                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={() => {
                                  if (editingPromo) {
                                    setSelectedPromo((prev) => ({
                                      ...prev,
                                      skuList: [
                                        ...(prev.skuList || []),
                                        item.sku,
                                      ],
                                    }));
                                  } else {
                                    setPromoBaru((prev) => ({
                                      ...prev,
                                      skuList: [
                                        ...(prev.skuList || []),
                                        item.sku,
                                      ],
                                    }));
                                  }
                                }}
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

                <div className="flex gap-3 sticky bottom-0 bg-white pt-4 pb-2">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex-1"
                    onClick={() => {
                      setTempPickTerhubung();
                      setShowPemilihanTerhubung(false);
                      setEditingTerhubungItem();
                    }}
                  >
                    Batal
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-1"
                    onClick={handleKonfirmasiTerhubung}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <dialog id="promoActions" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Pilihan Aksi Promo</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setEditingPromo(true);
                setShowPemilihanTerhubung(false);
                document.getElementById("promoActions").close();
              }}
              className="btn btn-ghost w-full text-left hover:bg-gray-100"
            >
              Edit Ketentuan Promo
            </button>
            <button
              onClick={() => {
                handleAturUlangBarangTerkait(selectedPromo);
                document.getElementById("promoActions").close();
              }}
              className="btn btn-ghost w-full text-left hover:bg-gray-100"
            >
              Atur Ulang Barang Terkait
            </button>
            <button
              onClick={() => {
                document.getElementById("modal_confirmation").showModal();
              }}
              className="btn btn-ghost w-full text-left hover:bg-red-100 hover:text-red-600"
            >
              Hapus Promo
            </button>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button
                className="btn"
                onClick={() => {
                  setSelectedPromo(null);
                  setPromoBaru(null);
                  setEditingPromo(false);
                  setShowPemilihanTerhubung(true);
                  document.getElementById("promoActions").close();
                }}
              >
                Tutup
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="pickbonus" className="modal absolute">
        <div className="modal-box relative  pb-10 w-full max-w-4xl">
          <h3 className="font-bold text-lg">Tentukan Barang Bonus Promo</h3>
          <FilterInventories
            onChange={(value) => {
              setFilter({ ...filter, searchKey: value.searchKey });
            }}
          />
          <div className="overflow-y-auto mb-4 max-h-screen">
            <table className="table w-full">
              <thead className="sticky top-16 bg-white">
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Harga Dasar</th>
                  <th>Terpilih</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {inventoriList?.data?.map((item) => (
                  <tr
                    key={item.sku}
                    className={`hover:bg-slate-200`}
                    onClick={() => {
                      handlePickBonus(item.sku);
                    }}
                  >
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.hargaDasar?.$numberDecimal || "0"}</td>
                    <td>
                      {(tempPickPromo === item.sku && "⭕") ||
                        ((promoBaru?.skuBarangBonus === item.sku ||
                          selectedPromo?.skuBarangBonus === item.sku) &&
                          "⭕")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bottom-0 left-0 right-0 absolute flex justify-between px-4 py-2 bg-white">
            <button
              className="btn"
              onClick={() => {
                setTempPickPromo(null);
                document.getElementById("pickbonus").close();
              }}
            >
              Batal
            </button>
            <button
              className="btn"
              onClick={() => {
                editingPromo
                  ? setSelectedPromo((prev) => ({
                      ...prev,
                      skuBarangBonus: tempPickPromo,
                    }))
                  : setPromoBaru((prev) => ({
                      ...prev,
                      skuBarangBonus: tempPickPromo,
                    }));
                document.getElementById("pickbonus").close();
              }}
            >
              Konfirmasi
            </button>
          </div>
        </div>
      </dialog>
      <dialog id="pickterkait" className="modal absolute">
        <div className="modal-box relative pb-10 w-full max-w-4xl">
          <h2 className="font-bold text-center mb-4">
            Pilih produk untuk implementasi promo ini
          </h2>

          <div className="overflow-y-auto" style={{ maxHeight: "700px" }}>
            <div className="flex flex-1 sticky bg-white translate-y-[-10px] p-1 top-2 z-10">
              <FilterInventories
                onChange={(value) => {
                  setFilter({ ...filter, searchKey: value.searchKey });
                }}
              />
            </div>
            <table className="table w-full ">
              <thead className="sticky top-14 bg-white">
                <tr>
                  <th>SKU</th>
                  <th>Deskripsi</th>
                  <th>Harga Dasar</th>
                  <th>Quantity</th>
                  <th>Terpilih</th>
                </tr>
              </thead>
              <tbody>
                {inventoriList?.data?.map((item) => (
                  <tr key={item._id}>
                    <td>{item.sku}</td>
                    <td>{item.description}</td>
                    <td>{item.RpHargaDasar?.$numberDecimal}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {(
                        (editingPromo
                          ? selectedPromo?.skuList
                          : promoBaru?.skuList) || []
                      ).includes(item.sku) ? (
                        <button
                          onClick={() => {
                            if (editingPromo) {
                              setSelectedPromo((prev) => ({
                                ...prev,
                                skuList: prev.skuList.filter(
                                  (sku) => sku !== item.sku,
                                ),
                              }));
                            } else {
                              setPromoBaru((prev) => ({
                                ...prev,
                                skuList: prev.skuList.filter(
                                  (sku) => sku !== item.sku,
                                ),
                              }));
                            }
                          }}
                          className="btn btn-sm bg-green-500 hover:bg-green-600 text-white"
                        >
                          Terpilih
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            if (editingPromo) {
                              setSelectedPromo((prev) => ({
                                ...prev,
                                skuList: [...(prev.skuList || []), item.sku],
                              }));
                            } else {
                              setPromoBaru((prev) => ({
                                ...prev,
                                skuList: [...(prev.skuList || []), item.sku],
                              }));
                            }
                          }}
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

          <div className="flex gap-x-3 sticky bottom-0 mt-4 bg-white pt-4">
            <button
              className="btn rounded flex-1 shadow-md btn-primary text-white"
              onClick={() => {
                document.getElementById("pickterkait").close();
              }}
            >
              Simpan
            </button>
          </div>
        </div>
      </dialog>
      <ModalConfirmation
        onConfirm={() => handleHapusPromo(selectedPromo?._id)}
        onCancel={() => {
          setSelectedPromo(null);
          document.getElementById("modal_confirmation").close();
        }}
        title="Konfirmasi Hapus Promo"
        message={`Apakah Anda yakin ingin menghapus promo "${selectedPromo?.namaPromo}"? Tindakan ini tidak dapat dibatalkan.`}
      />
      <ModalOutletOption
        onSubmit={(selectedOutletIds) => {
          if (editingPromo) {
            setSelectedPromo((prev) => ({
              ...prev,
              authorizedOutlets: selectedOutletIds,
            }));
          } else {
            setPromoBaru((prev) => ({
              ...prev,
              authorizedOutlets: selectedOutletIds,
            }));
          }
        }}
        authorizedOutlets={
          selectedPromo?.authorizedOutlets || promoBaru?.authorizedOutlets || []
        }
      />

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Upload CSV</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitImportPromo} className="space-y-4">
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

export default Promo;
