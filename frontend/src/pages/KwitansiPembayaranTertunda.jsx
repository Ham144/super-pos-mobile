import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoicesByStatus, markInvoiceAsPrinted } from "../api/invoiceApi";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Search,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Mail,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

const KwitansiPembayaranTertunda = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Query untuk mengambil invoice yang sudah dibayar (done=true) tapi belum dicetak kwitansi (isPrintedKwitansi=false)
  // Status "kwitansi_tertunda" akan otomatis filter:
  // 1. done = true
  // 2. isVoid = false
  // 3. isPrintedKwitansi = false
  const {
    data: invoicesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "invoices",
      {
        status: "kwitansi_tertunda",
        limit,
        page,
        isPrintedKwitansi: false,
        search: searchTerm,
      },
    ],
    queryFn: getInvoicesByStatus,
  });

  // Mutation untuk menandai invoice sebagai sudah dicetak kwitansi (cancel)
  const { mutate: markAsPrinted } = useMutation({
    mutationFn: markInvoiceAsPrinted,
    onSuccess: () => {
      toast.success("Invoice berhasil ditandai sebagai sudah dicetak");
      queryClient.invalidateQueries(["invoices"]);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Gagal mengubah status invoice",
      );
    },
  });

  // Handle cancel
  const handleCancel = (invoiceId) => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menandai invoice ini sebagai sudah dicetak? Invoice ini tidak akan dikirim email oleh cron job.",
      )
    ) {
      markAsPrinted(invoiceId);
    }
  };

  // Handle pencarian
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset page ke 1 saat pencarian baru
  };

  // Menghitung total halaman
  const totalPages = invoicesData?.pagination?.totalPages || 1;

  // Helper untuk format tanggal
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Kwitansi Pembayaran Tertunda
                </h1>
                <p className="text-blue-100 mt-1">
                  Daftar invoice yang sudah dibayar namun belum dicetak bukti
                  pembayaran
                </p>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex flex-wrap gap-4 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">
                    Kriteria Tampilan:
                  </h3>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>
                      Invoice sudah dibayar (
                      <code className="bg-gray-100 px-1 rounded">
                        done: true
                      </code>
                      )
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    <span>
                      Tidak dibatalkan (
                      <code className="bg-gray-100 px-1 rounded">
                        isVoid: false
                      </code>
                      )
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-orange-500" />
                    <span>
                      Belum cetak kwitansi (
                      <code className="bg-gray-100 px-1 rounded">
                        isPrintedKwitansi: false
                      </code>
                      )
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-950" />
                    <span>
                      Memiliki email pelanggan (
                      <code className="bg-gray-100 px-1 rounded">customer</code>
                      )
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-blue-100/50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Info Pengiriman:</span> Invoice
                  akan dikirim otomatis setiap jam 7 pagi. Atur konfigurasi SMTP
                  di{" "}
                  <Link
                    to="/email_config"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Email Config
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-6">
          <div className="p-6">
            <form
              onSubmit={handleSearch}
              className="flex flex-wrap items-end gap-4"
            >
              {/* Search Input */}
              <div className="flex-1 min-w-[300px]">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Cari Invoice
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Kode Invoice atau Kasir..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {/* Limit Selector */}
              <div className="w-48">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tampilkan
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={10}>10 data</option>
                  <option value={20}>20 data</option>
                  <option value={50}>50 data</option>
                  <option value={100}>100 data</option>
                </select>
              </div>
            </form>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="mt-4 text-blue-600 font-medium">
                Memuat data invoice...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Gagal Memuat Data
              </h3>
              <p className="text-gray-500 text-center">
                {error?.message || "Terjadi kesalahan saat memuat data invoice"}
              </p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !isError && (
          <>
            {invoicesData?.data?.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-12">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Tidak Ada Invoice Tertunda
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Semua invoice yang sudah dibayar telah dicetak kwitansinya
                    atau tidak memenuhi kriteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          No
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Kode Invoice
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Tanggal
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Kasir
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">
                          Total
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                          Status
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoicesData?.data?.map((invoice, index) => (
                        <tr
                          key={invoice._id}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(page - 1) * limit + index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-blue-700">
                                {invoice.kodeInvoice}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(invoice.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {invoice.salesPerson || "-"}
                          </td>
                          <td className="px-6 py-4">
                            {invoice.customer ? (
                              <div>
                                <div className="flex items-center gap-1">
                                  <Mail className="w-4 h-4 text-blue-950" />
                                  <span className="text-sm font-medium text-gray-800">
                                    {invoice.customer}
                                  </span>
                                </div>
                                {invoice.customerName && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {invoice.customerName}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            <span className="text-blue-600 font-semibold">
                              {new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                              }).format(invoice.total)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" />
                              Lunas
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleCancel(invoice._id)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
                              title="Tandai sebagai sudah dicetak (batalkan pengiriman)"
                            >
                              <X className="w-4 h-4" />
                              <span>Batalkan</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
                    <div className="text-sm text-gray-600">
                      Halaman{" "}
                      <span className="font-semibold text-blue-600">
                        {page}
                      </span>{" "}
                      dari{" "}
                      <span className="font-semibold text-blue-600">
                        {totalPages}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                page === pageNum
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                                  : "border border-gray-200 hover:bg-blue-50 text-gray-700"
                              }`}
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}

                      <button
                        className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default KwitansiPembayaranTertunda;
