import { useQuery } from "@tanstack/react-query";
import { getAllGeneratedVoucher } from "@/api/voucherApi";
import { Clock, Inbox, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

export default function GeneratedVoucherList() {
  const [selectedGenerated, setSelectedGenerated] = useState();
  const { data: generatedVoucherList, isLoading } = useQuery({
    queryKey: ["generatedVoucherList"],
    queryFn: getAllGeneratedVoucher,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="loading loading-ring loading-lg"></span>
        <div className="text-center text-sm font-bold text-gray-600">
          Memeriksa voucher generated
        </div>
      </div>
    );
  }

  const handleClickRow = (item) => {
    setSelectedGenerated(item.voucherReference);
    document.getElementById("generated-voucher-detail-modal").showModal();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-center text-blue-700 mb-6 pb-2 border-b border-blue-100">
        Generated Voucher
      </h2>

      {!generatedVoucherList?.data?.length ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Inbox size={48} className="text-gray-300" />
          <div className="text-center text-xl font-semibold text-gray-600">
            Belum Ada Voucher
          </div>
          <div className="px-6 py-3 bg-blue-50 text-blue-600 text-center font-medium rounded-full text-sm border border-blue-100">
            Lakukan transaksi di aplikasi untuk mendapatkan voucher!
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-950">
              <tr className="text-sm text-center">
                <th className="py-3 px-4  font-medium text-white text-xs uppercase tracking-wider">
                  Generation Date
                </th>
                <th className="py-3 px-4  font-medium text-white text-xs uppercase tracking-wider">
                  Sumber Voucher
                </th>
                <th className="py-3 px-4  font-medium text-white text-xs uppercase tracking-wider">
                  Private Voucher Code
                </th>
                <th className="py-3 px-4  font-medium text-white text-xs uppercase tracking-wider ">
                  Outlet berlaku
                </th>
                <th className="py-3 px-4 text-center font-medium text-white text-xs uppercase tracking-wider">
                  Email Customer
                </th>
                <th className="py-3 px-4 text-center font-medium text-white text-xs uppercase tracking-wider">
                  Terkirim
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {generatedVoucherList?.data?.map((voucher) => (
                <tr
                  key={voucher._id}
                  className="hover:bg-blue-50 transition-colors duration-150 text-center"
                >
                  <td className="py-4 px-4 text-sm font-medium text-gray-800 text-center">
                    {new Date(voucher.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td
                    className="py-4 px-4 text-sm font-medium text-gray-800 text-center   underline cursor-pointer"
                    onClick={() => handleClickRow(voucher)}
                  >
                    {voucher?.voucherReference?.judulVoucher ||
                      "Tidak Ada Judul"}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700 font-mono text-center">
                    {voucher?.privateVoucherCode}
                  </td>
                  <td
                    className="py-4 px-4 text-sm text-gray-600 text-center cursor-pointer"
                    onClick={() => {
                      toast(
                        "FITUR BELUM TERSEDIA: mengatur ulang outlet berlaku",
                      );
                    }}
                  >
                    {voucher.outletList?.length
                      ? voucher.outletList.join(", ")
                      : "Semua Outlet"}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-center">
                    {voucher?.email || "-"}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        voucher.isSend
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {voucher.isSend ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Terkirim
                        </>
                      ) : (
                        <>
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dialog id="generated-voucher-detail-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold  text-lg">Detail Sumber Voucher</h3>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Judul Voucher</th>
                  <th>Potongan</th> {/* Menggunakan <th> untuk header */}
                  <th>Berlaku Dari</th> {/* Menggunakan <th> untuk header */}
                  <th>Berlaku Hingga</th> {/* Menggunakan <th> untuk header */}
                  <th>Quantity Tersedia</th>{" "}
                  {/* Menggunakan <th> untuk header */}
                  <th>Terpakai</th> {/* Menggunakan <th> untuk header */}
                </tr>
              </thead>
              <tbody>
                {/* Baris data voucher yang dipilih */}
                {selectedGenerated && (
                  <tr
                    key={
                      selectedGenerated._id ||
                      `voucher-${selectedGenerated.judulVoucher}`
                    }
                  >
                    {" "}
                    {/* Penting: gunakan ID unik dari data jika ada, e.g., selectedGenerated._id */}
                    <td>{selectedGenerated.judulVoucher}</td>
                    <td>{selectedGenerated.potongan}</td>
                    <td>
                      {/* Format tanggal agar lebih mudah dibaca, contoh: "30 Mei 2025" */}
                      {new Date(
                        selectedGenerated.berlakuDari,
                      ).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {/* Format tanggal agar lebih mudah dibaca */}
                      {new Date(
                        selectedGenerated.berlakuHingga,
                      ).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>{selectedGenerated.quantityTersedia}</td>
                    <td>{selectedGenerated.terpakai || 0}</td>{" "}
                    {/* Asumsi field terpakai, dan fallback ke 0 */}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
