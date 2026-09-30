import { useUserInfo } from "@/store";
import { useMutation } from "@tanstack/react-query";
import { FileWarning, LucideMailWarning, X } from "lucide-react";

const ModalVoid = ({
  setSelectedInvoice,
  handleVoidInvoice,
  selectedInvoice,
}) => {
  const { userInfo } = useUserInfo();

  return (
    <>
      <input type="checkbox" id="void" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box max-w-3xl bg-white rounded-lg shadow-xl">
          <h3 className="font-semibold text-lg text-red-600 flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
            <span style={{ fontSize: "1em" }}>❌</span> Konfirmasi Pembatalan
            Transaksi
          </h3>

          <div className="py-4">
            <div className="bg-yellow-100 border border-yellow-200 rounded-md p-4 mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-yellow-700">
                <span style={{ fontSize: "1em" }}>⚠️</span>
                <span className="font-medium text-sm">
                  Peringatan: Invoice yang sudah dibatalkan tidak dapat
                  dipulihkan kembali.
                </span>
              </div>
              <div className="bg-blue-100 text-blue-600 rounded-md py-1 px-2 text-xs font-mono">
                <span className="font-bold">Dikonfirmasi oleh:</span>{" "}
                {userInfo?.username}
                {" -- "}
                {userInfo?._id}
              </div>
            </div>

            <p className="mb-4 text-sm text-gray-700">
              Pembatalan transaksi ini akan mengubah data sebagai berikut:
            </p>

            <div className="bg-gray-100 rounded-lg mb-4 max-h-96 overflow-y-auto border border-gray-200">
              <h4 className="font-semibold mb-3 text-blue-700 text-sm p-3">
                Detail perubahan data:
              </h4>
              <div className="overflow-x-auto">
                <table className="table table-compact w-full text-xs">
                  <thead className="bg-gray-200 text-gray-700 uppercase">
                    <tr>
                      <th className="text-left">Data</th>
                      <th className="text-center">Perubahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Data Diskon */}
                    <tr>
                      <td className="font-medium text-sm">
                        diskon.quantityTersedia
                      </td>
                      <td className="text-center">
                        <span className="badge bg-green-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬆️</span> Naik
                        </span>
                      </td>
                    </tr>
                    {/* Data Promo */}
                    <tr>
                      <td className="font-medium text-sm">
                        promo.quantityBerlaku
                      </td>
                      <td className="text-center">
                        <span className="badge bg-green-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬆️</span> Naik
                        </span>
                      </td>
                    </tr>
                    {/* Data voucher */}
                    <tr>
                      <td className="font-medium text-sm">
                        voucher.quantityTersedia
                      </td>
                      <td className="text-center">
                        <span className="badge bg-green-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬆️</span> Naik
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">voucher.terjadi</td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                        <span className="block text-[10px] text-gray-500 mt-1">
                          futureVoucher
                        </span>
                      </td>
                    </tr>
                    {/* Data Invoice */}
                    <tr>
                      <td className="font-medium text-sm">invoice.isVoid</td>
                      <td className="text-center">
                        <span className="badge bg-blue-950 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>🔄</span> true
                        </span>
                      </td>
                    </tr>
                    {/* Data SPG */}
                    <tr>
                      <td className="font-medium text-sm">
                        spg[spg].totalHargaPenjualan
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        spg[spg].totalQuantityPenjualan
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        spg[spg].skuTerjual
                      </td>
                      <td className="text-center">
                        <span className="badge bg-blue-950 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>🔄</span> Update
                        </span>
                      </td>
                    </tr>
                    {/* Data User */}
                    <tr>
                      <td className="font-medium text-sm">
                        userInfo (lookup kodeKasir)
                      </td>
                      <td className="text-center">
                        <span className="badge bg-gray-500 text-white gap-1 text-xs">
                          kodeInvoice.slice(2,5)
                        </span>
                        <span className="block text-[10px] text-gray-500 mt-1">
                          bukan salesPerson
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        userInfo.totalQuantityPenjualan
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        userInfo.totalHargaPenjualan
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        userInfo.skuTerjual
                      </td>
                      <td className="text-center">
                        <span className="badge bg-blue-950 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>🔄</span> Update
                        </span>
                      </td>
                    </tr>
                    {/* Data Inventaris */}
                    <tr>
                      <td className="font-medium text-sm">
                        inventories[sku].quantity
                      </td>
                      <td className="text-center">
                        <span className="badge bg-green-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬆️</span> Naik
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        inventories[sku].terjual
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    {/* Data Outlet */}
                    <tr>
                      <td className="font-medium text-sm">outlet.pendapatan</td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-sm">
                        outlet.jumlahInvoice
                      </td>
                      <td className="text-center">
                        <span className="badge bg-red-500 text-white gap-1 text-xs">
                          <span style={{ fontSize: "0.8em" }}>⬇️</span> Turun
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="modal-action mt-4 pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={() => {
                setSelectedInvoice(null);
                document.getElementById("void").checked = false;
              }}
              className="btn btn-sm btn-outline"
            >
              Batal
            </button>
            <button
              onClick={() => handleVoidInvoice(selectedInvoice)}
              className="btn btn-sm btn-error text-white"
            >
              Void Pembayaran
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalVoid;
