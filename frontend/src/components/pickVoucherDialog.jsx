const PickVoucherDialog = ({
  voucherList,
  tempVoucherTerhubung,
  setTempVoucherTerhubung,
  setTempVoucherTerputus,
  handleKonfirmasiVoucherTerhubung,
  selectedInventory,
  tempVoucherTerputus,
}) => {
  return (
    <dialog id="pickvoucher" className="modal">
      <div className="modal-box relative w-full max-w-6xl">
        <h3 className="font-bold text-lg mb-4">
          Pilih Voucher Yang berlaku untuk produk ini
        </h3>
        <div
          className="overflow-y-auto h-[300px] pb-20 overflow-x-auto mb-4"
          style={{ maxHeight: "600px" }}
        >
          <table className="table min-w-full text-left border-collapse ">
            {/* head */}
            <thead>
              <tr>
                <th className="border px-4 py-2">Judul Voucher</th>
                <th className="border px-4 py-2">Potongan</th>
                <th className="border px-4 py-2">Kuota</th>
                <th className="border px-4 py-2">Berlaku Dari</th>
                <th className="border px-4 py-2">Berlaku Hingga</th>
                <th className="border px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm overflow-y-auto">
              {voucherList?.map((item) => {
                const isConnected =
                  tempVoucherTerhubung?.includes(item._id) ||
                  (item.skuList?.includes(selectedInventory?.sku) &&
                    !tempVoucherTerputus?.includes(item._id));
                return (
                  <tr key={item._id}>
                    <td className="border px-4 py-2">{item.judulVoucher}</td>
                    <td className="border px-4 py-2">
                      {Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(item?.potongan)}
                    </td>
                    <td className="border px-4 py-2">
                      {item?.syaratQuantity &&
                        `Min. ${item.syaratQuantity} pcs`}
                      {item?.syaratTotalRp && `Min. Rp ${item.kuota}`}
                    </td>
                    <td className="border px-4 py-2">
                      {new Date(item?.berlakuDari).toLocaleDateString("id-ID")}
                    </td>
                    <td className="border px-4 py-2">
                      {new Date(item?.berlakuHingga).toLocaleDateString(
                        "id-ID"
                      )}
                    </td>
                    <td className="border px-4 py-2">
                      <button
                        className={`btn btn-sm ${
                          isConnected
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300"
                        }`}
                        onClick={() => {
                          if (isConnected) {
                            setTempVoucherTerhubung((prev) =>
                              prev.filter((i) => i !== item._id)
                            );
                            setTempVoucherTerputus((prev) => [
                              ...prev,
                              item._id,
                            ]);
                          } else {
                            setTempVoucherTerputus((prev) =>
                              prev.filter((i) => i !== item._id)
                            );
                            setTempVoucherTerhubung((prev) => [
                              ...prev,
                              item._id,
                            ]);
                          }
                        }}
                      >
                        {isConnected ? "Terhubung" : "Hubungkan"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bottom-0 left-0 right-0 absolute flex justify-between px-4 py-2 bg-white">
          <button
            className="btn"
            onClick={() => {
              setTempVoucherTerhubung([]);
              setTempVoucherTerputus([]);
              document.getElementById("pickvoucher").close();
            }}
          >
            Batal
          </button>
          <button
            className="btn bg-green-500 hover:bg-green-600 text-white"
            onClick={handleKonfirmasiVoucherTerhubung}
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default PickVoucherDialog;
