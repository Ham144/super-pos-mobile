import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, Fragment } from "react";
import { getInvoiceFilterComplex, voidInvoice } from "../api/invoiceApi";
import { getAllSpg } from "../api/spgApi";
import { getAllAccount } from "../api/authApi";
import { useUserInfo } from "../store";
import { getOuletList, getOuletByUserId } from "../api/outletApi";
import ModalVoid from "@/components/ModalVoid";
import toast from "react-hot-toast";
import { getAllinventories } from "@/api/itemLibraryApi";
import { getAllPaymentMethod } from "@/api/paymentMethodApi";
import ModalDetailInvoice from "@/components/ModalDetailInvoice";

import {
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  UserCircle,
  Download,
  ChevronUp,
  ChevronDown,
  Eye,
  XCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  ShoppingCart,
  Tag,
  Gift,
  Percent,
  CreditCard,
  Printer,
  ChevronLeft,
  ChevronRight,
  Ban,
} from "lucide-react";

// angka mentah untuk CSV — hindari 300.000 yang dibaca Excel sebagai 300
const csvAngka = (nilai) =>
  nilai != null && nilai !== "" ? String(nilai) : "";

export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("id-ID", options);
  } catch (e) {
    return "Tanggal tidak valid";
  }
};

const Invoices = () => {
  const { userInfo } = useUserInfo();
  const [showDetail, setShowDetail] = useState(null);

  const queryClient = useQueryClient();
  const { mutate: handleVoidInvoice } = useMutation({
    mutationFn: (invoiceId) => voidInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "invoices",
          "user",
          "outlet",
          "spg",
          "kasir",
          "diskon",
          "promo",
          "voucher",
          "invoice",
        ],
      });
      toast?.success("Invoice berhasil dibatalkan");
      setSelectedInvoice(null);
      document.getElementById("void").checked = false;
      queryClient.invalidateQueries({
        queryKey: ["invoice", getQueryParams()],
      });
    },
    onError: (error) => {
      toast?.error(
        error?.response?.data?.message || "Gagal membatalkan invoice",
      );
      setSelectedInvoice(null);
      document.getElementById("void").checked = false;
    },
  });

  //inventoris
  const { data: handleGetInventoryById } = useQuery({
    queryKey: ["inventories"],
    queryFn: getAllinventories,
  });

  // Fetch data outlet berdasarkan user yang login
  const { data: myOutlet } = useQuery({
    queryKey: ["outlet", userInfo?._id],
    queryFn: () => getOuletByUserId(userInfo?._id),
    enabled: !!userInfo?._id,
  });

  // Fetch data semua outlet
  const { data: outletData } = useQuery({
    queryKey: ["outlet"],
    queryFn: getOuletList,
  });

  // State untuk filter
  const [status, setStatus] = useState("all");
  const [sortBy, setsortBy] = useState("time");
  const [outlet, setOutlet] = useState(myOutlet?.data?.kodeOutlet || "");
  const [spg, setSpg] = useState("");
  const [kasir, setKasir] = useState("");
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  // State untuk expandable rows
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Format status untuk API
  const getStatusForApi = () => {
    if (status === "complete") return { done: "true", isVoid: "false" };
    if (status === "void") return { isVoid: "true" };
    if (status === "pending") return { done: "false", isVoid: "false" };
    if (status === "all") return {}; // Tidak perlu filter untuk "all"
    return {};
  };

  // Format sortBy untuk API
  const getsortByForApi = () => {
    if (sortBy === "time") return { sortBy: "createdAt", sortOrder: "desc" };
    if (sortBy === "invoice")
      return { sortBy: "kodeInvoice", sortOrder: "asc" };
    if (sortBy === "total") return { sortBy: "total", sortOrder: "desc" };
    return { sortBy: "createdAt", sortOrder: "desc" };
  };

  // Membuat query params untuk API
  const getQueryParams = () => {
    const statusParams = getStatusForApi();
    const sortByParams = getsortByForApi();

    return {
      ...statusParams,
      ...sortByParams,
      kodeOutlet: outlet,
      spg: spg || undefined,
      kasir: kasir || undefined,
      limit: limit === "All" ? "All" : parseInt(limit),
      search: search || undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      page: currentPage,
    };
  };

  // Fetch data invoice menggunakan TanStack Query
  const {
    data: invoiceData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["invoice", getQueryParams()],
    queryFn: () => getInvoiceFilterComplex(["", getQueryParams()]),
    keepPreviousData: true,
  });

  // Fetch data SPG
  const { data: spgData } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  // Fetch data Kasir/Accounts
  const { data: accountsData } = useQuery({
    queryKey: ["user"],
    queryFn: getAllAccount,
  });

  const { data: paymentMethodList } = useQuery({
    queryKey: ["paymentMethod"],
    queryFn: getAllPaymentMethod,
  });

  // Toggle expanded row
  const toggleExpandRow = (invoiceId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }));
  };

  // Mendapatkan nama SPG dari ID
  const getSpgNameById = (spgId) => {
    if (!spgData?.data) return spgId;
    const spgItem = spgData?.data?.find((item) => item._id == spgId);
    return spgItem ? spgItem?.name : "spg telah dihapus" || "spg tidak ada?";
  };

  // Mendapatkan nama Kasir dari salesPerson
  const getKasirName = (salesPerson) => {
    if (!accountsData?.data) return salesPerson || "-";
    const account = accountsData.data.find(
      (item) => item.email === salesPerson || item.name === salesPerson,
    );
    return account ? account.name : salesPerson || "-";
  };

  const getOutletLabel = (kodeInvoice) => {
    const kode = kodeInvoice?.slice(0, 2);
    const outletItem = outletData?.data?.find((o) => o.kodeOutlet === kode);
    return outletItem
      ? `${outletItem.kodeOutlet} - ${outletItem.namaOutlet}`
      : kode || "";
  };

  const getAccountNameById = (userId) => {
    if (!userId || !accountsData?.data) return userId || "";
    const account = accountsData.data.find((item) => item._id === userId);
    return account?.name || userId;
  };

  const getStatusExport = (invoice) => {
    if (invoice.isVoid) return "Dibatalkan";
    if (invoice.requestingVoid) return "Request Void";
    if (invoice.done) return "Lunas";
    return "Belum Bayar";
  };

  // Set default outlet berdasarkan user yang login
  useEffect(() => {
    if (myOutlet?.data?.kodeOutlet) {
      setOutlet(myOutlet.data.kodeOutlet);
    }
  }, [myOutlet]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, sortBy, outlet, spg, kasir, limit, search, dateRange]);

  const selectedOutletMeta = outletData?.data?.find(
    (o) => o.kodeOutlet === outlet,
  );
  const isStatelessView = selectedOutletMeta?.mode === "stateless";

  /** return_value SalesOrderAutoPostingShip — disimpan di invoice.navShipReturnValue */
  const formatNavShipReturn = (invoice) => {
    if (invoice?.navShipReturnValue) return invoice.navShipReturnValue;
    const parts = [invoice?.navSalesOrderNo, invoice?.navShipmentNo].filter(
      Boolean,
    );
    return parts.length ? parts.join(";") : "";
  };

  const formatNavInvoiceReturn = (invoice) => {
    if (invoice?.navSalesInvoiceNo) return invoice.navSalesInvoiceNo;
    if (invoice?.navInvoiceReturnValue) {
      return String(invoice.navInvoiceReturnValue).split(";")[0].trim();
    }
    return "";
  };

  const tableColSpan = isStatelessView ? 16 : 14;

  const exportToCSV = () => {
    if (!invoiceData?.data) return;

    const labelMetodeBayar = (nilai) => {
      if (!nilai) return "";
      const pm = paymentMethodList?.find(
        (p) => p._id === nilai || p.method === nilai,
      );
      return pm?.method || nilai;
    };

    const headers = [
      "Kode Invoice",
      "EXT CODE",
      "Outlet",
      "Nomor Transaksi",
      "Cust/Pelanggan",
      "Tanggal Sync",
      "Tanggal Bill",
      "Tanggal Void",
      "Diperbarui",
      "Kasir",
      "Email Kasir",
      "SPG",
      "Metode Pembayaran",
      "Subtotal",
      "Total Nett",
      "Status",
      "Request Void",
      "Konfirmasi Void Oleh",
      "Billing",
      "Bayar",
      "Kwitansi",
      "Voucher Terpakai",
      ...(isStatelessView
        ? [
            "NAV Ship Return",
            "NAV Sales Order",
            "NAV Shipment",
            "NAV Document No",
            "NAV Invoice",
            "Warehouse Ready",
          ]
        : []),
      "Tipe Baris",
      "SKU",
      "Nama Barang",
      "Catatan",
      "Harga Dasar",
      "Qty",
      "Total SKU",
      "Judul Diskon",
      "Diskon Rp",
      "Diskon %",
      "Judul Promo",
      "Voucher Hadiah",
    ];

    const voucherTerpakai = (invoice) =>
      invoice.implementedVoucher
        ?.map((v) => v?.judulVoucher || v?._id || "")
        .filter(Boolean)
        .join("; ") || "";

    const baseInfo = (invoice) => [
      invoice.kodeInvoice,
      invoice._id,
      getOutletLabel(invoice.kodeInvoice),
      invoice.nomorTransaksi || "",
      invoice.customer || "",
      formatDate(invoice.createdAt),
      invoice.tanggalBayar ? formatDate(invoice.tanggalBayar) : "",
      invoice.tanggalVoid ? formatDate(invoice.tanggalVoid) : "",
      invoice.updatedAt ? formatDate(invoice.updatedAt) : "",
      getKasirName(invoice.salesPerson),
      invoice.salesPerson || "",
      getSpgNameById(invoice.spg),
      labelMetodeBayar(invoice.paymentMethod),
      csvAngka(invoice.subTotal) || "-",
      csvAngka(invoice.total) || "-",
      getStatusExport(invoice),
      invoice.requestingVoid ? "Ya" : "Tidak",
      invoice.confirmVoidById
        ? getAccountNameById(invoice.confirmVoidById)
        : "",
      invoice.isPrintedCustomerBilling ? "Sudah" : "Belum",
      invoice.done ? "Lunas" : "Belum",
      invoice.isPrintedKwitansi ? "Sudah" : "Belum",
      voucherTerpakai(invoice),
      ...(isStatelessView
        ? [
            formatNavShipReturn(invoice),
            invoice.navSalesOrderNo || "",
            invoice.navShipmentNo || "",
            invoice.navDocumentNo || "",
            formatNavInvoiceReturn(invoice),
            invoice.warehouseReady ? "Ya" : "Tidak",
          ]
        : []),
    ];

    const itemCols = ({
      tipe,
      sku,
      nama,
      catatan,
      harga,
      qty,
      total,
      judulDiskon,
      diskonRp,
      diskonPct,
      judulPromo,
      voucherHadiah,
    }) => [
      tipe,
      sku || "",
      nama || "",
      catatan || "",
      csvAngka(harga),
      qty ?? "",
      csvAngka(total),
      judulDiskon || "",
      csvAngka(diskonRp),
      diskonPct != null && diskonPct !== "" ? String(diskonPct) : "",
      judulPromo || "",
      voucherHadiah || "",
    ];

    const rows = [];
    invoiceData.data.forEach((invoice) => {
      const info = baseInfo(invoice);
      let adaBaris = false;

      invoice.currentBill?.forEach((item) => {
        adaBaris = true;
        const diskEntry = invoice.diskon?.find((d) => d.sku === item.sku);
        const voucherEntry = invoice.futureVoucher?.find(
          (v) => v.sku === item.sku,
        );
        rows.push([
          ...info,
          ...itemCols({
            tipe: "Barang",
            sku: item.sku,
            nama: item.description,
            catatan: item.catatan,
            harga: item.RpHargaDasar,
            qty: item.quantity,
            total: item.totalRp,
            judulDiskon: diskEntry?.diskonInfo?.judulDiskon,
            diskonRp: diskEntry?.diskonInfo?.RpPotonganHarga,
            diskonPct: diskEntry?.diskonInfo?.percentPotonganHarga,
            voucherHadiah: voucherEntry?.voucherInfo?.judulVoucher,
          }),
        ]);
      });

      invoice.promo?.forEach((p) => {
        adaBaris = true;
        rows.push([
          ...info,
          ...itemCols({
            tipe: "Bonus Promo",
            sku: p.promoInfo?.skuBarangBonus,
            nama: p.description,
            harga: "",
            qty: p.promoInfo?.quantityBonus || 0,
            total: 0,
            judulPromo: p.promoInfo?.judulPromo,
          }),
        ]);
      });

      if (!adaBaris) {
        rows.push([...info, ...itemCols({ tipe: "-" })]);
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `invoices_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = [
    dateRange.startDate,
    dateRange.endDate,
    spg,
    kasir,
  ].filter(Boolean).length;

  const getInvoiceStatusLabel = (invoice) => {
    if (invoice.isVoid) return "Dibatalkan";
    if (invoice.done) return "Selesai";
    return "Tertunda";
  };

  const getInvoiceStatusClass = (invoice) => {
    if (invoice?.isVoid) return "bg-red-100 text-red-700 border-red-200";
    if (invoice.done) return "bg-green-100 text-green-700 border-green-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const getInvoiceShortDate = (invoice) => {
    if (invoice?.tanggalBayar) {
      return new Date(invoice.tanggalBayar).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return new Date(invoice.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderInvoiceActions = (invoice) => (
    <div className="flex justify-center gap-2">
      <button
        className="p-2 hover:bg-blue-100 rounded-lg transition-colors tooltip"
        data-tip="Detail"
        onClick={() => {
          document.getElementById("modalDetailInvoice").showModal();
          setShowDetail(invoice);
        }}
      >
        <Eye className="w-4 h-4 text-blue-600" />
      </button>
      {!invoice.isVoid && invoice?.done && invoice.requestingVoid && (
        <button
          className="p-2 hover:bg-red-100 rounded-lg transition-colors tooltip"
          data-tip="Void"
          onClick={() => {
            setSelectedInvoice(invoice._id);
            document.getElementById("void").checked = true;
          }}
        >
          <Ban className="w-4 h-4 text-red-600" />
        </button>
      )}
    </div>
  );

  const renderInvoiceExpandedDetail = (invoice, { showMeta = false } = {}) => (
    <>
      {isStatelessView && (
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-950 to-indigo-600 px-4 py-2">
            <h3 className="text-sm font-semibold text-white">
              NAV SalesOrderAutoPostingShip / Bayar
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Ship return_value</p>
              <p className="font-mono text-gray-900 break-all">
                {formatNavShipReturn(invoice) || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Document No</p>
              <p className="font-mono text-gray-900">
                {invoice.navDocumentNo || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sales Order</p>
              <p className="font-mono text-gray-900">
                {invoice.navSalesOrderNo || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sales Shipment</p>
              <p className="font-mono text-gray-900">
                {invoice.navShipmentNo || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Invoice (WsPostInvoiceSO)</p>
              <p className="font-mono text-gray-900">
                {formatNavInvoiceReturn(invoice) || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Warehouse ready</p>
              <p className="font-medium text-gray-900">
                {invoice.warehouseReady ? "Ya" : "Tidak"}
              </p>
            </div>
          </div>
        </div>
      )}
      {showMeta && (
        <div className="mb-4 md:space-y-2 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
            <span>
              Kasir:{" "}
              <span className="font-medium text-gray-800">
                {getKasirName(invoice.salesPerson)}
              </span>
            </span>
            <span>
              SPG:{" "}
              <span className="font-medium text-gray-800">
                {getSpgNameById(invoice?.spg) || "-"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.isPrintedCustomerBilling && (
              <span className="badge badge-success badge-sm gap-1 text-white">
                <Printer className="w-3 h-3" />
                Billing
              </span>
            )}
            {invoice.done && (
              <span className="badge badge-success badge-sm gap-1 text-white">
                <CheckCircle className="w-3 h-3" />
                Lunas
              </span>
            )}
            {invoice.isPrintedKwitansi && (
              <span className="badge badge-success badge-sm gap-1 text-white">
                <Printer className="w-3 h-3" />
                Kwitansi
              </span>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-950 to-blue-600 px-4 py-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Item Pembelian
            </h3>
          </div>
          <div className="p-4 max-h-[300px] overflow-y-auto">
            {invoice.currentBill?.length > 0 ? (
              <div className="space-y-2">
                {invoice.currentBill.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        Rp {item.RpHargaDasar?.toLocaleString("id-ID")} x{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-blue-600 text-sm">
                      Rp {item.totalRp?.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4 text-sm">
                Tidak ada item
              </p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {invoice?.diskon?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Diskon
                </h3>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                {invoice.diskon.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-orange-50 rounded-lg mb-2"
                  >
                    <span className="text-sm">
                      {item.diskonInfo?.judulDiskon}
                    </span>
                    <span className="badge badge-sm bg-orange-100 text-orange-700">
                      {item.diskonInfo?.RpPotonganHarga
                        ? `Rp ${item.diskonInfo.RpPotonganHarga.toLocaleString("id-ID")}`
                        : `${item.diskonInfo?.percentPotonganHarga}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {invoice?.promo?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Promo
                </h3>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                {invoice.promo.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-purple-50 rounded-lg mb-2"
                  >
                    <span className="text-sm">
                      {item.promoInfo?.judulPromo}
                    </span>
                    <span className="badge badge-sm bg-purple-100 text-purple-700">
                      +{item.promoInfo?.quantityBonus}{" "}
                      {item.promoInfo?.skuBarangBonus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderPagination = () => {
    if (!invoiceData?.pagination) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          Menampilkan{" "}
          <span className="font-semibold text-blue-600">
            {invoiceData.data.length}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-blue-600">
            {invoiceData.pagination.total}
          </span>{" "}
          data
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="md:hidden text-sm text-gray-600 px-2">
            Halaman {currentPage} / {invoiceData.pagination.totalPages}
          </span>
          <div className="hidden md:flex gap-2">
            {Array.from(
              { length: Math.min(5, invoiceData.pagination.totalPages) },
              (_, i) => {
                let pageNum;
                if (invoiceData.pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (
                  currentPage >=
                  invoiceData.pagination.totalPages - 2
                ) {
                  pageNum = invoiceData.pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                        : "border border-gray-200 hover:bg-blue-50 text-gray-700"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              },
            )}
          </div>
          <button
            className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, invoiceData.pagination.totalPages),
              )
            }
            disabled={currentPage >= invoiceData.pagination.totalPages}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  const renderFilterFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-blue-950" />
            Tanggal Mulai
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-blue-950" />
            Tanggal Akhir
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Building2 className="w-4 h-4 text-blue-950" />
            Outlet
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
              value={outlet}
              onChange={(e) => setOutlet(e.target.value)}
            >
              {outletData?.data?.map((outletItem) => (
                <option
                  key={outletItem?.kodeOutlet}
                  value={outletItem.kodeOutlet}
                  className={
                    outletItem.kodeOutlet === myOutlet?.data?.kodeOutlet
                      ? "font-bold bg-blue-50"
                      : ""
                  }
                >
                  {outletItem.namaOutlet} | {outletItem.kodeOutlet}
                  {outletItem.kodeOutlet === myOutlet?.data?.kodeOutlet
                    ? " (Outlet Saya)"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Filter className="w-4 h-4 text-blue-950" />
            Jumlah Data
          </label>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            {[50, 100, 200, 400, 800, "All"].map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Users className="w-4 h-4 text-blue-950" />
            SPG
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
              value={spg}
              onChange={(e) => setSpg(e.target.value)}
            >
              <option value="">Semua SPG</option>
              {spgData?.data?.map((spgItem) => (
                <option key={spgItem._id} value={spgItem._id}>
                  {spgItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <UserCircle className="w-4 h-4 text-blue-950" />
            Kasir
          </label>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
              value={kasir?.username}
              onChange={(e) => setKasir(e.target.value)}
            >
              <option value="">Semua Kasir</option>
              {accountsData?.data?.map((account) => (
                <option key={account.username} value={account.username}>
                  {account.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <button
        onClick={exportToCSV}
        disabled={!invoiceData?.data?.length}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-950/25"
      >
        <Download className="w-5 h-5" />
        Export ke CSV
      </button>
    </>
  );

  const statusTabActiveClass = {
    all: "bg-blue-950 text-white shadow-lg shadow-blue-950/25",
    complete: "bg-green-500 text-white shadow-lg shadow-green-500/25",
    void: "bg-red-500 text-white shadow-lg shadow-red-500/25",
    pending: "bg-yellow-500 text-white shadow-lg shadow-yellow-500/25",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header Section dengan Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl mb-4 md:mb-8 p-4 md:p-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <CreditCard className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold">
                  Manajemen Transaksi
                </h1>
                <p className="text-blue-100 mt-1 text-sm md:text-base max-md:hidden">
                  Pantau dan kelola seluruh transaksi dengan detail penjualan
                  lengkap
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full md:w-auto">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
                <div className="pl-3">
                  <Search className="w-5 h-5 text-white/70" />
                </div>
                <input
                  type="text"
                  placeholder="Cari invoice..."
                  className="bg-transparent border-0 text-white placeholder-white/70 focus:outline-none px-3 py-2.5 w-full md:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2.5 text-white font-medium">
                  Cari
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 mb-4 md:mb-8 overflow-hidden">
          <div className="hidden md:block bg-gradient-to-r from-blue-950 to-blue-600 px-6 py-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Transaksi
            </h2>
          </div>

          <button
            type="button"
            className="md:hidden w-full flex items-center justify-between gap-2 bg-gradient-to-r from-blue-950 to-blue-600 px-4 py-3 text-white"
            onClick={() => setMobileFilterOpen((prev) => !prev)}
          >
            <span className="font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter & Export
              {activeFilterCount > 0 && (
                <span className="badge badge-sm bg-white/20 border-0">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {mobileFilterOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <div
            className={`p-4 md:p-6 ${mobileFilterOpen ? "block" : "hidden"} md:block`}
          >
            {renderFilterFields()}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 mb-4 md:mb-8 p-3 md:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "Semua", icon: Filter },
              { key: "complete", label: "Selesai", icon: CheckCircle },
              { key: "void", label: "Dibatalkan", icon: XCircle },
              { key: "pending", label: "Tertunda", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatus(tab.key)}
                  className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-xl font-medium transition-all duration-200 shrink-0 ${
                    status === tab.key
                      ? statusTabActiveClass[tab.key]
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="max-md:hidden">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="mt-4 text-blue-600 font-medium animate-pulse">
                Memuat data transaksi...
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Gagal Memuat Data
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {error?.message ||
                  "Terjadi kesalahan saat memuat data. Silakan coba lagi."}
              </p>
            </div>
          ) : invoiceData?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Tidak Ada Data Transaksi
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                Tidak ditemukan transaksi dengan filter yang dipilih.
              </p>
            </div>
          ) : (
            <>
              {/* Tampilan kartu — mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {invoiceData?.data?.map((invoice) => (
                  <div key={invoice._id} className="p-4">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="btn btn-circle btn-xs btn-ghost text-blue-600 hover:bg-blue-100 shrink-0 mt-0.5"
                        onClick={() => toggleExpandRow(invoice._id)}
                      >
                        {expandedRows[invoice._id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-blue-900 truncate">
                              {invoice.kodeInvoice}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {getInvoiceShortDate(invoice)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-blue-600 text-sm">
                              Rp {invoice.total?.toLocaleString("id-ID") || 0}
                            </p>
                            <span
                              className={`badge rounded-full px-2 py-1 font-medium text-xs mt-1 ${getInvoiceStatusClass(invoice)}`}
                            >
                              {getInvoiceStatusLabel(invoice)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end mt-2">
                          {renderInvoiceActions(invoice)}
                        </div>
                        {isStatelessView && (
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="text-gray-500">
                              NAV Ship:{" "}
                              <span className="font-mono text-gray-800 break-all">
                                {formatNavShipReturn(invoice) || "-"}
                              </span>
                            </p>
                            <p className="text-gray-500">
                              NAV Invoice:{" "}
                              <span className="font-mono text-gray-800">
                                {formatNavInvoiceReturn(invoice) || "-"}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {expandedRows[invoice._id] && (
                      <div className="mt-4 pl-8 bg-blue-50/30 rounded-xl p-4">
                        {renderInvoiceExpandedDetail(invoice, {
                          showMeta: true,
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tabel — desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50">
                    <tr>
                      <th className="w-12 px-4 py-3"></th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider cursor-pointer hover:bg-blue-200/50"
                        onClick={() => setsortBy("invoice")}
                      >
                        <div className="flex items-center gap-1">
                          Kode Invoice
                          {sortBy === "invoice" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Ext Doc
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider cursor-pointer hover:bg-blue-200/50"
                        onClick={() => setsortBy("time")}
                      >
                        <div className="flex items-center gap-1">
                          Tanggal Sync
                          {sortBy === "time" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Tanggal Bill
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Kasir
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        SPG
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Harga Asli
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-semibold text-blue-800 uppercase tracking-wider cursor-pointer hover:bg-blue-200/50"
                        onClick={() => setsortBy("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {sortBy === "total" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Billing
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Bayar
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Kwitansi
                      </th>
                      {isStatelessView && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider min-w-[12rem]">
                            NAV Ship Return
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            NAV Invoice
                          </th>
                        </>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 ">
                    {invoiceData?.data?.map((invoice) => (
                      <Fragment key={invoice._id}>
                        <tr className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              className="btn btn-circle btn-xs btn-ghost text-blue-600 hover:bg-blue-100"
                              onClick={() => toggleExpandRow(invoice._id)}
                            >
                              {expandedRows[invoice._id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-blue-900">
                                {invoice.kodeInvoice}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {invoice._id.slice(-6)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(invoice.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {invoice?.tanggalBayar
                              ? new Date(
                                  invoice.tanggalBayar,
                                ).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-sm">
                              {getKasirName(invoice.salesPerson)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {getSpgNameById(invoice?.spg) || "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className="text-green-600 font-semibold">
                              Rp{" "}
                              {invoice.subTotal?.toLocaleString("id-ID") || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className="text-blue-600 font-semibold">
                              Rp {invoice.total?.toLocaleString("id-ID") || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {invoice.isPrintedCustomerBilling ? (
                              <div
                                className="tooltip"
                                data-tip="Sudah Cetak Billing"
                              >
                                <div className="badge badge-success badge-sm gap-1 text-white">
                                  <Printer className="w-3 h-3" />
                                  Cetak
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {invoice.done ? (
                              <div className="tooltip" data-tip="Sudah Bayar">
                                <div className="badge badge-success badge-sm gap-1 text-white">
                                  <CheckCircle className="w-3 h-3" />
                                  Lunas
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {invoice.isPrintedKwitansi ? (
                              <div
                                className="tooltip"
                                data-tip="Sudah Cetak Kwitansi"
                              >
                                <div className="badge badge-success badge-sm gap-1 text-white">
                                  <Printer className="w-3 h-3" />
                                  Cetak
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          {isStatelessView && (
                            <>
                              <td className="px-4 py-3">
                                {formatNavShipReturn(invoice) ? (
                                  <div className="space-y-0.5">
                                    <p
                                      className="text-xs font-mono text-blue-900 break-all"
                                      title={formatNavShipReturn(invoice)}
                                    >
                                      {formatNavShipReturn(invoice)}
                                    </p>
                                    {invoice.warehouseReady && (
                                      <span className="badge badge-outline badge-xs text-emerald-700 border-emerald-300">
                                        warehouse ready
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {formatNavInvoiceReturn(invoice) ? (
                                  <span className="text-xs font-mono text-gray-800">
                                    {formatNavInvoiceReturn(invoice)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`badge rounded-full px-3 py-2 font-medium text-xs ${getInvoiceStatusClass(invoice)}`}
                            >
                              {getInvoiceStatusLabel(invoice)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {renderInvoiceActions(invoice)}
                          </td>
                        </tr>

                        {/* Expanded Detail */}
                        {expandedRows[invoice._id] && (
                          <tr>
                            <td
                              colSpan={tableColSpan}
                              className="bg-blue-50/30 p-6"
                            >
                              {renderInvoiceExpandedDetail(invoice)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ModalVoid
        setSelectedInvoice={setSelectedInvoice}
        handleVoidInvoice={handleVoidInvoice}
        selectedInvoice={selectedInvoice}
      />
      <ModalDetailInvoice showDetail={showDetail} />
    </div>
  );
};

export default Invoices;
