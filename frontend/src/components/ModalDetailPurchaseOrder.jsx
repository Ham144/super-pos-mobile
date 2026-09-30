export default function ModalDetailPurchaseOrder({
  selectedOrder = null,
  setSelectedOrder,
}) {
  return (
    <dialog
      id="modalDetailPurchaseOrder"
      className="modal modal-bottom sm:modal-middle"
    >
      <div className="mx-auto max-w-7xl bg-base-100 p-6 rounded-lg shadow-xl">
        <h3 className="font-bold text-xl text-base-content mb-4 border-b pb-2">
          Detail Purchase Order
        </h3>

        <form method="dialog">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => setSelectedOrder(null)}
          >
            ✕
          </button>
        </form>

        {selectedOrder ? (
          <div className="space-y-6 ">
            <div className="p-4 bg-base-200 rounded-md">
              <h4 className="font-semibold text-lg mb-3 text-base-content">
                Informasi Umum
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Purchase Code (Erp)
                  </p>

                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.Erp}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Plat Kendaraan
                  </p>
                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.plat || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Dibuat Oleh
                  </p>
                  <span className="font-semibold text-base-content truncate">
                    {selectedOrder.dibuatOleh || "-"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Dipenuhi Oleh
                  </p>
                  <span className="font-semibold text-base-content truncate">
                    {selectedOrder.dipenuhiOleh || "-"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Jumlah Item
                  </p>
                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.items?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Status
                  </p>
                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.status || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Dibuat Tanggal
                  </p>
                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleDateString(
                          "id",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-base-content text-opacity-70">
                    Diperbarui Tanggal
                  </p>
                  <p className="font-semibold text-base-content truncate">
                    {selectedOrder.updatedAt
                      ? new Date(selectedOrder.updatedAt).toLocaleDateString(
                          "id",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-3 text-base-content">
                Daftar Item
              </h4>
              <div className="overflow-x-auto max-h-[350px] border border-base-300 rounded-md">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <table className="table table-zebra table-pin-rows table-sm w-full">
                    <thead className="bg-base-300 text-base-content">
                      <tr>
                        <th className="p-3 text-left">SKU</th>
                        <th className="p-3 text-left">Barcode</th>
                        <th className="p-3 text-center">Request</th>
                        <th className="p-3 text-center">Received</th>
                        <th className="p-3 text-left">Keterangan</th>
                        <th className="p-3 text-left">Tgl. Terpenuhi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index} className="hover:bg-base-200">
                          <td className="p-3">{item.sku || "-"}</td>
                          <td className="p-3">{item.barcodeItem || "-"}</td>
                          <td className="p-3 text-center">
                            {item.request ?? "-"}
                          </td>
                          <td className="p-3 text-center">
                            {item.received ?? "-"}
                          </td>
                          <td className="p-3">{item.keterangan || "-"}</td>
                          <td className="p-3">
                            {item.tanggalTerpenuhi
                              ? new Date(
                                  item.tanggalTerpenuhi
                                ).toLocaleDateString("id", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-base-content text-opacity-60">
                    Tidak ada item dalam purchase order ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-base-content text-opacity-60">
            Data purchase order tidak ditemukan atau belum dipilih.
          </div>
        )}

        <div className="modal-action mt-6">
          <form method="dialog">
            <button
              className="btn btn-primary text-primary-content"
              onClick={() => setSelectedOrder(null)}
            >
              Tutup
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => setSelectedOrder(null)}>
          close
        </button>
      </form>
    </dialog>
  );
}
