import { useQuery } from "@tanstack/react-query";
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { getAllAccount } from "../api/authApi";
import { FileWarningIcon, Search, X } from "lucide-react";

const ModalPickKasir = forwardRef(({ callback, currentSelected = [] }, ref) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelection, setLocalSelection] = useState([]);

  // Initialize local selection from props
  useEffect(() => {
    if (Array.isArray(currentSelected)) {
      setLocalSelection(currentSelected);
    } else {
      setLocalSelection([]);
    }
  }, [currentSelected]);

  // Expose reset method via ref
  useImperativeHandle(ref, () => ({
    resetModal: () => {
      setLocalSelection([]);
      setSearchTerm("");
    },
  }));

  // tanstack
  const { data: userList, isLoading } = useQuery({
    queryKey: ["user", "kasir"],
    queryFn: () => getAllAccount(),
  });

  // Filter users based on search term
  const filteredUsers = userList?.data?.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle selecting/deselecting a user
  const toggleUserSelection = (user) => {
    setLocalSelection((prev) => {
      if (prev.includes(user._id)) {
        return prev.filter((id) => id !== user._id);
      } else {
        return [...prev, user._id];
      }
    });
  };

  // Apply selections when done
  const applySelections = () => {
    // Kirim seluruh array ID kasir yang dipilih
    callback(localSelection);

    // Tutup modal
    document.getElementById("pickKasir").close();
  };

  return (
    <dialog id="pickKasir" className="modal">
      <div className="relative w-11/12 md:w-3/4 lg:w-1/2 xl:w-1/3 bg-white p-4 rounded-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Pilih Kasir</h3>
          <button
            onClick={() => {
              setLocalSelection([]);
              setSearchTerm("");
              document.getElementById("pickKasir").close();
            }}
            className="btn btn-sm btn-circle"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Box */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Cari kasir berdasarkan nama atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* User count badge */}
        <div className="mb-2">
          <span className="text-sm text-gray-600">
            {localSelection.length} kasir dipilih
          </span>
        </div>

        {/* User List */}
        <div className="overflow-y-auto flex-grow mb-4 border rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-gray-500">
              Tidak ada kasir yang ditemukan
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Nama</th>
                  <th className="px-4 py-2 text-center w-16">Pilih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers?.map((user) => (
                  <tr
                    key={user._id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      localSelection.includes(user._id) ? "bg-primary/5" : ""
                    }`}
                    onClick={() => toggleUserSelection(user)}
                  >
                    <td className="px-4 py-2">{user.username || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={localSelection.includes(user._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleUserSelection(user);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex  space-x-2 pt-2 border-t">
          <button
            className="btn btn-outline"
            onClick={() => {
              setLocalSelection([]);
              setSearchTerm("");
              document.getElementById("pickKasir").close();
            }}
          >
            Batal
          </button>
          <button
            className="btn btn-primary text-secondary"
            onClick={applySelections}
          >
            Terapkan ({localSelection.length})
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default ModalPickKasir;
