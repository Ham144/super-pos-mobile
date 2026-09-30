import React, { useState } from "react";
import {
  History,
  Filter,
  Calendar,
  Package,
  Tag,
  ArrowUp,
  ArrowDown,
  FileText,
  User,
  Loader2,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  PlusCircle,
  MinusCircle,
  PackagePlus,
  HelpCircle,
  X,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import StackTraceApi from "../api/StackTraceApi";

const StackTraceSkuPage = () => {
  // State untuk filter dan paginasi
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all"); //increase | decrease | spawn | other
  const [search, setSearch] = useState("");

  // Query data stack trace
  const {
    data: stackTraceData,
    isPending: isLoadingStackTrace,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stack-trace", from, to, limit, page, category, search],
    queryFn: () =>
      StackTraceApi.getAllStackTraceSku({
        from,
        to,
        limit,
        page,
        category,
        sku: search,
      }),
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Data log stack trace
  const data = stackTraceData?.data || [];
  const total = stackTraceData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handler filter
  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  // Handler reset filter
  const handleReset = () => {
    setFrom("");
    setTo("");
    setPage(1);
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50">
      <div className="container mx-auto lg:px-4 sm:px-6  py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          {/* Header dengan Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <History className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="lg:text-3xl text-lg font-bold text-white">
                  Buku Besar Perubahan Item
                </h1>
                <p className="lg:text-base text-sm text-blue-100 mt-1">
                  Menampilkan log perubahan inventaris SKU terbaru
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Info Summary Cards */}
            <div className="grid lg:grid-cols-4 grid-cols-2  gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-950 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                <p className="text-blue-100 text-sm">Total Log</p>
                <p className="lg:text-2xl text-base font-bold">{total}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                <p className="text-green-100 text-sm">Penambahan</p>
                <p className="lg:text-2xl text-base font-bold">
                  {
                    data.filter(
                      (d) =>
                        d.category === "increase" || d.category === "spawn",
                    ).length
                  }
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg">
                <p className="text-red-100 text-sm">Pengurangan</p>
                <p className="text-2xl font-bold">
                  {data.filter((d) => d.category === "decrease").length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                <p className="text-purple-100 text-sm">Item Unik</p>
                <p className="text-2xl font-bold">
                  {new Set(data.map((d) => d.itemId?.sku || d.itemId)).size}
                </p>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-6 border border-blue-100 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Filter Pencarian
              </h2>

              <form onSubmit={handleFilter} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Dari Tanggal */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-950" />
                      Dari Tanggal
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Sampai Tanggal */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-950" />
                      Sampai Tanggal
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Limit */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Filter className="w-4 h-4 text-blue-950" />
                      Limit Data
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                    />
                  </div>

                  {/* Cari SKU */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Search className="w-4 h-4 text-blue-950" />
                      Cari SKU
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="text"
                        placeholder="Masukkan SKU..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kategori */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Tag className="w-4 h-4 text-blue-950" />
                      Kategori Perubahan
                    </label>
                    <select
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">Semua Kategori</option>
                      <option value="increase" className="text-green-600">
                        Penambahan
                      </option>
                      <option value="decrease" className="text-red-600">
                        Pengurangan
                      </option>
                      <option value="spawn" className="text-blue-600">
                        Stok Baru
                      </option>
                      <option value="other" className="text-gray-600">
                        Lainnya
                      </option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-950/25"
                    >
                      <Filter className="w-5 h-5" />
                      <span className="max-md:hidden">Terapkan Filter</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                    >
                      <X className="w-5 h-5" />
                      <span className="max-md:hidden">Reset</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
              {isLoadingStackTrace ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <History className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <p className="mt-4 text-blue-600 font-medium animate-pulse">
                    Memuat log perubahan...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Gagal Memuat Data
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Terjadi kesalahan saat memuat data. Silakan coba lagi.
                  </p>
                </div>
              ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Info className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Tidak Ada Data
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Belum ada log perubahan SKU yang ditemukan dengan filter
                    yang dipilih.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" /> Waktu
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4" /> SKU / Item
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Tag className="w-4 h-4" /> Aksi
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <History className="w-4 h-4" /> Qty Awal
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <ArrowUp className="w-4 h-4" /> Perubahan
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" /> Deskripsi
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" /> Oleh
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.map((log, index) => {
                          const getCategoryIcon = (category) => {
                            switch (category) {
                              case "increase":
                                return (
                                  <PlusCircle className="w-4 h-4 text-green-500" />
                                );
                              case "decrease":
                                return (
                                  <MinusCircle className="w-4 h-4 text-red-500" />
                                );
                              case "spawn":
                                return (
                                  <PackagePlus className="w-4 h-4 text-blue-950" />
                                );
                              default:
                                return (
                                  <HelpCircle className="w-4 h-4 text-gray-500" />
                                );
                            }
                          };

                          return (
                            <tr
                              key={log._id || index}
                              className="hover:bg-blue-50/50 transition-colors group"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {new Date(log.createdAt).toLocaleDateString(
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                                      <Package className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-blue-700">
                                      {log.itemId?.sku || log.itemId || "N/A"}
                                    </span>
                                  </div>
                                  <span className="font-medium text-blue-700 text-xs">
                                    {log?.kodeInvoice?.kodeInvoice}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(log.category)}
                                  <span
                                    className={`font-semibold
                                                                    ${log.category === "increase" ? "text-green-600" : ""}
                                                                    ${log.category === "decrease" ? "text-red-600" : ""}
                                                                    ${log.category === "spawn" ? "text-blue-600" : ""}
                                                                    ${log.category === "other" ? "text-gray-600" : ""}
                                                                `}
                                  >
                                    {log.category
                                      ? log.category === "increase"
                                        ? "Penambahan"
                                        : log.category === "decrease"
                                          ? "Pengurangan"
                                          : log.category === "spawn"
                                            ? "Stok Baru"
                                            : "Lainnya"
                                      : "Lainnya"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {log.prevQuantity !== undefined
                                  ? log.prevQuantity
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                                                ${
                                                                  log.category ===
                                                                    "increase" ||
                                                                  log.category ===
                                                                    "spawn"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-red-100 text-red-700"
                                                                }`}
                                >
                                  {log.receivedQuantityTrace > 0 ? "+" : ""}
                                  {log.receivedQuantityTrace}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs text-wrap">
                                <div
                                  className="line-clamp-2 hover:line-clamp-none transition-all cursor-help"
                                  title={log.stackDescription}
                                >
                                  {log.stackDescription}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-gray-700">
                                  <User className="w-3 h-3" />
                                  {log.lastEditBy?.username || "N/A"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {data.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
                      <div className="text-sm text-gray-600">
                        Menampilkan{" "}
                        <span className="font-semibold text-blue-600">
                          {data.length}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold text-blue-600">
                          {total}
                        </span>{" "}
                        log | Halaman{" "}
                        <span className="font-semibold text-blue-600">
                          {page}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold text-blue-600">
                          {totalPages || 1}
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
                          { length: Math.min(5, totalPages || 1) },
                          (_, i) => {
                            let pageNum;
                            if ((totalPages || 1) <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= (totalPages || 1) - 2) {
                              pageNum = (totalPages || 1) - 4 + i;
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
                            setPage((p) => (p < (totalPages || 1) ? p + 1 : p))
                          }
                          disabled={page === totalPages || totalPages === 0}
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StackTraceSkuPage;
