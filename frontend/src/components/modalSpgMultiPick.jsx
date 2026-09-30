import { getAllSpg } from "@/api/spgApi";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function ModalSpgMultiPick({
  selectedSpgIds,
  setSelectedSpgIds,
  selectedOutletObj,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedSpgIds, setLocalSelectedSpgIds] = useState([]);

  const { data: spgList } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  // Sync local state with props when modal opens
  useEffect(() => {
    setLocalSelectedSpgIds(selectedSpgIds);
  }, [selectedSpgIds]);

  const filteredSpgList = spgList?.data?.filter((spg) =>
    spg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSpg = (spgId) => {
    if (localSelectedSpgIds.includes(spgId)) {
      setLocalSelectedSpgIds(localSelectedSpgIds.filter((id) => id !== spgId));
    } else {
      setLocalSelectedSpgIds([...localSelectedSpgIds, spgId]);
    }
  };

  const handleSave = () => {
    setSelectedSpgIds(localSelectedSpgIds);
    document.getElementById("modalSpgPick").close();
  };

  return (
    <dialog id="modalSpgPick" className="modal">
      <div className="modal-box w-11/12 max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Pilih SPG</h3>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Cari SPG..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        {/* Selected SPG Tags */}
        {localSelectedSpgIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {spgList?.data
              ?.filter((spg) => localSelectedSpgIds.includes(spg._id))
              .map((spg) => (
                <div key={spg._id} className="badge badge-primary gap-2 p-3">
                  {spg.name}
                  <button
                    onClick={() => handleSelectSpg(spg._id)}
                    className="btn btn-ghost btn-xs btn-circle"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* SPG List */}
        <div className="max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredSpgList?.map((spg) => (
              <div
                key={spg._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  localSelectedSpgIds.includes(spg._id)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-base-200"
                }`}
                onClick={() => handleSelectSpg(spg._id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{spg.name}</p>
                    <p className="text-sm text-gray-500">{spg.phone}</p>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={localSelectedSpgIds.includes(spg._id)}
                    onChange={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={() => {
              setLocalSelectedSpgIds(selectedSpgIds); // Reset to original selection
              document.getElementById("modalSpgPick").close();
            }}
          >
            Batal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Simpan
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
