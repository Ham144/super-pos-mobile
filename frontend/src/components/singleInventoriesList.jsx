import React from "react";
import FilterInventories from "./filterInventories";
import { useFilter } from "@/store";

//digunakan untuk memilih hanya satu inventory sku
const PickSingleInventoriesDialog = ({
  inventoryList,
  tempSkuTerpilih,
  setTempSkuTerpilh,
  title = "Pilih Sku",
  handleKonfirmasi,
  setDescription,
}) => {
  const { filter, setFilter } = useFilter();

  return (
    <dialog id="picksingleinventoriesdialog" className="modal">
      <div className="relative  bg-white p-4 rounded min-w-[800px]">
        <h3 className="font-bold text-lg ">{title}</h3>
        <div className="flex w-full">
          <FilterInventories
            onChange={(value) => {
              setFilter({ ...filter, searchKey: value.searchKey });
            }}
          />
        </div>
        <div
          className="overflow-y-auto mb-4 pb-12"
          style={{ maxHeight: "600px" }} // Sesuaikan tinggi maksimum
        >
          <table className="table min-h-32 ">
            {/* head */}
            <thead className="sticky text-center  top-4 translate-y-[-30px] bg-white">
              <tr>
                <th>Sku</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>RpHargaDasar</th>
                <th>Brand</th>
                <th>Pilihan</th>
              </tr>
            </thead>
            <tbody className="text-sm overflow-y-auto text-center ">
              {inventoryList?.map((item) => (
                <tr
                  key={item._id}
                  className={`${
                    tempSkuTerpilih == item?.sku && "bg-green-400"
                  }`}
                >
                  <td>{item?.sku}</td>
                  <td>{item?.description}</td>
                  <td>{item?.quantity}</td>
                  <td>{item?.RpHargaDasar?.$numberDecimal}</td>
                  <td>{item?.brand}</td>
                  <td>
                    {tempSkuTerpilih == item?.sku ? (
                      <button className="btn">Terpilih</button>
                    ) : (
                      <button
                        onClick={() => {
                          setTempSkuTerpilh(item?.sku);
                          setDescription(item?.description);
                        }}
                        className="btn"
                      >
                        Pilih
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tombol di bagian bawah */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 py-2 bg-white border-t">
          <button
            className="btn"
            onClick={() => {
              setTempSkuTerpilh();
              document.getElementById("picksingleinventoriesdialog").close();
            }}
          >
            Batal
          </button>
          <button className="btn" onClick={handleKonfirmasi}>
            Konfirmasi
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default PickSingleInventoriesDialog;
