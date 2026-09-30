import { getUserById } from "@/api/authApi";
import { useQuery } from "@tanstack/react-query";

import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Tag,
  Gift,
  ShoppingCart,
  CreditCard,
  User,
  Calendar,
  Printer,
  Percent,
  Award,
  Receipt,
  Paperclip,
} from "lucide-react";

export default function ModalDetailInvoice({ showDetail }) {
  //tanstack
  const { data: getConfirmBy } = useQuery({
    queryKey: ["getConfirmBy", showDetail?.confirmVoidById],
    queryFn: () => getUserById(showDetail?.confirmVoidById),
    enabled: !!showDetail?.confirmVoidById,
  });

  return (
    <dialog id="modalDetailInvoice" className="modal">
      <div className="modal-box w-11/12 max-w-5xl p-0 overflow-hidden bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-2xl">
        {/* Header dengan gradient blue */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  Detail Invoice
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {showDetail?.invoiceNumber}
                  </span>
                </h3>
                <p className="text-sm text-blue-100">
                  Informasi lengkap transaksi dan item pembelian
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
          {/* Invoice Header Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Card - Info Umum */}
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-950 to-blue-600 px-4 py-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Informasi Umum
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-gray-500">Dibuat Pada:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(showDetail?.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-gray-500">Pelanggan:</span>
                    <span className="font-medium text-gray-800">
                      {(typeof showDetail?.customer === "object"
                        ? [showDetail?.customer?.name, showDetail?.customer?.phone]
                            .filter(Boolean)
                            .join(" · ")
                        : showDetail?.customer) || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-gray-500">Kasir:</span>
                    <span className="font-medium text-gray-800">
                      {showDetail?.salesPerson || "-"}
                    </span>
                  </div>
                </div>

                {showDetail?.paymentMethod && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 flex justify-between">
                      <span className="text-gray-500">Metode Pembayaran:</span>
                      <span className="font-medium text-gray-800">
                        {showDetail?.paymentMethod}
                      </span>
                    </div>
                  </div>
                )}

                {showDetail?.nomorTransaksi && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 flex justify-between">
                      <span className="text-gray-500">Nomor Transaksi:</span>
                      <span className="font-medium text-gray-800">
                        {showDetail?.nomorTransaksi}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card - Status & Keuangan */}
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Status & Keuangan
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span
                      className={`badge rounded-full px-3 py-2 font-medium text-xs ${
                        showDetail?.done && showDetail?.isVoid
                          ? "bg-red-100 text-red-700 border-red-200"
                          : showDetail?.requestingVoid
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : showDetail?.done
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {showDetail?.done && showDetail?.isVoid
                        ? "Dibatalkan"
                        : showDetail?.requestingVoid
                          ? "Request Void"
                          : showDetail?.done
                            ? "Lunas"
                            : "Belum Bayar"}
                    </span>
                  </div>
                </div>

                {showDetail?.isVoid && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 flex justify-between">
                      <span className="text-gray-500">
                        Dikonfirmasi Void oleh:
                      </span>
                      <span className="font-medium text-gray-800">
                        {getConfirmBy?.data?.username || "-"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-medium text-gray-800">
                      Rp {showDetail?.subTotal?.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-bold text-blue-600">
                      Rp {showDetail?.total?.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Printer className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Status Cetak:</span>
                      <div className="flex gap-2">
                        <span
                          className={`badge text-white badge-sm gap-1 ${
                            showDetail?.isPrintedCustomerBilling
                              ? "badge-success text-green-700"
                              : "badge-warning text-yellow-700"
                          }`}
                        >
                          <Printer className="w-3 h-3" />
                          Bill:{" "}
                          {showDetail?.isPrintedCustomerBilling
                            ? "Sudah"
                            : "Belum"}
                        </span>
                        <span
                          className={`badge text-white badge-sm gap-1 ${
                            showDetail?.isPrintedKwitansi
                              ? "badge-success text-green-700"
                              : "badge-warning text-yellow-700"
                          }`}
                        >
                          <Printer className="w-3 h-3" />
                          Kwitansi:{" "}
                          {showDetail?.isPrintedKwitansi ? "Sudah" : "Belum"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-950 to-blue-600 px-4 py-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Item Pembelian
              </h4>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="table table-pin-rows w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="text-blue-800">No</th>
                      <th className="text-blue-800">SKU</th>
                      <th className="text-blue-800">Deskripsi</th>
                      <th className="text-center text-blue-800">Qty</th>
                      <th className="text-right text-blue-800">Harga</th>
                      <th className="text-right text-blue-800">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {showDetail?.currentBill?.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="font-medium">{index + 1}</td>
                        <td>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                            {item.sku}
                          </span>
                        </td>
                        <td className="font-medium">{item.description}</td>
                        <td className="text-center">
                          <span className="badge badge-outline badge-sm">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="text-right font-mono">
                          Rp {item.RpHargaDasar?.toLocaleString("id-ID")}
                        </td>
                        <td className="text-right font-mono font-semibold text-blue-600">
                          Rp {item.totalRp?.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Promo, Discount, Voucher Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Promo Section */}
            {showDetail?.promo?.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Promo Terpakai
                  </h4>
                </div>
                <div className="p-4 max-h-[200px] overflow-y-auto">
                  {showDetail?.promo?.map((promo, index) => (
                    <div
                      key={`promo-${index}`}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-purple-100 mb-2 last:mb-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {promo?.promoInfo?.judulPromo || "-"}
                      </span>
                      <span className="badge badge-sm bg-purple-100 text-purple-700 border-purple-200">
                        +{promo?.promoInfo?.quantityBonus} bonus
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discount Section */}
            {showDetail?.diskon?.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg border border-orange-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Diskon Terpakai
                  </h4>
                </div>
                <div className="p-4 max-h-[200px] overflow-y-auto">
                  {showDetail?.diskon?.map((diskon, index) => (
                    <div
                      key={`diskon-${index}`}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100 mb-2 last:mb-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {diskon?.diskonInfo?.judulDiskon || "-"}
                      </span>
                      <span className="badge badge-sm bg-orange-100 text-orange-700 border-orange-200">
                        {diskon?.diskonInfo?.RpPotonganHarga
                          ? `Rp ${diskon?.diskonInfo?.RpPotonganHarga?.toLocaleString("id-ID")}`
                          : `${diskon?.diskonInfo?.percentPotonganHarga}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voucher Section */}
            {showDetail?.implementedVoucher?.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Voucher Terpakai
                  </h4>
                </div>
                <div className="p-4 max-h-[200px] overflow-y-auto">
                  {showDetail?.implementedVoucher?.map((voucher, index) => (
                    <div
                      key={`voucher-${index}`}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-green-100 mb-2 last:mb-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {voucher?.judulVoucher || "-"}
                      </span>
                      <span className="badge badge-sm bg-green-100 text-green-700 border-green-200">
                        Rp {voucher.potongan?.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl shadow-lg border border-blue-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Pembayaran</p>
                  <p className="text-xs text-gray-400">
                    Setelah diskon & promo
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 line-through">
                  Rp {showDetail?.subTotal?.toLocaleString("id-ID")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  Rp {showDetail?.total?.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-blue-100 flex justify-end">
          <form method="dialog">
            <button className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 gap-2">
              <X className="w-4 h-4" />
              Tutup
            </button>
          </form>
        </div>
      </div>

      {/* Click outside to close */}
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
