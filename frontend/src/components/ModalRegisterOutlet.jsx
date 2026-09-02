import { Package } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function ModalRegisterOutlet({
  newOutletForm,
  setNewOutletForm,
  handleRegisterOutlet,
  resetNewOutletForm,
  brandList,
  spgList,
}) {
  return (
    <>
      {/* Modal untuk Register Outlet Baru */}
      <dialog id="newoutlet" className="modal">
        <Toaster />
        <div className="modal-box relative">
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              handleRegisterOutlet(newOutletForm);
            }}
            className="space-y-6"
          >
            <div className="sticky top-0 flex justify-between bg-white rounded-md shadow-md p-5">
              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={() => document.getElementById("newoutlet").close()}
                className="btn btn-sm btn-circle btn-ghost absolute right-2 "
              >
                ✕
              </button>
              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetNewOutletForm();
                    document.getElementById("newoutlet").close();
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Simpan
                </button>
              </div>
              <span className="text-sm text-gray-500 px-2">
                Konfigurasi lebih lanjut dapat dilakukan dengan mengedit outlet
              </span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Kode Outlet (NAV Location) */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Kode Outlet (NAV Location)
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  value={newOutletForm?.kodeOutlet || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      kodeOutlet: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Contoh: SRNG_JUAL"
                />
              </div>

              {/* Mode Operasi */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Mode Operasi Mobile
                </label>
                <select
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={newOutletForm?.mode || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      mode: e.target.value,
                    })
                  }
                >
                  <option value="">— Pilih mode —</option>
                  <option value="offline">Offline</option>
                  <option value="stateless">Stateless (NAV real-time)</option>
                </select>
              </div>

              {/* Nama Outlet */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Nama Outlet
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.namaOutlet || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      namaOutlet: e.target.value,
                    })
                  }
                  placeholder="Masukkan nama outlet"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Deskripsi
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.description || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Masukkan deskripsi outlet"
                />
              </div>
              {/* Nama Perusahaan */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.namaPerusahaan || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      namaPerusahaan: e.target.value,
                    })
                  }
                  placeholder="Masukkan nama perusahaan"
                />
              </div>
              {/* Alamat */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Alamat
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.alamat || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      alamat: e.target.value,
                    })
                  }
                  placeholder="Masukkan alamat"
                />
              </div>
              {/* NPWP */}
              <div>
                <label className="block font-semibold text-gray-700">
                  NPWP
                </label>
                <input
                  type="text"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.npwp || ""}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      npwp: e.target.value,
                    })
                  }
                  placeholder="Masukkan NPWP"
                />
              </div>

              {/* Periode Settlement */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Periode Settlement (hari)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.periodeSettlement || 1}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      periodeSettlement: parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="Masukkan periode settlement dalam hari"
                />
              </div>

              {/* Jam Settlement */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Jam Settlement
                </label>
                <input
                  type="time"
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newOutletForm?.jamSettlement || "00:00"}
                  onChange={(e) =>
                    setNewOutletForm({
                      ...newOutletForm,
                      jamSettlement: e.target.value,
                    })
                  }
                />
              </div>

              {/* Brand Terpilih */}
              {
                newOutletForm?.mode === "offline" && (
                  <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Brand</span>
                </label>
                <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-lg">
                  {brandList?.data?.data
                    ?.filter((brand) =>
                      newOutletForm?.brandIds?.includes(brand._id),
                    )
                    .map((brand) => (
                      <div
                        key={brand._id}
                        className="flex items-center bg-primary/10 text-primary rounded px-2 py-1"
                      >
                        <span>{brand.name}</span>
                        <button
                          type="button"
                          className="ml-2 text-primary hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewOutletForm((prev) => ({
                              ...prev,
                              brandIds: prev.brandIds.filter(
                                (id) => id !== brand._id,
                              ),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  <button
                    type="button"
                    className="text-primary hover:bg-primary/10 rounded px-2 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("modalBrandPick").showModal();
                    }}
                  >
                    <Package className="w-4 h-4" />
                    Tambah Brand
                  </button>
                </div>
              </div>
                )
              }

              <label
                htmlFor="kasir"
                className="block font-semibold text-gray-700"
              >
                Kasir List
              </label>
              <p className="text-sm badge p-6 text-wrap w-full font-semibold text-gray-600 mb-4 font-mono">
                Assign dengan mengedit outlet
              </p>

              {/* new spglist field */}
              <label
                htmlFor="spg"
                className="block font-semibold text-gray-700"
              >
                Spg List
              </label>
              <p className="text-sm badge p-6 text-wrap w-full font-semibold text-gray-600 mb-4 font-mono">
                Assign dengan mengedit outlet
              </p>
              {/* Logo */}
              <div>
                <label className="block font-semibold text-gray-700">
                  Logo Outlet
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border px-4 py-2 rounded-lg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setNewOutletForm({
                          ...newOutletForm,
                          logo: reader.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {/* Preview Logo */}
                {newOutletForm?.logo && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-600">
                      Preview Logo:
                    </p>
                    <img
                      src={newOutletForm.logo}
                      alt="Preview Logo"
                      className="mt-2 w-32 h-32 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
