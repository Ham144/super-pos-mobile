import { getInvoicesByPaymentMethod } from "@/api/invoiceApi";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import React, { Fragment, useState } from "react";
import { getAllAccount } from "@/api/authApi";
import { getAllSpg } from "@/api/spgApi";
import ModalDetailInvoice from "./ModalDetailInvoice";
import {
  CreditCard,
  Info,
  CheckCircle,
  Eye,
  ShoppingCart,
  Tag,
  Gift,
} from "lucide-react";

export default function ModalDetailInvoicesByPaymentMethod({
  onClose,
  paymentMethodToGetDetailInvoices,
  startDate,
  endDate,
  transactionStatus,
  outlet,
}) {
  const {
    data: invoiceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "invoicesByPaymentMethod",
      paymentMethodToGetDetailInvoices,
      startDate,
      endDate,
      transactionStatus,
      outlet,
    ],
    queryFn: () =>
      getInvoicesByPaymentMethod({
        paymentMethod: paymentMethodToGetDetailInvoices,
        startDate,
        endDate,
        transactionStatus,
        outlet,
      }),
    enabled: !!paymentMethodToGetDetailInvoices,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});
  const [showDetail, setShowDetail] = useState(null);
  const [invoice, setInvoice] = useState(null);

  console.log(invoiceData);

  const toggleExpandRow = (invoiceId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }));
  };

  // Fetch data Kasir/Accounts
  const { data: accountsData } = useQuery({
    queryKey: ["user"],
    queryFn: getAllAccount,
  });

  // Fetch data SPG
  const { data: spgData } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  // Mendapatkan nama Kasir dari salesPerson
  const getKasirName = (salesPerson) => {
    if (!accountsData?.data) return salesPerson || "-";
    const account = accountsData.data.find(
      (item) => item.email === salesPerson || item.name === salesPerson,
    );
    return account ? account.name : salesPerson || "-";
  };

  // Mendapatkan nama SPG dari ID
  const getSpgNameById = (spgId) => {
    if (!spgData?.data) return spgId;
    const spgItem = spgData?.data?.find((item) => item._id == spgId);
    return spgItem ? spgItem?.name : "spg telah dihapus" || "spg tidak ada?";
  };

  return (
    <dialog id="ModalDetailInvoicesByPaymentMethod" className="modal">
      <Toaster />
      <div className="modal-box lg:max-w-[80vw] md:max-w-[90vw] max-md:w-full p-0 overflow-hidden bg-gradient-to-br from-blue-50/50 to-white">
        {/* Header dengan gradient blue */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  Detail Transaksi
                </h3>
                <p className="text-sm text-blue-100">
                  Metode Pembayaran:{" "}
                  <span className="font-semibold">
                    {paymentMethodToGetDetailInvoices}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="badge badge-warning gap-2 py-3 bg-yellow-400/20 text-yellow-100 border-yellow-400/30">
                <Info className="w-4 h-4" />
                Klik baris untuk detail
              </div>
              <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
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
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-800">
                    Gagal Memuat Data
                  </h4>
                  <p className="text-red-600 text-sm mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && invoiceData?.data?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Tidak Ada Data Transaksi
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                Tidak ditemukan transaksi dengan metode pembayaran{" "}
                <span className="font-semibold text-blue-600">
                  {paymentMethodToGetDetailInvoices}
                </span>{" "}
                pada periode yang dipilih.
              </p>
            </div>
          )}

          {!isLoading && !error && invoiceData?.data?.length > 0 && (
            <div className="space-y-4">
              {/* Info Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-950 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-blue-100 text-sm">Total Transaksi</p>
                  <p className="text-2xl font-bold">
                    {invoiceData.pagination?.total || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-green-100 text-sm">Total Pendapatan</p>
                  <p className="text-2xl font-bold">
                    Rp{" "}
                    {invoiceData.data
                      .reduce((sum, inv) => sum + (inv.total || 0), 0)
                      .toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-yellow-100 text-sm">
                    Rata-rata per Transaksi
                  </p>
                  <p className="text-2xl font-bold">
                    Rp{" "}
                    {Math.round(
                      invoiceData.data.reduce(
                        (sum, inv) => sum + (inv.total || 0),
                        0,
                      ) / invoiceData.data.length,
                    ).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-purple-100 text-sm">Total</p>
                  <p className="text-2xl font-bold">
                    {invoiceData.data.reduce(
                      (sum, inv) => sum + (inv.currentBill?.length || 0),
                      0,
                    )}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="table table-pin-rows w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 sticky top-0 z-10">
                      <tr>
                        <th className="w-12 text-center"></th>
                        <th className="text-blue-800 font-semibold">
                          Kode Invoice
                        </th>
                        <th className="text-blue-800 font-semibold">Tanggal</th>
                        <th className="text-blue-800 font-semibold">Kasir</th>
                        <th className="text-blue-800 font-semibold">SPG</th>
                        <th className="text-right text-blue-800 font-semibold">
                          Sub Total
                        </th>
                        <th className="text-right text-blue-800 font-semibold">
                          Total
                        </th>
                        <th className="text-center text-blue-800 font-semibold">
                          Billing
                        </th>
                        <th className="text-center text-blue-800 font-semibold">
                          Bayar
                        </th>
                        <th className="text-center text-blue-800 font-semibold">
                          Kwitansi
                        </th>
                        <th className="text-center text-blue-800 font-semibold">
                          Status
                        </th>
                        <th className="text-center text-blue-800 font-semibold">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData?.data?.map((invoice) => (
                        <Fragment key={invoice._id}>
                          <tr className="hover:bg-blue-50/50 transition-colors border-b border-blue-50">
                            <td className="text-center">
                              <button
                                className="btn btn-circle btn-xs btn-ghost text-blue-600 hover:bg-blue-100"
                                onClick={() => toggleExpandRow(invoice._id)}
                              >
                                {expandedRows[invoice._id] ? "▼" : "▶"}
                              </button>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm">
                                  <CreditCard className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-blue-900">
                                  {invoice.kodeInvoice}
                                </span>
                              </div>
                            </td>
                            <td className="text-gray-600 text-sm">
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
                            <td className="font-medium text-gray-800">
                              {getKasirName(invoice.salesPerson)}
                            </td>
                            <td className="text-gray-600">
                              {getSpgNameById(invoice?.spg) || "-"}
                            </td>
                            <td className="text-right font-mono">
                              <span className="text-green-600 font-semibold">
                                Rp{" "}
                                {invoice.subTotal?.toLocaleString("id-ID") || 0}
                              </span>
                            </td>
                            <td className="text-right font-mono">
                              <span className="text-blue-600 font-semibold">
                                Rp {invoice.total?.toLocaleString("id-ID") || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              {invoice.isPrintedCustomerBilling ? (
                                <div
                                  className="tooltip"
                                  data-tip="Sudah Cetak Billing"
                                >
                                  <div className="badge badge-success badge-sm gap-1 text-white">
                                    <CheckCircle className="w-3 h-3" />
                                    Cetak
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="text-center">
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
                            <td className="text-center">
                              {invoice.isPrintedKwitansi ? (
                                <div
                                  className="tooltip"
                                  data-tip="Sudah Cetak Kwitansi"
                                >
                                  <div className="badge badge-success badge-sm gap-1 text-white">
                                    <CheckCircle className="w-3 h-3" />
                                    Cetak
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              <span
                                className={`badge rounded-full px-3 py-2 font-medium text-xs ${
                                  invoice.isVoid
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : invoice.done
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                }`}
                              >
                                {invoice.isVoid
                                  ? "Dibatalkan"
                                  : invoice.done
                                    ? "Selesai"
                                    : "Tertunda"}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-100"
                                onClick={() => {
                                  document
                                    .getElementById("modalDetailInvoice")
                                    .showModal();
                                  setShowDetail(invoice);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Detail Expand */}
                          {expandedRows[invoice._id] && (
                            <tr>
                              <td colSpan="12" className="p-0 bg-blue-50/30">
                                <div className="p-6 border-t border-b border-blue-100">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Items Purchased */}
                                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                                      <div className="bg-gradient-to-r from-blue-950 to-blue-600 px-4 py-2">
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                          <ShoppingCart className="w-4 h-4" />
                                          Item Pembelian
                                        </h3>
                                      </div>
                                      <div className="p-4">
                                        {invoice.currentBill?.length > 0 ? (
                                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {invoice.currentBill.map(
                                              (item, idx) => (
                                                <div
                                                  key={idx}
                                                  className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                                                >
                                                  <div>
                                                    <p className="font-medium text-sm">
                                                      {item.description}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                      Rp{" "}
                                                      {item.RpHargaDasar?.toLocaleString(
                                                        "id-ID",
                                                      )}{" "}
                                                      x {item.quantity}
                                                    </p>
                                                  </div>
                                                  <p className="font-semibold text-blue-600 text-sm">
                                                    Rp{" "}
                                                    {item.totalRp?.toLocaleString(
                                                      "id-ID",
                                                    )}
                                                  </p>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-center text-gray-500 py-4 text-sm">
                                            Tidak ada item
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Diskon & Promo */}
                                    <div className="space-y-4">
                                      {invoice?.diskon?.length > 0 && (
                                        <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
                                          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2">
                                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                              <Tag className="w-4 h-4" />
                                              Diskon
                                            </h3>
                                          </div>
                                          <div className="p-4 max-h-[200px] overflow-y-auto">
                                            {invoice.diskon.map((item, idx) => (
                                              <div
                                                key={idx}
                                                className="flex justify-between items-center p-2 bg-green-50 rounded-lg mb-2 last:mb-0"
                                              >
                                                <div>
                                                  <p className="font-medium text-sm">
                                                    {item.description}
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    {
                                                      item.diskonInfo
                                                        ?.judulDiskon
                                                    }
                                                  </p>
                                                </div>
                                                <p className="font-semibold text-green-600 text-sm">
                                                  {item.diskonInfo
                                                    ?.RpPotonganHarga
                                                    ? `Rp ${item.diskonInfo.RpPotonganHarga.toLocaleString("id-ID")}`
                                                    : `${item.diskonInfo?.percentPotonganHarga}%`}
                                                </p>
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
                                                className="flex justify-between items-center p-2 bg-purple-50 rounded-lg mb-2 last:mb-0"
                                              >
                                                <div>
                                                  <p className="font-medium text-sm">
                                                    {item.description}
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    {item.promoInfo?.judulPromo}
                                                  </p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="text-sm font-medium">
                                                    {
                                                      item.promoInfo
                                                        ?.skuBarangBonus
                                                    }
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    x
                                                    {
                                                      item.promoInfo
                                                        ?.quantityBonus
                                                    }
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {invoiceData?.pagination && (
                  <div className="flex justify-between items-center p-4 border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
                    <div className="text-sm text-gray-600">
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

                    <div className="join">
                      <button
                        className="join-item btn btn-sm bg-white border-blue-200 hover:bg-blue-50"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage <= 1}
                      >
                        «
                      </button>

                      {Array.from(
                        {
                          length: Math.min(
                            5,
                            invoiceData.pagination.totalPages,
                          ),
                        },
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
                              className={`join-item btn btn-sm ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 hover:from-blue-700 hover:to-blue-800"
                                  : "bg-white border-blue-200 hover:bg-blue-50"
                              }`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}

                      <button
                        className="join-item btn btn-sm bg-white border-blue-200 hover:bg-blue-50"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(
                              prev + 1,
                              invoiceData.pagination.totalPages,
                            ),
                          )
                        }
                        disabled={
                          currentPage >= invoiceData.pagination.totalPages
                        }
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalDetailInvoice
        showDetail={showDetail}
        onClose={() => setShowDetail(null)}
        invoice={invoice}
      />
    </dialog>
  );
}
