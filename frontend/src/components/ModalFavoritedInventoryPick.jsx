import { getAllinventories } from "@/api/itemLibraryApi";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function ModalFavoritedInventoryPick({
  selectedSkus,
  setSelectedSkus,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedSkus, setLocalSelectedSkus] = useState([]);

  const { data: inventoryList } = useQuery({
    queryKey: ["inventories", { searchKey: "", page: 1, limit: 500 }],
    queryFn: (ctx) => getAllinventories(ctx),
  });

  const items = inventoryList?.data || inventoryList || [];

  useEffect(() => {
    setLocalSelectedSkus(selectedSkus || []);
  }, [selectedSkus]);

  const filteredList = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.sku?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  const handleToggleSku = (sku) => {
    if (localSelectedSkus.includes(sku)) {
      setLocalSelectedSkus(localSelectedSkus.filter((s) => s !== sku));
    } else {
      setLocalSelectedSkus([...localSelectedSkus, sku]);
    }
  };

  const handleSave = () => {
    setSelectedSkus(localSelectedSkus);
    document.getElementById("modalFavoritedInventoryPick").close();
  };

  return (
    <dialog id="modalFavoritedInventoryPick" className="modal">
      <div className="modal-box w-11/12 max-w-3xl">
        <h3 className="font-bold text-lg mb-1">Pilih SKU Tampil Gambar</h3>
        <p className="text-sm text-gray-500 mb-4">
          Pilih SKU dari Item Library yang menampilkan gambar di mobile
        </p>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Cari SKU atau deskripsi..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        {localSelectedSkus.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {localSelectedSkus.map((sku) => (
              <div key={sku} className="badge badge-primary gap-2 p-3">
                {sku}
                <button
                  type="button"
                  onClick={() => handleToggleSku(sku)}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredList?.map((item) => (
              <div
                key={item.sku}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  localSelectedSkus.includes(item.sku)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-base-200"
                }`}
                onClick={() => handleToggleSku(item.sku)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.sku}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary shrink-0"
                    checked={localSelectedSkus.includes(item.sku)}
                    onChange={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setLocalSelectedSkus(selectedSkus || []);
              document.getElementById("modalFavoritedInventoryPick").close();
            }}
          >
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Simpan
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
