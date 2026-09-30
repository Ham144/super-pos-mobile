import { Toaster } from "react-hot-toast";
import { Package, Package2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAllBrands } from "@/api/brandApi";
import { useQuery } from "@tanstack/react-query";
import { useFilter } from "@/store";

export default function ModalFilterByBrand({
  selectedBrand, //ids
  onConfirm,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [temporarySelected, setTemporarySelected] = useState([]);

  const { data: brandList } = useQuery({
    queryKey: ["brand"],
    queryFn: () => getAllBrands(),
  });

  useEffect(() => {
    setFilteredBrands(brandList?.data?.data);

    if (searchTerm) {
      setFilteredBrands(
        brandList?.data?.data?.filter((brand) =>
          brand.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [brandList, searchTerm]);

  const handlePickBrand = (brandId) => {
    if (temporarySelected?.includes(brandId)) {
      setTemporarySelected(temporarySelected?.filter((id) => id !== brandId));
    } else {
      setTemporarySelected([...temporarySelected, brandId]);
    }
  };

  const { filter } = useFilter();

  useEffect(() => {
    setTemporarySelected(filter.brandIds);
  }, [filter.brandIds]);

  return (
    <dialog id="modalFilterByBrand" className="modal">
      <Toaster />
      <div className=" w-11/12 max-w-3xl bg-base-100 shadow-xl ">
        <div className="flex items-center justify-between mb-6">
          <div className="flex p-5 rounded-md items-center gap-2">
            <Package2 className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-xl">Pilih Brand</h3>
          </div>
          <form method="dialog">
            <button
              onClick={() => {
                setTemporarySelected(selectedBrand);
                setSearchTerm("");
              }}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Tampilkan brand yang sudah dipilih */}
        {selectedBrand?.length > 0 && (
          <div className="px-5 mb-4">
            <div className="flex flex-wrap gap-2">
              {brandList?.data?.data
                ?.filter((brand) => temporarySelected?.includes(brand._id))
                .map((brand) => (
                  <div
                    key={brand._id}
                    className="flex items-center bg-primary/10 text-primary rounded px-2 py-1"
                  >
                    <span>{brand.name}</span>
                    <button
                      type="button"
                      className="ml-2 text-primary hover:text-red-500"
                      onClick={() => {
                        setTemporarySelected(
                          temporarySelected?.filter((id) => id !== brand._id)
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="px-5 mb-4">
          <div className="join w-full">
            <div className="join-item bg-base-200 px-3 flex items-center">
              <Search className="w-5 h-5 text-base-content/50" />
            </div>
            <input
              type="text"
              placeholder="Cari brand..."
              className="input input-bordered join-item w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          <table className="table table-zebra w-full">
            {/* head */}
            <thead className="sticky top-0 bg-base-100">
              <tr className="bg-base-200">
                <th className="text-center">No</th>
                <th>Brand</th>
                <th className="text-center">Total SKU</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands?.map((brand, index) => (
                <tr key={brand._id} className="hover:bg-base-200">
                  <td className="text-center">{index + 1}</td>
                  <td className="font-medium">{brand?.name}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="w-4 h-4 text-primary" />
                      {brand?.skuList?.length}
                    </div>
                  </td>
                  <td className="text-center">
                    <button
                      className={`${
                        temporarySelected?.includes(brand._id)
                          ? "bg-green-500 text-white"
                          : ""
                      } btn`}
                      onClick={() => handlePickBrand(brand?._id)}
                    >
                      {temporarySelected?.includes(brand._id) ? (
                        <span className="bg-green-500 text-white rounded-md">
                          Terpilih
                        </span>
                      ) : (
                        <Package className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-action flex justify-end p-2">
          <form method="dialog" className="flex gap-2">
            <button
              onClick={() => {
                setTemporarySelected(selectedBrand);
                setSearchTerm("");
                document.getElementById("modalFilterByBrand")?.close();
              }}
              className="btn btn-ghost"
            >
              Tutup
            </button>
            <button
              onClick={() => onConfirm(temporarySelected)}
              className="btn btn-primary"
            >
              Konfirmasi Filter Brand
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
