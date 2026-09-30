import StackTraceApi from "@/api/StackTraceApi";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  Calendar,
  Package,
  Tag,
  History,
  ArrowUp,
  FileText,
  User,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  MinusCircle,
  PackagePlus,
  HelpCircle,
} from "lucide-react";

import { useState } from "react";

const StackTraceBySku = ({ skuToTrace }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");

  const {
    data: stackTraceSkuSingle,
    isPending: isLoadingStackTrace,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "stack-trace-single-sku",
      from,
      to,
      limit,
      page,
      category,
      skuToTrace,
    ],
    queryFn: () =>
      StackTraceApi.getAllStackTraceSku({
        from,
        to,
        limit,
        page,
        category,
        sku: skuToTrace,
      }),
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!skuToTrace,
  });

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const getCategoryIcon = (category) => {
    switch (category) {
      case "increase":
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case "decrease":
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      case "spawn":
        return <PlusCircle className="w-4 h-4 text-blue-950" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setFrom("");
    setTo("");
    setPage(1);
    refetch();
  };

  const data = stackTraceSkuSingle?.data || [];
  const total = data.length;
  const totalPages = Math.ceil(total / limit);

  return (
    <dialog id="stack-trace-single-sku" className="modal">
      <div className="modal-box max-w-7xl w-full p-0 overflow-hidden bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Stack Tracing SKU
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {skuToTrace}
                  </span>
                </h2>
                <p className="text-sm text-blue-100">
                  Menampilkan maksimal {limit} perubahan terakhir
                </p>
              </div>
            </div>
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Filter Section */}
          <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-5 border border-blue-100">
            <form onSubmit={handleFilter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    Limit
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

                {/* Action Buttons */}
                <div className="flex items-end gap-2 lg:col-span-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-950/25"
                  >
                    <Filter className="w-5 h-5" />
                    Terapkan Filter
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                  >
                    <X className="w-5 h-5" />
                    Reset
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
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <History className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-blue-600 font-medium animate-pulse">
                  Memuat data perubahan...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Gagal Memuat Data
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  Terjadi kesalahan saat memuat data. Silakan coba lagi.
                </p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Tidak Ada Data
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  Tidak ditemukan perubahan untuk SKU{" "}
                  <span className="font-semibold text-blue-600">
                    {skuToTrace}
                  </span>
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 sticky top-0 z-10">
                      <tr>
                        {[
                          { icon: Calendar, label: "Waktu" },
                          { icon: Package, label: "SKU / Item" },
                          { icon: Tag, label: "Aksi" },
                          { icon: History, label: "Qty Awal" },
                          { icon: ArrowUp, label: "Perubahan" },
                          { icon: FileText, label: "Deskripsi" },
                          { icon: User, label: "Oleh" },
                        ].map((col, idx) => {
                          const Icon = col.icon;
                          return (
                            <th
                              key={idx}
                              className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider"
                            >
                              <span className="flex items-center gap-1">
                                <Icon className="w-4 h-4" />
                                {col.label}
                              </span>
                            </th>
                          );
                        })}
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

                        const getCategoryLabel = (category) => {
                          switch (category) {
                            case "increase":
                              return "Penambahan";
                            case "decrease":
                              return "Pengurangan";
                            case "spawn":
                              return "Stok Baru";
                            default:
                              return "Lainnya";
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
                                <div className="flex gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-blue-700">
                                    {log.itemId?.sku || log.itemId || "N/A"}
                                  </span>
                                </div>
                                <span className="text-xs text-blue-400">
                                  {log?.kodeInvoice?.kodeInvoice}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(log.category)}
                                <span
                                  className={`
                                                            font-semibold
                                                            ${log.category === "increase" ? "text-green-600" : ""}
                                                            ${log.category === "decrease" ? "text-red-600" : ""}
                                                            ${log.category === "spawn" ? "text-blue-600" : ""}
                                                            ${log.category === "other" ? "text-gray-600" : ""}
                                                        `}
                                >
                                  {getCategoryLabel(log.category)}
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
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
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
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
                  <div className="text-sm text-gray-600">
                    Menampilkan{" "}
                    <span className="font-semibold text-blue-600">
                      {data.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-blue-600">{total}</span>{" "}
                    perubahan | Halaman{" "}
                    <span className="font-semibold text-blue-600">{page}</span>{" "}
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
              </>
            )}
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default StackTraceBySku;
