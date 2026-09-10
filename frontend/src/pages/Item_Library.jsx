import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllinventories,
  updateSingleInventory,
  createSingleInventory,
  importInventoryCsv,
  toggleDisableInventory,
} from "../api/itemLibraryApi";

const formatInventoryImportError = (data) => {
  if (!data) return "Terjadi kesalahan";
  const parts = [];
  if (data.duplicatedSkus?.length) {
    parts.push(`SKU duplikat: ${data.duplicatedSkus.join(", ")}`);
  }
  const missing = (data.details || data.errors || []).filter((d) =>
    d.reason?.startsWith("SKU tidak terdaftar"),
  );
  if (missing.length) {
    parts.push(
      `SKU tidak terdaftar: ${missing
        .map((d) => d.sku)
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  const detailList = (data.details || data.errors || []).filter(
    (d) => !d.reason?.startsWith("SKU tidak terdaftar"),
  );
  detailList.forEach((d) => {
    if (d.sku) {
      parts.push(`Baris ${d.row} (${d.sku}): ${d.reason}`);
    } else {
      parts.push(`Baris ${d.row}: ${d.reason}`);
    }
  });
  if (parts.length) return parts.join(" | ");
  return data.message || "Terjadi kesalahan";
};
import toast, { Toaster } from "react-hot-toast";
import { getAllBarangPromo, getAllPromoByProduct } from "../api/promoApi";
import { getAllDiskon, getAllDiskonByProduct } from "../api/diskonApi";
import { getAllBrands } from "../api/brandApi";
import { getAllVouchers } from "../api/voucherApi";
import PickPromoDialog from "../components/pickPromoDialog";
import PickDiskonDialog from "../components/pickDiskonDialog";
import PickVoucherDialog from "../components/pickVoucherDialog";
import { useNavigate, useLocation } from "react-router-dom";
import FilterInventories from "../components/filterInventories";
import { useFilter } from "../store";

import {
  BellRing,
  FileWarning,
  Info,
  Filter,
  Plus,
  Upload,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Binoculars,
  Trash2,
  ShieldCheck,
  X,
  Check,
  AlertCircle,
  Package,
  Tag,
  Percent,
  Gift,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Save,
} from "lucide-react";
import { getImage, uploadThumbail } from "../api/thumbnailApi";
import StackTraceBySku from "@/components/StackTraceBySku";
import { parseRpHargaDasar } from "@/utils/parseRpHargaDasar";

const ItemLibrary = () => {
  //router and query hooks
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get searchKey from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const searchFromUrl = searchParams.get("searchKey");

  //inventory states
  const [selectedInventory, setselectedInventory] = useState(null);
  const [newSingleInventory, setNewSingleInventory] = useState(null);
  const [selectedImage, setSelectedImage] = useState();
  const [skuToTrace, setSkuToTrace] = useState(null);

  //promo states
  const [tempPromoTerhubung, setTempPromoTerhubung] = useState([]);
  const [tempPromoTerputus, setTempPromoTerputus] = useState([]);

  //diskon states
  const [tempDiskonTerhubung, setTempDiskonTerhubung] = useState([]);
  const [tempDiskonTerputus, setTempDiskonTerputus] = useState([]);

  //voucher states
  const [tempVoucherTerhubung, setTempVoucherTerhubung] = useState([]);
  const [tempVoucherTerputus, setTempVoucherTerputus] = useState([]);

  //zustand
  const { filter, setFilter } = useFilter();

  // Menambahkan state untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = filter.limit || 100;
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });

  // Set initial filter with searchKey from URL if it exists
  useEffect(() => {
    if (searchFromUrl) {
      setFilter({ ...filter, searchKey: searchFromUrl });
    }
  }, [searchFromUrl]);
  
  // Reset currentPage ketika filter berubah (kecuali perubahan skip)
  useEffect(() => {
    // Jika filter berubah (selain skip dan page, yang berubah karena pagination)
    if (!filter.skip || filter.skip === 0) {
      console.log("Resetting page to 1");
      setCurrentPage(1);
      // Ensure skip is also reset while preserving other filter properties
      setFilter({
        ...filter,
        page: 1,
        skip: 0,
      });
    }
  }, [
    filter.searchKey,
    filter.startDate,
    filter.endDate,
    filter.limit,
    filter.asc,
    filter.brandIds,
  ]);

  const resetInventoryFormState = () => {
    setselectedInventory(null);
    setNewSingleInventory(null);
    setSelectedImage(null);
    setTempPromoTerhubung([]);
    setTempPromoTerputus([]);
    setTempDiskonTerhubung([]);
    setTempDiskonTerputus([]);
    setTempVoucherTerhubung([]);
    setTempVoucherTerputus([]);
  };

  const closeInventoryModal = () => {
    document.getElementById("modalInventoryForm")?.close();
  };

  const openInventoryModal = () => {
    requestAnimationFrame(() => {
      document.getElementById("modalInventoryForm")?.showModal();
    });
  };

  const { mutateAsync: handleToggleDisableInventory } = useMutation({
    mutationFn: (id) => toggleDisableInventory(id),
    onSuccess: () => {
      toast.success("berhasil mengubah status inventory");
      queryClient.invalidateQueries(["inventories"]);
      closeInventoryModal();
    },
    onError: (error) => {
      toast.error(
        error.response.data.message || "gagal mengubah status inventory",
      );
    },
  });

  // When inventory data is loaded and we have a searchKey, select the matching inventory
  const {
    data: inventoryData,
    refetch: refetchInventories,
    isLoading: inventoryLoading,
  } = useQuery({
    queryKey: [
      "inventories",
      {
        ...filter,
        page: currentPage,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      },
    ],
    queryFn: (filter) => getAllinventories(filter),
  });

  // Extract inventories and pagination info from response
  const inventories = inventoryData?.data || [];

  useEffect(() => {
    function initilizePagination() {
      setTotalItems(inventoryData?.totalItems);
      setTotalPages(inventoryData?.totalPages);
    }

    initilizePagination();
  }, [inventoryData, inventories, itemsPerPage, totalPages]);

  // Handle page change
  const handlePageChange = (newPage) => {
    // Update current page state
    setCurrentPage(newPage);

    // Calculate skip value based on page and itemsPerPage
    const skipValue = (newPage - 1) * itemsPerPage;

    // Update filter dengan skip yang benar dan page
    setFilter({
      ...filter,
      page: newPage,
      skip: skipValue,
    });
  };

  useEffect(() => {
    if (searchFromUrl && inventories) {
      const matchingInventory = inventories.find(
        (inv) => inv.sku === searchFromUrl,
      );
      if (matchingInventory) {
        setNewSingleInventory(null);
        setselectedInventory(matchingInventory);
        openInventoryModal();
      }
    }
  }, [inventories, searchFromUrl]);

  //------thumbnail api start---
  const { mutateAsync: handleUploadImage } = useMutation({
    mutationFn: () =>
      uploadThumbail({
        file: selectedImage,
        sku: selectedInventory.sku,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["thumbnail", selectedInventory?.sku]);
      setSelectedImage(null);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Gagal mengupload thumbnail",
      );
    },
  });
  const { data: thumbnail } = useQuery({
    queryFn: () => getImage(selectedInventory?.sku),
    queryKey: ["thumbnail", selectedInventory?.sku],
    enabled: !!selectedInventory?.sku,
  });
  //------thumbnail api end---

  const handleItemClick = (item) => {
    setSelectedImage(null);
    setNewSingleInventory(null);
    setselectedInventory(item);
    openInventoryModal();
  };

  const { data: promoList } = useQuery({
    queryFn: getAllBarangPromo,
    queryKey: ["promo"],
  });
  const { data: diskonList } = useQuery({
    queryFn: getAllDiskon,
    queryKey: ["diskon"],
  });
  const { data: brandList } = useQuery({
    queryFn: getAllBrands,
    queryKey: ["brand"],
  });

  const { data: voucherList } = useQuery({
    queryFn: getAllVouchers,
    queryKey: ["voucher"],
    enabled: !!selectedInventory,
  });

  const { data: selectedInventoryPromoList } = useQuery({
    queryFn: () => getAllPromoByProduct(selectedInventory?.sku),
    queryKey: ["promoList", selectedInventory],
    enabled: !!selectedInventory,
  });


  const { data: selectedInventoryDiskonList } = useQuery({
    queryFn: () => getAllDiskonByProduct(selectedInventory?.sku),
    queryKey: ["diskonList", selectedInventory],
    enabled: !!selectedInventory,
    });

  const { mutateAsync: handleUpdateInventory } = useMutation({
    mutationFn: async (body) => {
      const response = await updateSingleInventory({
        ...body,
        RpHargaDasar: parseRpHargaDasar(body.RpHargaDasar),
      });
      return response;
    },
    mutationKey: ["inventories"],
    onSuccess: async (response) => {
      // Pastikan response sukses
      if (response) {
        toast.success("berhasil Update");
        closeInventoryModal();
        // Invalidate dan refetch dengan await
        await queryClient.invalidateQueries(["inventories"]);
        await refetchInventories();
      } else {
        toast.error(
          response?.response?.data?.message ||
            "Gagal mengupdate: Tidak ada response dari server",
        );
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "gagal mengupdate");
    },
  });

  const { mutateAsync: handleCreateSingleInventory } = useMutation({
    mutationFn: async (body) => {
      const response = await createSingleInventory({
        ...body,
        RpHargaDasar: parseRpHargaDasar(body.RpHargaDasar),
      });
      return response;
    },
    onSuccess: async (response) => {
      // Pastikan response sukses
      if (response) {
        // Invalidate dan refetch dengan await
        await queryClient.invalidateQueries(["inventories"]);
        await refetchInventories();
        toast.success("berhasil register new single inventory");
        closeInventoryModal();
        document.getElementById("modalInventoryForm")?.close(); 
      } else {
        toast.error(
          response?.response?.data?.message ||
            "Gagal membuat inventory: Tidak ada response dari server",
        );
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "gagal membuat inventory");
    },
  });
  
  const { mutateAsync: handleImportCsv, isPending: isImporting } = useMutation({
    mutationFn: importInventoryCsv,
    onSuccess: (response) => {
      queryClient.invalidateQueries(["inventories"]);
      refetchInventories();
      toast.success(response?.message || "Import berhasil");
    },
    onError: (error) => {
      toast.error(formatInventoryImportError(error?.response?.data));
    },
  });

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await handleImportCsv(file);
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    const parsedValue =
      name === "RpHargaDasar" ? value.replace(/[^\d]/g, "") : value;
    if (newSingleInventory) {
      setNewSingleInventory({ ...newSingleInventory, [name]: parsedValue });
    } else {
      setselectedInventory({ ...selectedInventory, [name]: parsedValue });
    }
  };

  const handleShowValue = () => {
    if (newSingleInventory) {
      return newSingleInventory;
    }
    return selectedInventory || {};
  };

  const handleDirectPromoTerputus = (id) => {
    // Tambahkan ke daftar promo yang akan dihapus
    setselectedInventory((prev) => ({
      ...prev,
      promosToDelete: [...(prev.promosToDelete || []), id],
      // Hapus dari daftar promo yang akan ditambahkan jika ada
      promosToAdd: (prev.promosToAdd || []).filter((promoId) => promoId !== id),
    }));

    // Update UI langsung
    const promoListFound = promoList.data.find((promo) => promo._id === id);
    if (promoListFound) {
      promoListFound.skuList = promoListFound.skuList.filter(
        (sku) => sku !== selectedInventory.sku,
      );
    }
  };

  const handleDirectDiskonTerputus = (id) => {
    // Tambahkan ke daftar diskon yang akan dihapus
    setselectedInventory((prev) => ({
      ...prev,
      diskonsToDelete: [...(prev.diskonsToDelete || []), id],
      // Hapus dari daftar diskon yang akan ditambahkan jika ada
      diskonsToAdd: (prev.diskonsToAdd || []).filter(
        (diskonId) => diskonId !== id,
      ),
    }));

    // Update UI langsung
    const diskonListFound = diskonList?.data?.data?.find(
      (diskon) => diskon._id === id,
    );
    if (diskonListFound) {
      diskonListFound.skuTanpaSyarat = diskonListFound.skuTanpaSyarat.filter(
        (sku) => sku !== selectedInventory.sku,
      );
    }
  };

  const handleDirectVoucherTerputus = (id) => {
    // Tambahkan ke daftar voucher yang akan dihapus
    setselectedInventory((prev) => ({
      ...prev,
      vouchersToDelete: [...(prev.vouchersToDelete || []), id],
      // Hapus dari daftar voucher yang akan ditambahkan jika ada
      vouchersToAdd: (prev.vouchersToAdd || []).filter(
        (voucherId) => voucherId !== id,
      ),
    }));

    // Update UI langsung
    const voucherListFound = voucherList?.data?.find(
      (voucher) => voucher._id === id,
    );
    if (voucherListFound) {
      voucherListFound.skuList = voucherListFound.skuList.filter(
        (sku) => sku !== selectedInventory.sku,
      );
    }
  };

  const handleKonfirmasiPromoTerhubung = async () => {
    // Update selectedInventory dengan promo baru
    setselectedInventory((prev) => ({
      ...prev,
      promosToAdd: tempPromoTerhubung,
      promosToDelete: tempPromoTerputus,
    }));

    // Update promoList untuk refleksi UI langsung
    if (promoList?.data) {
      promoList.data = promoList.data.map((promo) => {
        // Jika promo ada di tempPromoTerhubung, tambahkan ke skuList
        if (tempPromoTerhubung?.includes(promo._id)) {
          return {
            ...promo,
            skuList: [...(promo.skuList || []), selectedInventory?.sku],
          };
        }
        // Jika promo ada di tempPromoTerputus, hapus dari skuList
        if (tempPromoTerputus?.includes(promo._id)) {
          return {
            ...promo,
            skuList: (promo.skuList || []).filter(
              (sku) => sku !== selectedInventory?.sku,
            ),
          };
        }
        return promo;
      });
    }

    document.getElementById("pickpromo").close();
    setTempPromoTerhubung([]);
    setTempPromoTerputus([]);
  };

  const handleKonfirmasiDiskonTerhubung = async () => {
    // Update selectedInventory dengan diskon baru
    setselectedInventory((prev) => ({
      ...prev,
      diskonsToAdd: tempDiskonTerhubung,
      diskonsToDelete: tempDiskonTerputus,
    }));

    // Update diskonList untuk refleksi UI langsung
    if (diskonList?.data?.data) {
      diskonList.data.data = diskonList.data.data.map((diskon) => {
        // Jika diskon ada di tempDiskonTerhubung, tambahkan ke skuTanpaSyarat
        if (tempDiskonTerhubung?.includes(diskon._id)) {
          return {
            ...diskon,
            skuTanpaSyarat: [
              ...(diskon.skuTanpaSyarat || []),
              selectedInventory?.sku,
            ],
          };
        }
        // Jika diskon ada di tempDiskonTerputus, hapus dari skuTanpaSyarat
        if (tempDiskonTerputus?.includes(diskon._id)) {
          return {
            ...diskon,
            skuTanpaSyarat: (diskon.skuTanpaSyarat || []).filter(
              (sku) => sku !== selectedInventory?.sku,
            ),
          };
        }
        return diskon;
      });
    }

    document.getElementById("pickdiskon").close();
    setTempDiskonTerhubung([]);
    setTempDiskonTerputus([]);
  };

  const handleKonfirmasiVoucherTerhubung = async () => {
    // Update selectedInventory dengan voucher baru
    setselectedInventory((prev) => ({
      ...prev,
      vouchersToAdd: tempVoucherTerhubung,
      vouchersToDelete: tempVoucherTerputus,
    }));

    // Update voucherList untuk refleksi UI langsung
    if (voucherList?.data) {
      voucherList.data = voucherList.data.map((voucher) => {
        // Jika voucher ada di tempVoucherTerhubung, tambahkan ke skuList
        if (tempVoucherTerhubung?.includes(voucher._id)) {
          return {
            ...voucher,
            skuList: [...(voucher.skuList || []), selectedInventory?.sku],
          };
        }
        // Jika voucher ada di tempVoucherTerputus, hapus dari skuList
        if (tempVoucherTerputus?.includes(voucher._id)) {
          return {
            ...voucher,
            skuList: (voucher.skuList || []).filter(
              (sku) => sku !== selectedInventory?.sku,
            ),
          };
        }
        return voucher;
      });
    }

    // Update UI di form selectedInventory
    const updatedVouchers = voucherList?.data?.filter(
      (voucher) =>
        tempVoucherTerhubung?.includes(voucher._id) ||
        (voucher.skuList?.includes(selectedInventory?.sku) &&
          !tempVoucherTerputus?.includes(voucher._id)),
    );

    setselectedInventory((prev) => ({
      ...prev,
      connectedVouchers: updatedVouchers,
    }));

    document.getElementById("pickvoucher").close();
    setTempVoucherTerhubung([]);
    setTempVoucherTerputus([]);
  };

  const generatePaginationNumbers = (
    currentPage,
    totalPages,
    maxVisiblePages = 5,
  ) => {
    const pages = [];
    const startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2),
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Add first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("..."); // Ellipsis for pages before the current block
      }
    }

    // Add pages around the current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("..."); // Ellipsis for pages after the current block
      }
      pages.push(totalPages);
    }

    if (
      pages.length > maxVisiblePages + (pages.includes("...") ? 1 : 0) &&
      totalPages > maxVisiblePages
    ) {
    }

    const uniquePages = [];
    let prevPage = null;
    for (const page of pages) {
      if (page === "..." && prevPage === "...") {
        continue; // Skip consecutive ellipses
      }
      uniquePages.push(page);
      prevPage = page;
    }

    return uniquePages;
  };

  const paginationItems = generatePaginationNumbers(currentPage, totalPages, 5); // Mengatur 5 halaman terlihat

  const sortedInventories = useMemo(() => {
    const sorted = [...inventories];
    if (sortConfig.field !== null) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.field];
        let bValue = b[sortConfig.field];

        // convert decimal string to number for RpHargaDasar
        if (sortConfig.field === "RpHargaDasar") {
          aValue = parseRpHargaDasar(aValue) ?? 0;
          bValue = parseRpHargaDasar(bValue) ?? 0;
        }

        // normalize string
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [inventories, sortConfig]);

  const requestSort = (field) => {
    let direction = "asc";
    if (sortConfig.field === field && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ field, direction });
  };

  const exportCSV = () => {
    const csvRows = [];
    const headers = ["Sku", "Harga Dasar", "Deskripsi", "Brand", "Barcode"];
    csvRows.push(headers.join(";"));

    // Contoh data template (bisa disesuaikan atau dikosongkan)
    const templateData = [
      {
        sku: "SKU001",
        RpHargaDasar: 15000,
        description: "Contoh Deskripsi Produk 1",
        brand: "Contoh Brand A",
        barcodeItem: "CB001",
      },
      {
        sku: "SKU002",
        RpHargaDasar: 30000,
        description: "Contoh Deskripsi Produk 2",
        brand: "Contoh Brand B",
        barcodeItem: "CB002",
      },
      {
        sku: "",
        RpHargaDasar: "",
        description: "",
        brand: "",
        barcodeItem: "",
      },
      // Anda bisa menambahkan lebih banyak baris contoh di sini
    ];

    templateData.forEach((item) => {
      const row = [
        item.sku,
        item.RpHargaDasar,
        item.description,
        item.brand,
        item.barcodeItem,
      ];
      csvRows.push(row.join(";"));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      "contoh_csv_untuk_create_or_update_inventory_tak_menerima_quantity.csv",
    ); // Nama file template yang lebih sesuai
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50 flex">
      {/* Main Content */}
      <div className="w-full">
        {/* Header with Notifications */}
        <div className="bg-white border-b border-blue-100 sticky top-0 z-30 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* Actions */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              {/* Notifications Dropdown */}
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-circle hover:bg-blue-50 transition-colors"
                >
                  <div className="relative">
                    <BellRing className="w-6 h-6 text-blue-600" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white"></span>
                  </div>
                </label>
                <div className="dropdown-content z-40 menu p-4 shadow-xl bg-white rounded-2xl w-96 mt-2 border border-blue-100">
                  <div className="space-y-3">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <FileWarning className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-sm text-gray-700">
                          Jika terdapat Brand maka sku yang terkait brand
                          tersebut saja yang ditampilkan disini, hilangkan
                          filter brand untuk melihat semua
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <Info className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-700">
                          Di mobile, barang tidak memiliki harga pun sekarang
                          akan tetap muncul, karena user biasanya membuat barang
                          bonus RP.0
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="badge badge-lg bg-gradient-to-r from-blue-950 to-blue-600 text-white border-0 px-4 py-3">
                <Package className="w-4 h-4 mr-2" />
                Total: {totalItems} Item
              </div>
              
              <button
                onClick={() => {
                  setselectedInventory(null);
                  setSelectedImage(null);
                  setNewSingleInventory({});
                  openInventoryModal();
                }}
                className="btn bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-950/25"
              >
                <Plus className="w-5 h-5" />
                Tambah Item
              </button>

              <div className="dropdown dropdown-hover">
                <label
                  tabIndex={0}
                  className="btn btn-outline border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import / Export
                </label>
                <ul className="dropdown-content z-40 menu p-2 shadow-xl bg-white rounded-xl w-52 border border-blue-100">
                  <li>
                    <label
                      className={`flex items-center gap-2 text-gray-700 hover:bg-blue-50 rounded-lg p-2 cursor-pointer ${isImporting ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      {isImporting ? "Mengimpor..." : "Import CSV"}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        disabled={isImporting}
                        onChange={handleCSVUpload}
                        onClick={(e) => (e.target.value = null)}
                      />
                    </label>
                  </li>
                  <li>
                    <a
                      onClick={exportCSV}
                      className="flex items-center gap-2 text-gray-700 hover:bg-blue-50 rounded-lg p-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      Export CSV Template
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="px-4 pb-3">
            <FilterInventories
              onChange={(value) =>
                setFilter({ ...filter, searchKey: value.searchKey })
              }
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            <div className="badge badge-primary m-4 bg-blue-100 text-blue-700 border-blue-200">
              <Info className="w-4 h-4 mr-1" />
              Klik 2x untuk mengedit
            </div>

            <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 sticky top-0 z-10">
                  <tr>
                    {[
                      { label: "SKU", field: "sku", sortable: true },
                      {
                        label: "Deskripsi",
                        field: "description",
                        sortable: false,
                      },
                      { label: "Outlet", field: "outlet", sortable: false },
                      {
                        label: "Qty",
                        field: "quantity",
                        sortable: true,
                        align: "center",
                      },
                      {
                        label: "Terjual",
                        field: "terjual",
                        sortable: true,
                        align: "center",
                      },
                      {
                        label: "Status",
                        field: null,
                        sortable: false,
                        align: "center",
                      },
                      {
                        label: "Harga Dasar",
                        field: "RpHargaDasar",
                        sortable: true,
                        align: "right",
                      },
                      { label: "Brand", field: "brand", sortable: true },
                      {
                        label: "Promo",
                        field: null,
                        sortable: false,
                        align: "center",
                      },
                      {
                        label: "Diskon",
                        field: null,
                        sortable: false,
                        align: "center",
                      },
                    ].map((col, idx) => (
                      <th
                        key={idx}
                        onClick={() => col.sortable && requestSort(col.field)}
                        className={`px-4 py-4 text-xs font-semibold text-blue-800 uppercase tracking-wider whitespace-nowrap
                                                ${col.sortable ? "cursor-pointer hover:bg-blue-200/50" : ""}
                                                ${col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"}
                                            `}
                      >
                        <div
                          className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
                        >
                          {col.label}
                          {col.sortable && (
                            <div className="inline-flex">
                              {sortConfig.field === col.field ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-4 h-4 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedInventories?.length ? (
                    sortedInventories.map((item, index) => (
                      <tr
                        key={index}
                        onDoubleClick={() => {
                          handleItemClick(item);
                          setSkuToTrace(null);
                        }}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSkuToTrace(item.sku);
                                document
                                  .getElementById("stack-trace-single-sku")
                                  .showModal();
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
                              title="Lihat Stack Trace"
                            >
                              <Binoculars className="w-4 h-4 text-blue-600" />
                            </button>
                            <span className="font-medium text-blue-700">
                              {item.sku}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {item.outlet?.namaOutlet || "tidak terhubung"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item?.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.terjual || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isDisabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3" />
                              Nonaktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Check className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className="text-blue-600 font-semibold">
                            {Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0,
                            }).format(
                              parseRpHargaDasar(item.RpHargaDasar) ?? 0,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                            {item.brand || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {promoList?.data.find((p) =>
                            p.skuList?.includes(item.sku),
                          ) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <Gift className="w-4 h-4 text-green-600" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                              <X className="w-4 h-4 text-red-600" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {diskonList?.data?.data.find((d) =>
                            d.skuTanpaSyarat?.includes(item?.sku),
                          ) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <Percent className="w-4 h-4 text-green-600" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                              <X className="w-4 h-4 text-red-600" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Package className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-gray-500">
                            Tidak ada data inventori
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Loading */}
            {inventoryLoading && (
              <div className="flex justify-center py-8">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages >= 1 && (
              <div className="flex justify-center py-4 bg-gradient-to-r from-blue-50/50 to-white border-t border-blue-100">
                <div className="flex gap-2">
                  <button
                    className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  {paginationItems.map((item, index) => {
                    if (item === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-3 py-2 text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={item}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          item === currentPage
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                            : "border border-gray-200 hover:bg-blue-50 text-gray-700"
                        }`}
                        onClick={() => handlePageChange(item)}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Create / Edit Modal */}
      <dialog
        id="modalInventoryForm"
        className="modal"
        onClose={resetInventoryFormState}
      >
        <Toaster position="top-center" />
        <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                {newSingleInventory ? "Tambah Item" : "Edit Item"}
              </h3>
              <p className="text-blue-100 text-sm mt-0.5">
                {newSingleInventory
                  ? "Register inventory baru"
                  : selectedInventory?.sku ||
                    selectedInventory?.description ||
                    "—"}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost text-white"
              onClick={closeInventoryModal}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {(selectedInventory || newSingleInventory) && (
            <>
              <div className="px-6 py-3 border-b bg-gray-50 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeInventoryModal}
                  className="btn btn-ghost flex-1"
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (newSingleInventory) {
                      handleCreateSingleInventory(newSingleInventory);
                    } else {
                      if (selectedImage) {
                        await handleUploadImage();
                        await handleUpdateInventory(selectedInventory);
                      } else {
                        handleUpdateInventory(selectedInventory);
                      }
                    }
                  }}
                  className="btn btn-primary flex-1"
                >
                  <Save className="w-4 h-4" />
                  {newSingleInventory ? "Register" : "Update"}
                </button>
              </div>

              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {newSingleInventory && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={handleShowValue().sku}
                      onChange={handleOnChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      placeholder="Masukkan SKU"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Deskripsi (Nama Produk)
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={handleShowValue().description}
                    onChange={handleOnChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    placeholder="Masukkan deskripsi"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="text"
                    name="quantity"
                    value={handleShowValue().quantity}
                    onChange={handleOnChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Barcode Item
                  </label>
                  <input
                    type="text"
                    name="barcodeItem"
                    value={handleShowValue().barcodeItem}
                    onChange={handleOnChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    placeholder="Masukkan barcode"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Brand
                  </label>
                  <select
                    name="brand"
                    value={handleShowValue().brand}
                    onChange={handleOnChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                  >
                    <option value={handleShowValue().brand}>
                      {handleShowValue().brand || "Pilih Brand"}
                    </option>
                    {brandList?.data?.data?.map((b) => (
                      <option key={b._id} value={b.name}>
                        {b?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Harga Dasar
                  </label>
                  <input
                    type="text"
                    name="RpHargaDasar"
                    value={
                      parseRpHargaDasar(handleShowValue()?.RpHargaDasar) ?? ""
                    }
                    onChange={handleOnChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    placeholder="0"
                  />
                </div>

                {/* Promo Section */}
                <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-800">
                        Promo Terhubung
                      </h3>
                    </div>
                    <button
                      onClick={() => navigate("/promo")}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Kelola Promo
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {promoList?.data?.map(
                      (promo) =>
                        (promo.skuList.includes(handleShowValue().sku) ||
                          tempPromoTerhubung?.includes(promo._id)) && (
                          <span
                            key={promo._id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs"
                          >
                            {promo?.judulPromo}
                            <button
                              onClick={() =>
                                handleDirectPromoTerputus(promo._id)
                              }
                              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ),
                    )}
                  </div>
                  <button
                    onClick={() => {
                      document.getElementById("pickpromo").showModal();
                      setTempPromoTerhubung(
                        selectedInventoryPromoList?.data?.data.map(
                          (item) => item._id,
                        ),
                      );
                    }}
                    className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Atur Promo
                  </button>
                </div>

                {/* Diskon Section */}
                <div className="bg-gradient-to-r from-orange-50 to-white rounded-xl p-4 border border-orange-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-800">
                        Diskon Terhubung
                      </h3>
                    </div>
                    <button
                      onClick={() => navigate("/diskon")}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      Kelola Diskon
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {diskonList?.data?.data?.map(
                      (diskon) =>
                        (diskon.skuTanpaSyarat.includes(handleShowValue().sku) ||
                          tempDiskonTerhubung?.includes(diskon._id)) && (
                          <span
                            key={diskon._id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs"
                          >
                            {diskon?.judulDiskon}
                            <button
                              onClick={() =>
                                handleDirectDiskonTerputus(diskon._id)
                              }
                              className="ml-1 p-0.5 hover:bg-orange-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ),
                    )}
                  </div>
                  <button
                    onClick={() => {
                      document.getElementById("pickdiskon").showModal();
                      setTempDiskonTerhubung(
                        selectedInventoryDiskonList?.data?.data.map(
                          (item) => item._id,
                        ),
                      );
                    }}
                    className="mt-3 w-full px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
                  >
                    Atur Diskon
                  </button>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Status
                    <span
                      className={`text-xs ${selectedInventory?.isDisabled ? "text-red-500" : "text-green-500"}`}
                    >
                      {selectedInventory?.isDisabled
                        ? "(Tidak Aktif)"
                        : "(Aktif)"}
                    </span>
                    <div className="dropdown dropdown-hover">
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="dropdown-content z-40 p-2 shadow-xl bg-white rounded-lg text-xs w-48">
                        Jika Barang Disabled, tidak akan bisa terjual di aplikasi
                        mobile
                      </div>
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setselectedInventory((prev) => ({
                          ...prev,
                          isDisabled: true,
                        }))
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedInventory?.isDisabled
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Disable
                    </button>
                    <button
                      onClick={() =>
                        setselectedInventory((prev) => ({
                          ...prev,
                          isDisabled: false,
                        }))
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !selectedInventory?.isDisabled
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Enable
                    </button>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Thumbnail
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                        <img
                          alt="Preview"
                          src={
                            selectedImage
                              ? URL.createObjectURL(selectedImage)
                              : thumbnail?.data?.base64
                          }
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedImage(e.target.files[0])}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>

      {/* Modals */}
      <PickPromoDialog
        promoList={promoList?.data}
        selectedInventory={selectedInventory}
        tempPromoTerhubung={tempPromoTerhubung}
        setTempPromoTerhubung={setTempPromoTerhubung}
        setTempPromoTerputus={setTempPromoTerputus}
        tempPromoTerputus={tempPromoTerputus}
        handleKonfirmasiPromoTerhubung={handleKonfirmasiPromoTerhubung}
      />

      <PickDiskonDialog
        diskonList={diskonList?.data?.data}
        selectedInventory={selectedInventory}
        tempDiskonTerhubung={tempDiskonTerhubung}
        setTempDiskonTerhubung={setTempDiskonTerhubung}
        handleKonfirmasiDiskonTerhubung={handleKonfirmasiDiskonTerhubung}
        setTempDiskonTerputus={setTempDiskonTerputus}
      />

      <PickVoucherDialog
        tempVoucherTerhubung={tempVoucherTerhubung}
        tempVoucherTerputus={tempVoucherTerputus}
        setTempVoucherTerhubung={setTempVoucherTerhubung}
        setTempVoucherTerputus={setTempVoucherTerputus}
        handleKonfirmasiVoucherTerhubung={handleKonfirmasiVoucherTerhubung}
        voucherList={voucherList?.data}
        selectedInventory={selectedInventory}
      />

      <StackTraceBySku skuToTrace={skuToTrace} />
    </div>
  );
};

export default ItemLibrary;
