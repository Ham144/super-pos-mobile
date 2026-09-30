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
import {
  TrendingUp,
  Calendar,
  Download,
  Filter,
  Store,
  CreditCard,
  SignalHigh,
  MailWarning,
  User2,
  Users,
} from "lucide-react";
import { getAllPaymentMethod } from "@/api/paymentMethodApi";
import {
  endOfDayBySku,
  getPaymentMethodRanking,
  getRankingSpgKasir,
  getSalesReportData,
} from "@/api/dashboardApi";
import toast from "react-hot-toast";
import { getOuletByUserId, getOuletList } from "@/api/outletApi";
import { useUserInfo } from "@/store";
import ModalDetailInvoicesByPaymentMethod from "@/components/ModalDetailInvoicesByPaymentMethod";
import { getInvoicesByPaymentMethod } from "@/api/invoiceApi";
import { getAllSpg } from "@/api/spgApi";
import { Bar, Pie } from "react-chartjs-2";
import { formatCurrency } from "@/utils/formatCurrency";

// Register ChartJS components
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
    const loadingToastId = toast.loading(
      "Waiting for all data to be loaded...",
    );
    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    await delay(4000);
    toast.dismiss(loadingToastId);
    console.log(
      "tunggu 4 detik untuk jaga jaga ada query tanstack yang berat masih belum dimuat",
    );
    toast.success("All data loaded successfully");

    const responses = await Promise.all(
      paymentMethodRanking?.data?.paymentMethodRank?.map(async (item) => {
        return await getInvoicesByPaymentMethod({
          paymentMethod: item._id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          transactionStatus,
          outlet: selectedOutlet,
        });
      }),
    );
    // Menggabungkan semua detail invoice dalam satu array
    const allInvoices = responses.flatMap((response) => response.data || []);
    if (allInvoices.length === 0) {
      toast("Tidak ada detail invoice untuk didownload");
      return;
    }

    // Mempersiapkan header untuk CSV
    const baseObjectKeys_const =
      allInvoices.length > 0 ? Object.keys(allInvoices[0]) : [];

    // Properti dari currentBill yang akan di-pivot, sesuai urutan di gambar
    const currentBillPropertyKeys_const = [
      "sku",
      "RpHargaDasar",
      "description",
      "quantity",
      "totalRp",
      "catatan",
    ];

    // Field yang benar-benar dihilangkan dari output CSV
    const trulyExcludedKeys_const = [
      "_id",
      "__v",
      "sync",
      "updatedAt",
      "currentBill",
    ];

    // Field yang akan ditempatkan manual
    const manuallyPlacedOrInternalKeys_const = [
      ...trulyExcludedKeys_const,
      "kodeInvoice",
      "salesPerson",
      "spg",
    ];

    // Ambil semua header lain dari invoice, kecuali yang di-exclude/manual
    const otherInvoiceHeaders_const = baseObjectKeys_const.filter(
      (key) => !manuallyPlacedOrInternalKeys_const.includes(key),
    );

    // Header custom sesuai permintaan user
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
      "catatan",
    ];

    // Mapping header ke label Indonesia
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
      futurVoucher: "futurVoucher",
      total: "amount",
      paymentMethod: "paymentMethod",
      catatan: "catatan",
    };

    const csvOutputRows = [];
    csvOutputRows.push(
      finalHeaders_const.map((h) => `"${headerLabelMap[h] || h}"`).join(";"),
    );

    const escapeCell = (val) => {
      const valueString = val === null || val === undefined ? "" : String(val);
      if (typeof val === "object" && val !== null) {
        try {
          if (
            Array.isArray(val) &&
            val.length > 0 &&
            typeof val[0] === "object"
          ) {
            const itemStrings = val.map((objItem) =>
              Object.entries(objItem)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", "),
            );
            return `"${itemStrings.join(" | ").replace(/"/g, '""')}"`;
          }
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        } catch (e) {
          return `"[Object]"`;
        }
      }
      return `"${valueString.replace(/"/g, '""')}"`;
    };

    allInvoices.forEach((invoice) => {
      const billItems = invoice.currentBill || [];
      const rowCount = Math.max(1, billItems.length);
      let prevRow = null;
      for (let i = 0; i < rowCount; i++) {
        const row = new Array(finalHeaders_const.length).fill("");
        finalHeaders_const.forEach((header, idx) => {
          if (header === "createdAt") {
            row[idx] = new Date(invoice.createdAt).toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          } else if (header === "kodeInvoice") {
            row[idx] = i === 0 ? invoice.kodeInvoice : "";
          } else if (header === "tanggalBayar") {
            row[idx] =
              i === 0 && invoice.tanggalBayar
                ? new Date(invoice.tanggalBayar).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "";
          } else if (header === "salesPerson") {
            row[idx] = i === 0 ? invoice.salesPerson || "" : "";
          } else if (header === "spg") {
            const spgObj = spgList?.data?.find((s) => s._id === invoice.spg);
            row[idx] = i === 0 ? spgObj?.name || invoice.spg || "" : "";
          } else if (header === "sku") {
            row[idx] = billItems[i] ? billItems[i].sku || "" : "";
          } else if (header === "description") {
            row[idx] = billItems[i] ? billItems[i].description || "" : "";
          } else if (header === "quantity") {
            row[idx] = billItems[i] ? billItems[i].quantity || "" : "";
          } else if (header === "RpHargaDasar") {
            row[idx] = billItems[i] ? billItems[i].RpHargaDasar || "" : "";
          } else if (header === "totalRp") {
            row[idx] = billItems[i] ? billItems[i].totalRp || "" : "";
          } else if (
            [
              "diskon",
              "promo",
              "futurVoucher",
              "total",
              "paymentMethod",
              "catatan",
            ].includes(header)
          ) {
            row[idx] = i === 0 ? invoice[header] || "" : "";
          }
        });
        // forward fill selain kolom currentBill (sku, description, quantity, RpHargaDasar, totalRp)
        if (prevRow) {
          finalHeaders_const.forEach((header, idx) => {
            if (
              ![
                "sku",
                "description",
                "quantity",
                "RpHargaDasar",
                "totalRp",
              ].includes(header) &&
              row[idx] === ""
            ) {
              row[idx] = prevRow[idx];
            }
          });
        }
        prevRow = row;
        csvOutputRows.push(row.map((val) => escapeCell(val)).join(";"));
      }
    });

    const csvString = csvOutputRows.join("\n");
    // Membuat blob untuk file CSV dan mendownloadnya
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const date = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    link.download = `Statement CSI SUPER POS - filter:: ${selectedOutletObj?.namaOutlet} : ${date} - ${dateRange.startDate}: ${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
    { label: "Periode Settlement Saat ini", value: "settlement", icon: "📅" },
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

  return (
    <div className="container mx-auto px-4 py-8 gap-y-6 flex flex-col">
      {/* ============= FILTER SECTION ============= */}
      <div className="flex-1 gap-2 flex-col md:flex-row  ">
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 border border-gray-100 transition-all duration-300 hover:shadow-xl flex-1 justify-between flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Filter className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">Filter Laporan</h2>
          </div>

          {/* Time Template Buttons */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {timeTemplates?.length > 0 &&
                timeTemplates?.map((template) => (
                  <button
                    key={template.value}
                    className={`btn btn-sm gap-2 transition-all duration-200 ${
                      activeTemplate === template.value
                        ? "btn-primary text-white shadow-md"
                        : "btn-ghost bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setDateFromTemplate(template.value)}
                  >
                    <span className="text-lg">{template.icon}</span>
                    {template.label}
                  </button>
                ))}
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Date Range */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Tanggal Mulai</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange(e, "startDate")}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Tanggal Akhir</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange(e, "endDate")}
              />
            </div>

            {/* Payment Method */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Metode Pembayaran</span>
                </span>
              </label>
              <select
                className="select select-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white rounded-lg"
                value={paymentMethod || "all"}
                onChange={(e) => handleFilterChange(e, setPaymentMethod)}
              >
                <option value="all">Semua Metode</option>
                {paymentMethodList?.map((paymentMethod) => (
                  <option
                    key={paymentMethod?.method}
                    value={paymentMethod?.method}
                  >
                    {paymentMethod?.method}
                  </option>
                ))}
              </select>
            </div>

            {/* Outlet */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <span>Outlet</span>
                </span>
              </label>
              <select
                className="select select-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white rounded-lg"
                value={selectedOutlet}
                onChange={(e) => handleFilterChange(e, setSelectedOutlet)}
              >
                <option value="all">Gabungkan Semua Outlet</option>
                {outletList?.data?.map((outlet) => (
                  <option key={outlet?.kodeOutlet} value={outlet?.kodeOutlet}>
                    {outlet?.namaOutlet} - {outlet?.kodeOutlet}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Status */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <SignalHigh className="w-5 h-5 text-primary" />
                  <span>Status Transaksi</span>
                </span>
              </label>
              <select
                className="select select-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white rounded-lg"
                value={transactionStatus}
                onChange={(e) => handleFilterChange(e, setTransactionStatus)}
              >
                <option value="all">Semua Status</option>
                <option value="success" className="text-green-600">
                  Sukses
                </option>
                <option value="void" className="text-red-600">
                  Dibatalkan (void)
                </option>
                <option value="pending" className="text-yellow-600">
                  Belum Dibayar
                </option>
              </select>
            </div>

            {/* Report Calculation Method */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  <span>Metode Perhitungan</span>
                </span>
              </label>
              <select
                className="select select-bordered border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white rounded-lg"
                value={countMethod}
                onChange={(e) => handleFilterChange(e, setCountMethod)}
              >
                <option value="settlement">
                  Default: waktu settlement outlet
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
                className="btn btn-outline btn-error text-error hover:bg-error/10 hover:border-error/80 transition-all"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reset Filter
              </button>
            </div>
          </div>
          {/* Settlement grouping berdasar kan payment method */}
          <div className="bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300 col-span-2 justify-between mt-8">
            <div className="text-xl  font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary flex-end" />
              Penjualan berdasarkan metode pembayaran{" "}
              <div className="badge badge-warning text-xs gap-2">
                <MailWarning className="w-4 h-4" />
                Klik 2x untuk melihat detail
              </div>
              <div className="badge badge-secondary text-xs gap-2">
                <MailWarning className="w-4 h-4" />
                Filter applied
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-4">
              {" "}
              {/* Menggunakan 2fr 1fr agar lebih fleksibel dari 70% 30% */}
              <table className="table table-compact">
                {/* head */}
                <thead>
                  <tr className="text-center">
                    <th>Rank</th>
                    <th>Metode Pembayaran</th>
                    <th>Total Penjualan</th>
                    <th>Jumlah Invoice</th>
                    <th>Total Harga</th>
                    <th>Total Item Terjual</th>
                  </tr>
                </thead>
                <tbody className="text-center cursor-pointer">
                  {paymentMethodRanking?.data?.paymentMethodRank?.map(
                    (paymentMethod, index) => (
                      <tr
                        key={paymentMethod._id}
                        className="text-center hover:bg-base-200"
                        onClick={() => {
                          console.log(paymentMethod._id);
                          setPaymentMethodToGetDetailInvoices(
                            paymentMethod._id,
                          );
                          document
                            .getElementById(
                              "ModalDetailInvoicesByPaymentMethod",
                            )
                            .showModal();
                        }}
                      >
                        <td>{index + 1}</td>
                        <td>{paymentMethod._id}</td>
                        <td>
                          {Intl.NumberFormat("id-ID", {
                            currency: "IDR",
                            style: "currency",
                            minimumFractionDigits: 0,
                          }).format(paymentMethod.totalSales)}
                        </td>
                        <td>{paymentMethod.jumlahInvoice}</td>
                        <td>
                          {Intl.NumberFormat("id-ID", {
                            currency: "IDR",
                            style: "currency",
                            minimumFractionDigits: 0,
                          }).format(paymentMethod.totalSales)}
                        </td>
                        <td>{paymentMethod.totalItems}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              {/* Distribusi Pie Chart payment Method */}
              <div className=" bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300 flex-col h-full  mb-6">
                {paymentMethodRanking?.data?.paymentMethodRank?.length > 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <Pie
                      data={{
                        labels: paymentMethodRanking.data.paymentMethodRank.map(
                          (paymentMethod) => paymentMethod._id,
                        ),
                        datasets: [
                          {
                            label: "Total Penjualan",
                            data: paymentMethodRanking.data.paymentMethodRank.map(
                              (paymentMethod) => paymentMethod.totalSales,
                            ),
                            backgroundColor: [
                              "rgba(255, 99, 132, 0.5)",
                              "rgba(54, 162, 235, 0.5)",
                              "rgba(255, 206, 86, 0.5)",
                              "rgba(75, 192, 192, 0.5)",
                              "rgba(153, 102, 255, 0.5)",
                            ],
                            borderColor: [
                              "rgba(255, 99, 132, 1)",
                              "rgba(54, 162, 235, 1)",
                              "rgba(255, 206, 86, 1)",
                              "rgba(75, 192, 192, 1)",
                              "rgba(153, 102, 255, 1)",
                            ],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: "bottom",
                          },
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                const label = context.label || "";
                                const value = context.raw || 0;
                                const percentage = context.dataset.data.reduce(
                                  (acc, curr) => acc + curr,
                                  0,
                                );
                                const percentageValue =
                                  ((value / percentage) * 100).toFixed(2) + "%";
                                return `${label}: ${Intl.NumberFormat("id-ID", {
                                  currency: "IDR",
                                  style: "currency",
                                  minimumFractionDigits: 0,
                                }).format(value)} (${percentageValue})`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    Tidak ada data SPG
                  </div>
                )}
              </div>
            </div>
            <div className="justify-end flex w-full mt-4">
              <button
                className="btn"
                onClick={handleDownloadRangkingPaymentMethodDetail}
              >
                <Download className="w-4 h-4 " />
                Download Detail Sebagai CSV
              </button>
            </div>
          </div>

          {/* End of Day By Sku */}
          <div className="bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300 col-span-2 justify-between mt-8">
            <div className="text-xl font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary flex-end" />
              End of Day By Sku{" "}
              <div className="badge badge-warning text-xs gap-2">
                <MailWarning className="w-4 h-4" />
                Klik 2x untuk melihat detail
              </div>
              <div className="badge badge-secondary text-xs gap-2">
                <MailWarning className="w-4 h-4" />
                Filter applied
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-compact">
                {/* head */}
                <thead>
                  <tr className="text-center">
                    <th>Rank</th>
                    <th>Sku</th>
                    <th>QTY Penjualan</th>
                    <th>Total Harga</th>
                    <th>Jumlah Invoice</th>
                  </tr>
                </thead>
                <tbody className="text-center cursor-pointer">
                  {endOfDayBySkuData?.data?.skuRank?.map((sku, index) => (
                    <tr key={sku._id} className="text-center hover:bg-base-200">
                      <td>{index + 1}</td>
                      <td>{sku._id}</td>
                      <td>{sku.totalQuantity}</td>
                      <td>{formatCurrency(sku.totalSales)}</td>
                      <td>{sku.jumlahInvoice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* ---------------------------------------------------------- */}
        {/* Distribusi kasir */}
        <div className="max-h-screen flex gap-6 mb-6 ">
          <div className="lg:w-4/5 bg-base-100 rounded-2xl shadow-lg border border-base-300">
            <h2 className="text-xl p-3 font-semibold mb-6 flex items-center gap-2">
              <User2 className="w-5 h-5 text-primary" />
              Distribusi Kasir Dalam Tabel
            </h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-center">
                    <th>Rank</th>
                    <th>Nama Kasir</th>
                    <th>Role</th>
                    <th>Kode Kasir</th>
                    <th>Total Penjualan</th>
                    <th>Jumlah Invoice</th>
                    <th>
                      Total Harga Penjualan
                      <div
                        className="tooltip tooltip-bottom z-[9999]"
                        data-tip="Total penjualan kumulatif sepanjang waktu (tidak terpengaruh filter periode)"
                      >
                        ❓
                      </div>
                    </th>
                    <th>Total Quantity Penjualan</th>
                    <th>Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData?.data?.kasirRank?.map((kasir, index) => (
                    <tr
                      key={kasir._id}
                      className="text-center hover:bg-base-200"
                    >
                      <td>{index + 1}</td>
                      <td>{kasir.kasir.username}</td>
                      <td>{kasir.kasir.roleName}</td>
                      <td>{kasir.kasir.kodeKasir}</td>
                      <td>
                        {Intl.NumberFormat("id-ID", {
                          currency: "IDR",
                          style: "currency",
                          minimumFractionDigits: 0,
                        }).format(kasir.totalSales)}
                      </td>
                      <td>{kasir.jumlahInvoice}</td>
                      <td>
                        {Intl.NumberFormat("id-ID", {
                          currency: "IDR",
                          style: "currency",
                          minimumFractionDigits: 0,
                        }).format(kasir.kasir.totalHargaPenjualan)}
                      </td>
                      <td>{kasir.kasir.totalQuantityPenjualan}</td>
                      <td>{kasir.percentage?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie Chart untuk Kasir */}
          <div className="lg:w-1/4 bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <User2 className="w-5 h-5 text-primary" />
              Distribusi Kasir Dalam Grafik
            </h2>
            {rankingData?.data?.kasirRank?.length > 0 ? (
              <div className="flex justify-center items-center h-full">
                <Pie
                  data={{
                    labels: rankingData.data.kasirRank.map(
                      (kasir) => kasir.kasir.username,
                    ),
                    datasets: [
                      {
                        label: "Total Penjualan",
                        data: rankingData.data.kasirRank.map(
                          (kasir) => kasir.totalSales,
                        ),
                        backgroundColor: [
                          "rgba(255, 99, 132, 0.5)",
                          "rgba(54, 162, 235, 0.5)",
                          "rgba(255, 206, 86, 0.5)",
                          "rgba(75, 192, 192, 0.5)",
                          "rgba(153, 102, 255, 0.5)",
                        ],
                        borderColor: [
                          "rgba(255, 99, 132, 1)",
                          "rgba(54, 162, 235, 1)",
                          "rgba(255, 206, 86, 1)",
                          "rgba(75, 192, 192, 1)",
                          "rgba(153, 102, 255, 1)",
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const percentage = context.dataset.data.reduce(
                              (acc, curr) => acc + curr,
                              0,
                            );
                            const percentageValue =
                              ((value / percentage) * 100).toFixed(2) + "%";
                            return `${label}: ${Intl.NumberFormat("id-ID", {
                              currency: "IDR",
                              style: "currency",
                              minimumFractionDigits: 0,
                            }).format(value)} (${percentageValue})`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                Tidak ada data kasir
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ---------------------------------------------------------- */}
      {/* Distribusi SPG */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6 h-full max-h-[calc(100vh-100px)]">
        {" "}
        {/* Sesuaikan max-h dengan tinggi viewport - tinggi header/footer */}
        {/* Tabel SPG (Kiri, 70%) */}
        <div className="flex-1 lg:w-4/5 bg-base-100 rounded-2xl shadow-lg border border-base-300 flex flex-col">
          {" "}
          {/* Tambahkan flex-col untuk layout internal */}
          <h2 className="text-xl p-3 font-semibold mb-2 flex items-center gap-2 border-b border-gray-200 pb-3">
            <Users className="w-5 h-5 text-primary" />
            Distribusi SPG Dalam Tabel
          </h2>
          {/* --- INI BAGIAN PENTING UNTUK SCROLL VERTIKAL --- */}
          <div className="flex-grow overflow-hidden px-3 pb-3">
            {" "}
            {/* overflow-hidden pada parent agar scrollbar di dalam */}
            <div className="overflow-y-auto h-full">
              {" "}
              {/* Ini akan menjadi area yang bisa di-scroll vertikal */}
              <table className="table w-full table-pin-rows">
                {" "}
                {/* table-pin-rows dari DaisyUI membantu menjaga thead */}
                <thead>
                  <tr className="text-center">
                    <th>Rank</th>
                    <th>Nama SPG</th>
                    <th>Total Penjualan (Invoice)</th>
                    <th>Jumlah Invoice</th>
                    <th>
                      Total Harga Penjualan
                      <div
                        className="tooltip tooltip-bottom z-[9999]"
                        data-tip="Total penjualan kumulatif sepanjang waktu (tidak terpengaruh filter periode)"
                      >
                        ❓
                      </div>
                    </th>
                    <th>Persentase</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {/* PASTIKAN DATA rankingData.data.spgRank TIDAK KOSONG */}
                  {rankingData?.data?.spgRank?.length > 0 ? (
                    rankingData.data.spgRank.map((spg, index) => (
                      <tr
                        key={spg._id}
                        className="text-center hover:bg-base-200"
                      >
                        <td>{index + 1}</td>
                        <td>{spg.spg.name}</td>
                        <td>
                          {Intl.NumberFormat("id-ID", {
                            currency: "IDR",
                            style: "currency",
                            minimumFractionDigits: 0,
                          }).format(spg.totalSales)}
                        </td>
                        <td>{spg.jumlahInvoice}</td>
                        <td>
                          {/* Untuk angka yang sangat panjang, kita bisa menambahkan penanganan overflow horizontal di sini juga */}
                          <span className="inline-block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {Intl.NumberFormat("id-ID", {
                              currency: "IDR",
                              style: "currency",
                              minimumFractionDigits: 0,
                            }).format(spg.spg.totalHargaPenjualan)}
                          </span>
                        </td>
                        <td>{spg.percentage?.toFixed(2)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-4 text-gray-500"
                      >
                        Tidak ada data SPG untuk ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Pie Chart untuk SPG (Kanan, 30%) */}
        <div className="lg:w-1/4 bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300 flex flex-col">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Distribusi SPG Dalam Grafik
          </h2>
          {rankingData?.data?.spgRank?.length > 0 ? (
            <div className="flex justify-center items-center h-full">
              <Pie
                data={{
                  labels: rankingData.data.spgRank.map((spg) => spg.spg.name),
                  datasets: [
                    {
                      label: "Total Penjualan",
                      data: rankingData.data.spgRank.map(
                        (spg) => spg.totalSales,
                      ),
                      backgroundColor: [
                        "rgba(255, 99, 132, 0.5)",
                        "rgba(54, 162, 235, 0.5)",
                        "rgba(255, 206, 86, 0.5)",
                        "rgba(75, 192, 192, 0.5)",
                        "rgba(153, 102, 255, 0.5)",
                        // Tambahkan lebih banyak warna jika ada lebih banyak SPG
                        "#FF9F40",
                        "#8e5ea2",
                        "#3cba9f",
                        "#e8c3b9",
                        "#c45850",
                        "#7D3C98",
                        "#2ECC71",
                        "#AF7AC5",
                        "#1ABC9C",
                        "#F39C12",
                      ],
                      borderColor: [
                        "rgba(255, 99, 132, 1)",
                        "rgba(54, 162, 235, 1)",
                        "rgba(255, 206, 86, 1)",
                        "rgba(75, 192, 192, 1)",
                        "rgba(153, 102, 255, 1)",
                        // Sesuai dengan warna latar belakang
                        "#FF9F40",
                        "#8e5ea2",
                        "#3cba9f",
                        "#e8c3b9",
                        "#c45850",
                        "#7D3C98",
                        "#2ECC71",
                        "#AF7AC5",
                        "#1ABC9C",
                        "#F39C12",
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false, // Penting untuk Pie chart agar mengisi container
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        font: {
                          size: 10, // Sesuaikan ukuran font legend jika terlalu banyak item
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const label = context.label || "";
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce(
                            (acc, curr) => acc + curr,
                            0,
                          );
                          const percentageValue =
                            ((value / total) * 100).toFixed(2) + "%";
                          return `${label}: ${Intl.NumberFormat("id-ID", {
                            currency: "IDR",
                            style: "currency",
                            minimumFractionDigits: 0,
                          }).format(value)} (${percentageValue})`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              Tidak ada data SPG
            </div>
          )}
        </div>
      </div>

      {/* Grafik Penjualan grouping pakai filter */}
      <div className=" w-full   gap-6">
        <div className="bg-base-100 p-6 rounded-2xl shadow-lg border border-base-300">
          <div className="flex justify-end gap-x-2">
            <div className="badge badge-warning text-xs gap-2">
              <MailWarning className="w-4 h-4" />
              Click to see detail
            </div>
            <div className="badge badge-secondary text-xs gap-2">
              <MailWarning className="w-4 h-4" />
              Filter applied
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Penjualan grouping outlet{" "}
            {countMethod == "settlement"
              ? (selectedOutletObj?.periodeSettlement || 1) +
                " hari (waktu settlement outlet terkait)"
              : countMethod == "perhari"
                ? "Harian"
                : countMethod == "perminggu"
                  ? "Mingguan"
                  : countMethod == "perbulan"
                    ? "Bulanan"
                    : "Tahunan"}
          </h2>

          {salesChartData && (
            <Bar
              data={salesChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                },
              }}
            />
          )}
        </div>
      </div>

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
          key={"ModalDetailInvoicesByPaymentMethod"}
          outlet={selectedOutlet} //kode outlet sj
        />
      )}
    </div>
  );
};

export default SalesReport;
