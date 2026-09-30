import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  Store,
  CreditCard,
  SignalHigh,
  User2,
  Search,
  Package,
  Clock,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  Banknote,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

// APIs
import { getAllPaymentMethod } from "@/api/paymentMethodApi";
import {
  getSalesReportData,
  getRankingSpgKasir,
  getPaymentMethodRanking,
  endOfDayBySku,
} from "@/api/dashboardApi";
import { getOuletByUserId, getOuletList } from "@/api/outletApi";
import { getInvoicesByPaymentMethod, getInvoiceStats } from "@/api/invoiceApi";
import { getAllSpg } from "@/api/spgApi";
import {
  getInventoryStats,
  searchInventoryByStockCategory,
} from "@/api/inventoryStatApi";
import { getPurchaseOrderList } from "@/api/purchaseOrderApi";
import { useUserInfo } from "@/store";
import ModalDetailInvoicesByPaymentMethod from "@/components/ModalDetailInvoicesByPaymentMethod";
import { parseRpHargaDasar } from "@/utils/parseRpHargaDasar";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// angka mentah untuk CSV
const csvAngka = (nilai) => {
  const n = parseRpHargaDasar(nilai);
  return n != null ? String(n) : "";
};

const formatCsvDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const ringkasList = (arr, getLabel) =>
  arr?.map(getLabel).filter(Boolean).join(" | ") || "";

