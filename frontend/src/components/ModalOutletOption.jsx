import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOuletList } from "@/api/outletApi";

export default function ModalOutletOption({
  authorizedOutlets = [],
  onSubmit,
}) {
  const { data: outletList } = useQuery({
    queryKey: ["outlet"],
    queryFn: () => getOuletList(),
  });

  const [selectedOutletIds, setSelectedOutletIds] = useState([]);

  useEffect(() => {
    setSelectedOutletIds(authorizedOutlets); // sync initial selection
  }, [authorizedOutlets]);

  const toggleSelect = (id) => {
    setSelectedOutletIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <dialog id="pickmultioutlet" className="modal absolute">
      <div className="modal-box relative pb-10 w-full max-w-4xl">
        <h2 className="font-bold text-center mb-4">
          Pilih outlet untuk promo ini
        </h2>

        <div className="overflow-y-auto" style={{ maxHeight: "700px" }}>
          <table className="table w-full">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th>Kode Outlet</th>
                <th>Nama Outlet</th>
                <th>Nama Perusahaan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {outletList?.data?.map((item) => (
                <tr key={item._id}>
                  <td>{item.kodeOutlet}</td>
                  <td>{item.namaOutlet}</td>
                  <td>{item.namaPerusahaan}</td>
                  <td>
                    {selectedOutletIds.includes(item._id) ? (
                      <button
                        onClick={() => toggleSelect(item._id)}
                        className="btn btn-sm bg-green-500 hover:bg-green-600 text-white"
                      >
                        Terpilih
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleSelect(item._id)}
                        className="btn btn-sm"
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

        <div className="flex gap-x-3 sticky bottom-0 mt-4 bg-white pt-4">
          <button
            className="btn rounded flex-1 shadow-md btn-primary text-white"
            onClick={() => {
              onSubmit(selectedOutletIds);
              document.getElementById("pickmultioutlet").close();
            }}
          >
            Simpan
          </button>
        </div>
      </div>
    </dialog>
  );
}
