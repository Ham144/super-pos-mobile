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
  BellRingIcon,
  Download,
  FileSpreadsheet,
  FileWarningIcon,
  InfoIcon,
  RefreshCcw,
  Upload,
} from "lucide-react";
import ModalConfirmation from "@/components/ModalConfirmation";
import { getOuletByUserId, getOuletList } from "@/api/outletApi";
import ModalOutletOption from "@/components/ModalOutletOption";
import ModalPromoAction from "@/components/ModalPromoAction";
import ModalPromoUpload from "@/components/ModalPromoUpload";
import ModalPromoEditor from "@/components/ModalPromoEditor";

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
    queryFn: () => getOuletByUserId(userInfo?._id),
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
      document.getElementById("promoEditor")?.close();
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
      document.getElementById("promoEditor")?.close();
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

  useEffect(() => {
    const editor = document.getElementById("promoEditor");
    if (!editor) return;

    const shouldOpen = Boolean(promoBaru || (selectedPromo && editingPromo));
    if (shouldOpen) {
      if (!editor.open) editor.showModal();
    } else if (editor.open) {
      editor.close();
    }
  }, [selectedPromo, promoBaru, editingPromo]);

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
      <div className="flex flex-1 gap-x-4 min-h-[95vh] overflow-y-hidden">
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
          <div className="flex w-full overflow-x-aut ">
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
      </div>
      <ModalPromoEditor
          selectedPromo={selectedPromo}
          promoBaru={promoBaru}
          editingPromo={editingPromo}
          setSelectedPromo={setSelectedPromo}
          setPromoBaru={setPromoBaru}
          handleRegisterPromo={handleRegisterPromo}
          setShowPemilihanTerhubung={setShowPemilihanTerhubung}
          ShowpemilihanTerhubung={ShowpemilihanTerhubung}
          handleKonfirmasiTerhubung={handleKonfirmasiTerhubung}
          outletExtractor={outletExtractor}
          outletList={outletList}
          setTempPickTerhubung={setTempPickTerhubung}
          setEditingTerhubungItem={setEditingTerhubungItem}
          handleUpdatePromo={handleUpdatePromo}
          inventoriList={inventoriList}
          filter={filter}
          setFilter={setFilter}
        />
      <ModalPromoAction
        selectedPromo={selectedPromo}
        setSelectedPromo={setSelectedPromo}
        setPromoBaru={setPromoBaru}
        setEditingPromo={setEditingPromo}
        setShowPemilihanTerhubung={setShowPemilihanTerhubung}
        handleAturUlangBarangTerkait={handleAturUlangBarangTerkait}
      />
      <dialog id="pickbonus" className="modal absolute">
        <div className="modal-box relative  pb-10 w-full">
          <h3 className="font-bold text-lg">Tentukan Barang Bonus Promo</h3>
          <FilterInventories
            onChange={(value) => {
              setFilter({ ...filter, searchKey: value.searchKey });
            }}
          />
          <div className="overflow-y-auto mb-4 max-h-screen">
            <table className="table w-full ">
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
      <ModalPromoUpload
        isOpen={isOpen}
        handleSubmitImportPromo={handleSubmitImportPromo}
        handleFileChange={handleFileChange}
        file={file}
        setIsOpen={setIsOpen}
        isImporting={isImporting}
      />
    </div>
  );
};

export default Promo;