const SalesReport = () => {
  // ============= FILTER STATE =============
  const today = new Date().toISOString().split("T")[0];
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 6))
      .toISOString()
      .split("T")[0],
    endDate: today,
  });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("success");

  const [countMethod, setCountMethod] = useState("settlement");

  // ============= QUERIES REQUIRED VARIABLES =============
  const { userInfo } = useUserInfo();

  const { data: myOutlet } = useQuery({
    queryKey: ["myOutlet", userInfo?._id],
    queryFn: () => getOuletByUserId(userInfo?._id),
    enabled: !!userInfo?._id,
  });

  const [selectedOutlet, setSelectedOutlet] = useState();
  const [
    paymentMethodToGetDetailInvoices,
    setPaymentMethodToGetDetailInvoices,
  ] = useState();

  const { data: outletList } = useQuery({
    queryKey: ["outlet"],
    queryFn: getOuletList,
    enabled: !!myOutlet,
  });

  //field tidak ikut filter
  const [activeTemplate, setActiveTemplate] = useState("7days");
  const selectedOutletObj = useMemo(
    () => outletList?.data?.find((item) => item.kodeOutlet === selectedOutlet),
    [outletList, selectedOutlet],
  );

  const { data: paymentMethodList } = useQuery({
    queryKey: ["paymentMethod"],
    queryFn: getAllPaymentMethod,
    enabled: !!selectedOutlet,
  });

  const { data: spgList } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  const { data: rankingData } = useQuery({
    queryKey: ["rankingSpgKasir", dateRange, selectedOutlet],
    queryFn: () =>
      getRankingSpgKasir({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        transactionStatus,
      }),
    enabled: !!selectedOutlet,
  });

  // ============= QUERIES LAPORAN PENJUALAN =============
  const { data: salesData } = useQuery({
    queryKey: [
      "salesReport",
      dateRange,
      selectedOutlet,
      paymentMethod,
      transactionStatus,
      countMethod,
    ],
    queryFn: () =>
      getSalesReportData({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        outlet: selectedOutlet,
        paymentMethod,
        transactionStatus,
        countMethod,
      }),
    enabled: !!selectedOutlet && !!paymentMethod,
  });

  async function handleDownloadRangkingPaymentMethodDetail() {
    const rankList = paymentMethodRanking?.data?.paymentMethodRank;
    if (!rankList?.length) {
      toast.error("Data ranking metode bayar belum tersedia");
      return;
    }

    const loadingToastId = toast.loading("Mengambil data invoice...");

    try {
      const responses = await Promise.all(
        rankList.map((item) =>
          getInvoicesByPaymentMethod({
            paymentMethod: item._id,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            transactionStatus,
            outlet: selectedOutlet,
          }),
        ),
      );

      const allInvoices = responses.flatMap((response) => response.data || []);
      if (allInvoices.length === 0) {
        toast.error("Tidak ada detail invoice untuk didownload");
        return;
      }

      const labelMetodeBayar = (nilai) => {
        if (!nilai) return "";
        const pm = paymentMethodList?.find(
          (p) => p._id === nilai || p.method === nilai,
        );
        return pm?.method || nilai;
      };

      const finalHeaders_const = [
        "kodeInvoice",
        "tanggalBayar",
        "salesPerson",
        "spg",
        "sku",
        "description",
        "quantity",
        "RpHargaDasar",
        "totalRp",
        "diskon",
        "promo",
        "futurVoucher",
        "total",
        "paymentMethod",
        "nomorTransaksi",
        "catatan",
      ];

      const headerLabelMap = {
        kodeInvoice: "kodeInvoice",
        tanggalBayar: "Tanggal Transaksi",
        salesPerson: "salesPerson",
        spg: "spg",
        sku: "sku",
        description: "description",
        quantity: "quantity",
        RpHargaDasar: "harga/pcs",
        totalRp: "Harga total Qty",
        diskon: "diskon",
        promo: "promo",
        futurVoucher: "futureVoucher",
        total: "amount",
        paymentMethod: "Metode Pembayaran",
        nomorTransaksi: "Nomor Transaksi",
        catatan: "catatan",
      };

      const csvOutputRows = [];
      csvOutputRows.push(
        finalHeaders_const.map((h) => `"${headerLabelMap[h] || h}"`).join(";"),
      );

      const escapeCell = (val) => {
        const valueString =
          val === null || val === undefined ? "" : String(val);
        return `"${valueString.replace(/"/g, '""')}"`;
      };

      allInvoices.forEach((invoice) => {
        const billItems = invoice.currentBill || [];
        const rowCount = Math.max(1, billItems.length);
        const spgObj = spgList?.data?.find((s) => s._id === invoice.spg);

        for (let i = 0; i < rowCount; i++) {
          const item = billItems[i];
          const row = new Array(finalHeaders_const.length).fill("");

          finalHeaders_const.forEach((header, idx) => {
            if (header === "kodeInvoice") {
              row[idx] = i === 0 ? invoice.kodeInvoice || "" : "";
            } else if (header === "tanggalBayar") {
              row[idx] = i === 0 ? formatCsvDate(invoice.tanggalBayar) : "";
            } else if (header === "salesPerson") {
              row[idx] = i === 0 ? invoice.salesPerson || "" : "";
            } else if (header === "spg") {
              row[idx] = i === 0 ? spgObj?.name || invoice.spg || "" : "";
            } else if (header === "sku") {
              row[idx] = item?.sku || "";
            } else if (header === "description") {
              row[idx] = item?.description || "";
            } else if (header === "quantity") {
              row[idx] = item?.quantity ?? "";
            } else if (header === "RpHargaDasar") {
              row[idx] = csvAngka(item?.RpHargaDasar);
            } else if (header === "totalRp") {
              row[idx] = csvAngka(item?.totalRp);
            } else if (header === "paymentMethod") {
              row[idx] = i === 0 ? labelMetodeBayar(invoice.paymentMethod) : "";
            } else if (header === "nomorTransaksi") {
              row[idx] = i === 0 ? invoice.nomorTransaksi || "" : "";
            } else if (header === "diskon") {
              row[idx] =
                i === 0
                  ? ringkasList(
                      invoice.diskon,
                      (d) => d.diskonInfo?.judulDiskon || d.sku,
                    )
                  : "";
            } else if (header === "promo") {
              row[idx] =
                i === 0
                  ? ringkasList(
                      invoice.promo,
                      (p) => p.promoInfo?.judulPromo || p.sku,
                    )
                  : "";
            } else if (header === "futurVoucher") {
              row[idx] =
                i === 0
                  ? ringkasList(
                      invoice.futureVoucher,
                      (v) => v.voucherInfo?.judulVoucher || v.sku,
                    )
                  : "";
            } else if (header === "total") {
              row[idx] = i === 0 ? csvAngka(invoice.total) : "";
            } else if (header === "catatan") {
              row[idx] = item?.catatan || "";
            }
          });

          csvOutputRows.push(row.map((val) => escapeCell(val)).join(";"));
        }
      });

      const blob = new Blob(["\uFEFF" + csvOutputRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const date = formatCsvDate(new Date());
      link.download = `Statement CSI SUPER POS - filter:: ${selectedOutletObj?.namaOutlet} : ${date} - ${dateRange.startDate}: ${dateRange.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Export berhasil");
    } catch {
      toast.error("Gagal export detail invoice");
    } finally {
      toast.dismiss(loadingToastId);
    }
  }

  useEffect(() => {
    function variableInit() {
      if (myOutlet?.data) {
        setSelectedOutlet(myOutlet?.data?.kodeOutlet);
        setPaymentMethod("all");
      }
    }
    variableInit();
  }, [myOutlet]);

  // ============= FILTER HANDLERS =============
  const timeTemplates = [
    { label: "Periode Yang Dipilih", value: "custom", icon: "📅" },
    { label: "7 Hari Terakhir", value: "7days", icon: "📆" },
    { label: "1 Bulan Terakhir", value: "1month", icon: "📆" },
    { label: "2 Bulan Terakhir", value: "2months", icon: "📆" },
    { label: "3 Bulan Terakhir", value: "3months", icon: "📆" },
    { label: "1 Tahun Terakhir", value: "1year", icon: "📆" },
  ];

  const setDateFromTemplate = (template) => {
    const end = new Date();
    let start = new Date();

    const index = outletList?.data?.findIndex(
      (item) => item.kodeOutlet === selectedOutlet,
    );
    const selectedOutletObj = outletList?.data[index];

    switch (template) {
      case "settlement":
        start = new Date(
          new Date().setDate(
            new Date().getDate() - selectedOutletObj?.periodeSettlement,
          ),
        );
        break;
      case "3days":
        start.setDate(end.getDate() - 2);
        break;
      case "7days":
        start.setDate(end.getDate() - 6);
        break;
      case "1month":
        start.setMonth(end.getMonth() - 1);
        break;
      case "2months":
        start.setMonth(end.getMonth() - 2);
        break;
      case "3months":
        start.setMonth(end.getMonth() - 3);
        break;
      default:
        break;
    }

    const newDateRange = {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };

    setDateRange(newDateRange);
    setActiveTemplate(template); // set string template aktif
  };

  const handleDateChange = (e, field) => {
    setActiveTemplate("custom");
    const newDateRange = {
      ...dateRange,
      [field]: e.target.value,
    };
    setDateRange(newDateRange);
  };

  const handleFilterChange = (e, setter) => {
    setter(e.target.value);
  };

  //rangking-payment-method
  const { data: paymentMethodRanking } = useQuery({
    queryKey: [
      "paymentMethodRanking",
      dateRange,
      selectedOutlet,
      transactionStatus,
    ],
    queryFn: () =>
      getPaymentMethodRanking({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        transactionStatus,
        outlet: selectedOutlet,
      }),
    enabled: !!selectedOutlet,
  });

  const { data: endOfDayBySkuData } = useQuery({
    queryKey: ["endOfDayBySku", dateRange, selectedOutlet, transactionStatus],
    queryFn: () =>
      endOfDayBySku({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        transactionStatus,
        outlet: selectedOutlet,
      }),
    enabled: !!selectedOutlet,
  });

  // ============= PENGOLAHAN DATA CHART =============
  const salesChartData = useMemo(() => {
    if (!salesData?.data?.length)
      return {
        labels: [],
        datasets: [
          {
            label: "Total Penjualan",
            data: [],
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      };

    return {
      labels: salesData.data.map((item) => item.date),
      datasets: [
        {
          label: "Total Penjualan",
          data: salesData.data.map((item) => item.totalSales),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [salesData]);

  // ============= EXTRA STATE FROM SUMMARY =============
  const [mainTab, setMainTab] = useState("sales"); // sales, inventory, po, invoices

  const [inventoryTab, setInventoryTab] = useState("empty");
  const [poTab, setPoTab] = useState("pending");

  const [inventorySearch, setInventorySearch] = useState("");
  const [poSearch, setPoSearch] = useState("");

  const [inventoryPage, setInventoryPage] = useState(1);
  const [poPage, setPoPage] = useState(1);

  // Purchase Order section
  const [poStatusFilter, setPOStatusFilter] = useState("pending");

  // Ambil semua PO terlepas dari status
  const { data: allPurchaseOrders } = useQuery({
    queryKey: ["allPurchaseOrders"],
    queryFn: getPurchaseOrderList,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  // Filter PO berdasarkan status untuk membedakan status selesai/belum selesai
  const filterPOByStatus = (data, selectedStatus) => {
    if (!data || !data.length) return [];

    return data.filter((po) => {
      // Hitung status berdasarkan completed/pending
      let totalRequested = 0;
      let totalReceived = 0;
      let isCompleted = true;

      if (po.items && po.items.length > 0) {
        po.items.forEach((item) => {
          const requested = Number(item.request) || 0;
          const received = Number(item.received) || 0;
          totalRequested += requested;
          totalReceived += received;

          // PO dianggap tidak selesai jika ada item dengan received tidak sama dengan request
          if (received !== requested) {
            isCompleted = false;
          }
        });
      } else {
        isCompleted = false;
      }

      return selectedStatus === "completed" ? isCompleted : !isCompleted;
    });
  };

  // Filter PO berdasarkan status yang dipilih
  const filteredPOs = useMemo(() => {
    if (allPurchaseOrders?.data) {
      return filterPOByStatus(allPurchaseOrders.data, poStatusFilter);
    }
    return [];
  }, [allPurchaseOrders, poStatusFilter]);

  //ini untuk section Stok Kosong | Stok Menipis | Stok Normal
  const { data: inventoriesByCategory } = useQuery({
    queryKey: [
      "inventoryByCategory",
      {
        category: inventoryTab,
        search: inventorySearch,
        page: inventoryPage,
        limit: 10,
      },
    ],
    queryFn: (queryKey) => searchInventoryByStockCategory(queryKey),
  });

  // Handler untuk pagination
  const handleInventoryPageChange = (newPage) => {
    setInventoryPage(newPage);
  };

  const handlePoPageChange = (newPage) => {
    setPoPage(newPage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-950/20 to-blue-950/5 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-blue-950" />
          </div>
          <div>
            <h1 className="lg:text-4xl  font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
              Dashboard & Laporan
            </h1>
            <p className="text-blue-950 lg:text-lg text-xs mt-1">
              Analisis lengkap performa bisnis Anda
            </p>
          </div>
        </div>

        {/* Tab Navigation - Enhanced */}
        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg mb-8 border border-blue-100">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "sales", label: "Analisis Penjualan", icon: TrendingUp },
              { id: "inventory", label: "Inventori & Stok", icon: Package },
              { id: "po", label: "Purchase Orders", icon: ClipboardList },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    mainTab === tab.id
                      ? "bg-blue-950 text-white shadow-lg shadow-blue-950/25 scale-105"
                      : "text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="max-md:hidden">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {mainTab === "sales" && (
          <div className="space-y-8">
            {/* Filter Section - Enhanced */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Filter className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    Filter Laporan
                  </h2>
                </div>
              </div>
              <div className="p-4 md:p-6 space-y-6">
                {/* Time Templates */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {timeTemplates?.map((template) => (
                    <button
                      key={template.value}
                      onClick={() => setDateFromTemplate(template.value)}
                      className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 text-sm md:text-base ${
                        activeTemplate === template.value
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100"
                      }`}
                    >
                      <span className="text-base md:text-lg">
                        {template.icon}
                      </span>
                      <span className="truncate">{template.label}</span>
                    </button>
                  ))}
                </div>
                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Calendar className="w-4 h-4 text-primary" />
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => handleDateChange(e, "startDate")}
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Calendar className="w-4 h-4 text-primary" />
                      Tanggal Akhir
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => handleDateChange(e, "endDate")}
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Metode Pembayaran
                    </label>
                    <select
                      value={paymentMethod || "all"}
                      onChange={(e) => handleFilterChange(e, setPaymentMethod)}
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-white"
                    >
                      <option value="all">Semua Metode</option>
                      {paymentMethodList?.map((pm) => (
                        <option key={pm?.method} value={pm?.method}>
                          {pm?.method}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Outlet */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Store className="w-4 h-4 text-primary" />
                      Outlet
                    </label>
                    <select
                      value={selectedOutlet}
                      onChange={(e) => handleFilterChange(e, setSelectedOutlet)}
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-white"
                    >
                      <option value="all">Gabungkan Semua Outlet</option>
                      {outletList?.data?.map((outlet) => (
                        <option
                          key={outlet?.kodeOutlet}
                          value={outlet?.kodeOutlet}
                        >
                          {outlet?.namaOutlet} - {outlet?.kodeOutlet}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Status */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <SignalHigh className="w-4 h-4 text-primary" />
                      Status Transaksi
                    </label>
                    <select
                      value={transactionStatus}
                      onChange={(e) =>
                        handleFilterChange(e, setTransactionStatus)
                      }
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-white"
                    >
                      <option value="all">Semua Status</option>
                      <option value="success" className="text-green-600">
                        Sukses
                      </option>
                      <option value="void" className="text-red-600">
                        Dibatalkan
                      </option>
                      <option value="pending" className="text-yellow-600">
                        Belum Dibayar
                      </option>
                    </select>
                  </div>

                  {/* Calculation Method */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Filter className="w-4 h-4 text-primary" />
                      Metode Perhitungan
                    </label>
                    <select
                      value={countMethod}
                      onChange={(e) => handleFilterChange(e, setCountMethod)}
                      className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-white"
                    >
                      <option value="settlement">
                        Default: settlement outlet
                      </option>
                      <option value="perhari">Perhari</option>
                      <option value="perminggu">Perminggu</option>
                      <option value="perbulan">Perbulan</option>
                      <option value="pertahun">Pertahun</option>
                    </select>
                  </div>

                  {/* Reset Button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Filter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Banknote className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-blue-400">Total Penjualan</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(salesData?.summary?.totalSales || 0)}
                </p>
                <p className="text-sm text-blue-950 mt-2">
                  {salesData?.summary?.totalTransactions || 0} transaksi
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm text-blue-400">Total Transaksi</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {salesData?.summary?.totalTransactions || 0}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-blue-400">
                    Rata-rata per Transaksi
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(
                    (salesData?.summary?.totalSales || 0) /
                      (salesData?.summary?.totalTransactions || 1),
                  )}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-sm text-blue-400">
                    Total Item Terjual
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {salesData?.summary?.totalItems || 0}
                </p>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="p-6 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Penjualan{" "}
                    {countMethod === "settlement"
                      ? `(Settlement ${selectedOutletObj?.periodeSettlement || 1} hari)`
                      : countMethod === "perhari"
                        ? "Harian"
                        : countMethod === "perminggu"
                          ? "Mingguan"
                          : countMethod === "perbulan"
                            ? "Bulanan"
                            : "Tahunan"}
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {salesChartData ? (
                  <div
                    className="relative"
                    style={{ height: "400px", width: "100%" }}
                  >
                    <Bar
                      data={salesChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                            labels: {
                              boxWidth: 12,
                              padding: 15,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ height: "400px" }}
                  >
                    <div className="text-gray-400">
                      Tidak ada data untuk ditampilkan
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Analysis */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Analisis Metode Pembayaran
                </h2>
                <span className="text-sm text-blue-400">
                  Klik 2 kali untuk detail
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <table className="w-full">
                      <thead className="bg-blue-50 rounded-xl">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                            Metode
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                            Total
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                            Items
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {paymentMethodRanking?.data?.paymentMethodRank?.map(
                          (pm, idx) => (
                            <tr
                              key={pm._id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setPaymentMethodToGetDetailInvoices(pm._id);
                                document
                                  .getElementById(
                                    "ModalDetailInvoicesByPaymentMethod",
                                  )
                                  .showModal();
                              }}
                            >
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                                            ${
                                                              idx === 0
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : idx === 1
                                                                  ? "bg-blue-100 text-blue-700"
                                                                  : idx === 2
                                                                    ? "bg-orange-100 text-orange-700"
                                                                    : "bg-blue-50 text-blue-600"
                                                            }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {pm._id}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {formatCurrency(pm.totalSales)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {pm.jumlahInvoice}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {pm.totalItems}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:col-span-1">
                    {paymentMethodRanking?.data?.paymentMethodRank?.length >
                    0 ? (
                      <Pie
                        data={{
                          labels:
                            paymentMethodRanking.data.paymentMethodRank.map(
                              (pm) => pm._id,
                            ),
                          datasets: [
                            {
                              data: paymentMethodRanking.data.paymentMethodRank.map(
                                (pm) => pm.totalSales,
                              ),
                              backgroundColor: [
                                "#3B82F6",
                                "#10B981",
                                "#F59E0B",
                                "#EF4444",
                                "#8B5CF6",
                              ],
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "bottom" } },
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-blue-400">
                        Tidak ada data
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleDownloadRangkingPaymentMethodDetail}
                    className="btn btn-outline btn-primary gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
            </div>

            {/* SKU Analysis */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  End of Day by SKU
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 rounded-xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Total Penjualan
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {endOfDayBySkuData?.data?.skuRank?.map((sku, idx) => (
                        <tr
                          key={sku._id}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium">{sku._id}</td>
                          <td className="px-4 py-3 text-right">
                            {sku.totalQuantity}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(sku.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sku.jumlahInvoice}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cashier Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                <div className="p-6 border-b border-blue-100">
                  <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    Distribusi Kasir
                  </h2>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          Kasir
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {rankingData?.data?.kasirRank?.map((kasir, idx) => (
                        <tr key={kasir._id} className="hover:bg-blue-50">
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">
                                {kasir.kasir.username}
                              </p>
                              <p className="text-xs text-blue-950">
                                {kasir.kasir.roleName}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(kasir.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {kasir.jumlahInvoice}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1">
                              {kasir.percentage?.toFixed(2)}%
                              <div
                                className={`w-16 h-1.5 rounded-full bg-blue-200 overflow-hidden`}
                              >
                                <div
                                  className={`h-full rounded-full ${
                                    idx === 0
                                      ? "bg-green-500"
                                      : idx === 1
                                        ? "bg-blue-950"
                                        : "bg-orange-500"
                                  }`}
                                  style={{ width: `${kasir.percentage}%` }}
                                ></div>
                              </div>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden p-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-4">
                  Distribusi Grafik
                </h2>
                {rankingData?.data?.kasirRank?.length > 0 ? (
                  <Pie
                    data={{
                      labels: rankingData.data.kasirRank.map(
                        (k) => k.kasir.username,
                      ),
                      datasets: [
                        {
                          data: rankingData.data.kasirRank.map(
                            (k) => k.totalSales,
                          ),
                          backgroundColor: [
                            "#3B82F6",
                            "#10B981",
                            "#F59E0B",
                            "#EF4444",
                            "#8B5CF6",
                            "#EC4899",
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-blue-400">
                    Tidak ada data
                  </div>
                )}
              </div>
            </div>

            {/* SPG Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                <div className="p-6 border-b border-blue-100">
                  <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-3">
                    <User2 className="w-5 h-5 text-primary" />
                    Distribusi SPG
                  </h2>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                          SPG
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-950">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {rankingData?.data?.spgRank?.map((spg, idx) => (
                        <tr key={spg._id} className="hover:bg-blue-50">
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{spg.spg.name}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(spg.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {spg.jumlahInvoice}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1">
                              {spg.percentage?.toFixed(2)}%
                              <div className="w-16 h-1.5 rounded-full bg-blue-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${spg.percentage}%` }}
                                ></div>
                              </div>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden p-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-4">
                  Distribusi Grafik
                </h2>
                {rankingData?.data?.spgRank?.length > 0 ? (
                  <Pie
                    data={{
                      labels: rankingData.data.spgRank.map((s) => s.spg.name),
                      datasets: [
                        {
                          data: rankingData.data.spgRank.map(
                            (s) => s.totalSales,
                          ),
                          backgroundColor: [
                            "#3B82F6",
                            "#10B981",
                            "#F59E0B",
                            "#EF4444",
                            "#8B5CF6",
                            "#EC4899",
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-blue-400">
                    Tidak ada data
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mainTab === "inventory" && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* Inventory Header */}
            <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-blue-800">
                  Manajemen Inventori
                </h2>
              </div>

              {/* Inventory Tabs */}
              <div className="flex gap-2">
                {[
                  { id: "empty", label: "Stok Kosong", color: "red" },
                  { id: "low", label: "Stok Menipis", color: "yellow" },
                  { id: "normal", label: "Stok Normal", color: "green" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setInventoryTab(tab.id);
                      setInventoryPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      inventoryTab === tab.id
                        ? `bg-${tab.color}-500 text-white shadow-lg`
                        : `bg-${tab.color}-50 text-${tab.color}-700 hover:bg-${tab.color}-100`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Content */}
            <div className="p-6">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan SKU atau deskripsi..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Deskripsi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Stok
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Harga
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {inventoriesByCategory?.data?.map((item) => (
                      <tr key={item._id} className="hover:bg-blue-50">
                        <td className="px-4 py-3 font-medium">{item.sku}</td>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${
                                                      item.quantity <= 0
                                                        ? "bg-red-100 text-red-800"
                                                        : item.quantity <= 10
                                                          ? "bg-yellow-100 text-yellow-800"
                                                          : "bg-green-100 text-green-800"
                                                    }`}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(
                            item.RpHargaDasar?.$numberDecimal || 0,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {inventoriesByCategory?.pagination?.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => handleInventoryPageChange(inventoryPage - 1)}
                    disabled={inventoryPage === 1}
                    className="p-2 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 bg-primary/10 text-primary rounded-lg">
                    {inventoryPage} /{" "}
                    {inventoriesByCategory.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handleInventoryPageChange(inventoryPage + 1)}
                    disabled={
                      inventoryPage ===
                      inventoriesByCategory.pagination.totalPages
                    }
                    className="p-2 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mainTab === "po" && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* PO Header */}
            <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-blue-800">
                  Purchase Orders
                </h2>
              </div>

              {/* PO Tabs */}
              <div className="flex gap-2">
                {[
                  {
                    id: "completed",
                    label: "PO Selesai",
                    icon: CheckCircle,
                    color: "green",
                  },
                  {
                    id: "pending",
                    label: "PO Tertunda",
                    icon: Clock,
                    color: "yellow",
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setPoTab(tab.id);
                        setPOStatusFilter(tab.id);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        poTab === tab.id
                          ? `bg-${tab.color}-500 text-white shadow-lg`
                          : `bg-${tab.color}-50 text-${tab.color}-700 hover:bg-${tab.color}-100`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PO Content */}
            <div className="p-6">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari purchase order..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        ERP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Plat
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-950">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {filteredPOs.map((po) => {
                      let totalRequested = 0;
                      let totalReceived = 0;
                      let isCompleted = true;

                      po.items?.forEach((item) => {
                        const requested = Number(item.request) || 0;
                        const received = Number(item.received) || 0;
                        totalRequested += requested;
                        totalReceived += received;
                        if (received !== requested) isCompleted = false;
                      });

                      const progress =
                        totalRequested > 0
                          ? (totalReceived / totalRequested) * 100
                          : 0;

                      return (
                        <tr key={po._id} className="hover:bg-blue-50">
                          <td className="px-4 py-3 font-medium">{po.Erp}</td>
                          <td className="px-4 py-3">{po.plat || "-"}</td>
                          <td className="px-4 py-3">
                            {new Date(po.createdAt).toLocaleDateString("id-ID")}
                          </td>
                          <td className="px-4 py-3">{totalRequested}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-blue-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isCompleted ? "bg-green-500" : "bg-yellow-500"}`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span
                                className={`text-xs font-medium ${
                                  isCompleted
                                    ? "text-green-600"
                                    : "text-yellow-600"
                                }`}
                              >
                                {totalReceived}/{totalRequested}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {paymentMethodToGetDetailInvoices && (
          <ModalDetailInvoicesByPaymentMethod
            paymentMethodToGetDetailInvoices={paymentMethodToGetDetailInvoices}
            onClose={() => {
              setPaymentMethodToGetDetailInvoices(null);
              document
                .getElementById("ModalDetailInvoicesByPaymentMethod")
                .close();
            }}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            transactionStatus={transactionStatus}
            outlet={selectedOutlet}
          />
        )}
      </div>
    </div>
  );
};

export default SalesReport;
