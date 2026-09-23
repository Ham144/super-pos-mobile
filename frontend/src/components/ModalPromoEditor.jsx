import React from "react";
import { Check, CheckCircle2, Trash2, X, BadgeHelp } from "lucide-react";
import { toast } from "react-hot-toast";
import FilterInventories from "./filterInventories";

const ModalPromoEditor = ({
  selectedPromo,
  promoBaru,
  editingPromo,
  setSelectedPromo,
  setPromoBaru,
  handleKonfirmasiTerhubung,
  handleUpdatePromo,
  handleRegisterPromo,
  outletExtractor,
  outletList,
  setTempPickTerhubung,
  setShowPemilihanTerhubung,
  setEditingTerhubungItem,
  inventoriList,
  ShowpemilihanTerhubung,
  filter,
  setFilter,
}) => {
  const closeEditor = () => {
    setSelectedPromo(null);
    setPromoBaru(null);
    document.getElementById("promoEditor")?.close();
  };

  return (
    <dialog id="promoEditor" className="modal">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto p-0">
      {/* Header Section */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-20">
        <h2 className="text-xl font-semibold">
          {selectedPromo ? "Edit Promo" : "Buat Promo"}
        </h2>
        <div className="flex justify-between items-center mt-4 gap-3">
          {editingPromo && (
            <button
              type="button"
              className="flex items-center px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors flex-1 justify-center"
              onClick={() => {
                setSelectedPromo(selectedPromo);
                document.getElementById("modal_confirmation").showModal();
              }}
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Hapus
            </button>
          )}
          <button
            type="button"
            className="flex flex-1 items-center px-4 py-2 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors justify-center"
            onClick={closeEditor}
          >
            <X className="w-5 h-5 mr-2" />
            Batal
          </button>
          <button
            type="button"
            className="flex flex-1 items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-green-50 transition-colors justify-center"
            onClick={
              editingPromo
                ? () => handleUpdatePromo(selectedPromo)
                : handleRegisterPromo
            }
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {editingPromo ? "Update" : "Register"}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="overflow-y-auto flex-1 p-6">
        <div className="space-y-5">
          {/* Judul Promo */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Judul Promo
            </label>
            <input
              type="text"
              id="judulPromo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
              value={
                editingPromo
                  ? selectedPromo?.judulPromo
                  : promoBaru?.judulPromo
              }
              onChange={(e) =>
                editingPromo
                  ? setSelectedPromo((prev) => ({
                      ...prev,
                      judulPromo: e.target.value,
                    }))
                  : setPromoBaru((prev) => ({
                      ...prev,
                      judulPromo: e.target.value,
                    }))
              }
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-3 text-lg">
              Pilih Jenis Mode triger Promo
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Simple Total Mode */}
              <div
                className="tooltip tooltip-top"
                data-tip="Promo berdasarkan keseluruhan invoice"
                onClick={(e) => {
                  if (selectedPromo) {
                    if (
                      selectedPromo?.skuList?.length ||
                      promoBaru?.skuList?.length
                    ) {
                      const yes = confirm(
                        "Mengganti mode dari particular ke simple_total akan menghapus sku terhubung karena hal itu tidak diperlukan, konfirmasi?",
                      );
                      if (yes) {
                        setSelectedPromo((pre) => ({
                          ...pre,
                          skuList: [],
                          mode: "simple_total",
                        }));
                      } else {
                        e.preventDefault();
                        return;
                      }
                    } else {
                      setSelectedPromo((pre) => ({
                        ...pre,
                        mode: "simple_total",
                      }));
                    }
                  } else {
                    setPromoBaru((pre) => ({
                      ...pre,
                      mode: "simple_total",
                    }));
                  }
                }}
              >
                <div
                  className={`w-full py-4 px-5 rounded-xl border-2 font-semibold transition-all duration-300 cursor-pointer ${
                    selectedPromo?.mode === "simple_total" ||
                    promoBaru?.mode === "simple_total"
                      ? "bg-gradient-to-r from-blue-600 to-blue-950 text-white shadow-lg border-blue-700 transform scale-[1.02]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {(selectedPromo?.mode === "simple_total" ||
                      promoBaru?.mode === "simple_total") && <Check />}
                    Simple Total
                  </div>
                </div>
              </div>

              {/* Particular Mode */}
              <div
                className="tooltip tooltip-top"
                data-tip="Promo berdasarkan per item"
                onClick={() => {
                  editingPromo
                    ? setSelectedPromo((pre) => ({
                        ...pre,
                        mode: "particular",
                      }))
                    : setPromoBaru((pre) => ({
                        ...pre,
                        mode: "particular",
                      }));
                }}
              >
                <div
                  className={`w-full py-4 px-5 rounded-xl border-2 font-semibold transition-all duration-300 cursor-pointer ${
                    selectedPromo?.mode === "particular" ||
                    promoBaru?.mode === "particular"
                      ? "bg-gradient-to-r from-blue-600 to-blue-950 text-white shadow-lg border-blue-700 transform scale-[1.02]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {(selectedPromo?.mode === "particular" ||
                      promoBaru?.mode === "particular") && <Check />}
                    Particular
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-950 rounded-r-lg p-4 transition-all duration-300">
              {selectedPromo?.mode === "simple_total" ||
              promoBaru?.mode === "simple_total" ? (
                <p className="text-gray-700">
                  <span className="font-semibold text-blue-600">
                    Mode simple_total:
                  </span>{" "}
                  Promo ini diaktifkan berdasarkan total keseluruhan dalam satu
                  invoice. Sistem hanya menghitung total keseluruhan
                  belanja/invoice (bukan per item). Jika syarat promo terpenuhi,
                  maka promo akan muncul dan hanya satu promo ini yang berlaku
                  per invoice.
                </p>
              ) : (
                <p className="text-gray-700">
                  <span className="font-semibold text-blue-600">
                    Mode particular:
                  </span>
                  Promo diaktifkan berdasarkan item-item tertentu. Contoh:
                  Walaupun total belanja memenuhi syarat promo, jika tidak ada
                  item yang memenuhi syarat maka promo gagal. Kelebihan mode
                  ini adalah promo bisa berlaku lebih dari sekali jika beberapa
                  item memenuhi syarat.
                </p>
              )}
            </div>
          </div>

          {/* SKU Terkait */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-700">
                SKU Barang Terkait
              </label>
              <div className="dropdown dropdown-hover">
                <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                  Tambah pengecekan inventory? jika outlet terhubung ke promo
                  ini tapi sku tidak terdaftar di sku barang terkait, maka
                  batal.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="sku"
                disabled
                className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                value={
                  selectedPromo?.skuList?.length || promoBaru?.skuList?.length
                    ? selectedPromo?.skuList?.join(",") ||
                      promoBaru?.skuList?.join(",")
                    : "Semua Barang"
                }
                readOnly
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => {
                  if (
                    selectedPromo?.mode === "simple_total" ||
                    promoBaru?.mode === "simple_total"
                  ) {
                    toast.error(
                      "Tidak Boleh menambahkan sku dalam mode ini",
                    );
                    return;
                  }
                  document.getElementById("pickterkait").showModal();
                }}
              >
                Pilih
              </button>
            </div>
          </div>

          {/* Outlet Berlaku */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Outlet Berlaku
              </label>
              <div className="dropdown dropdown-hover">
                <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                  Tambah pengecekan outlet? jika barang triger promo ini tapi
                  outlet tidak terdaftar di outlet berlaku promo ini, maka
                  batal
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="outlet"
                disabled
                className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                value={outletExtractor(
                  selectedPromo?.authorizedOutlets ||
                    promoBaru?.authorizedOutlets,
                  outletList?.data || [],
                )}
                readOnly
              />

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => {
                  document.getElementById("pickmultioutlet").showModal();
                }}
              >
                Pilih
              </button>
            </div>
          </div>

          {/* Kuota */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Kuota
            </label>
            <input
              type="number"
              id="quantityBerlaku"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
              value={
                selectedPromo?._id
                  ? selectedPromo?.quantityBerlaku || 0
                  : promoBaru?.quantityBerlaku || 0
              }
              onChange={(e) =>
                selectedPromo
                  ? setSelectedPromo((prev) => ({
                      ...prev,
                      quantityBerlaku: parseInt(e.target.value),
                    }))
                  : setPromoBaru((prev) => ({
                      ...prev,
                      quantityBerlaku: parseInt(e.target.value),
                    }))
              }
            />
          </div>

          {/* Periode Berlaku */}
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Berlaku Dari
              </label>
              <input
                type="date"
                id="berlakuDari"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                value={
                  selectedPromo
                    ? selectedPromo?.berlakuDari
                      ? new Date(selectedPromo?.berlakuDari)
                          .toISOString()
                          .split("T")[0]
                      : ""
                    : promoBaru?.berlakuDari
                      ? new Date(promoBaru?.berlakuDari)
                          .toISOString()
                          .split("T")[0]
                      : ""
                }
                onChange={(e) =>
                  editingPromo
                    ? setSelectedPromo((prev) => ({
                        ...prev,
                        berlakuDari: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      }))
                    : setPromoBaru((prev) => ({
                        ...prev,
                        berlakuDari: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      }))
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Berlaku Hingga
              </label>
              <input
                type="date"
                id="berlakuHingga"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                value={
                  selectedPromo
                    ? selectedPromo?.berlakuHingga
                      ? new Date(selectedPromo?.berlakuHingga)
                          .toISOString()
                          .split("T")[0]
                      : ""
                    : promoBaru?.berlakuHingga
                      ? new Date(promoBaru?.berlakuHingga)
                          .toISOString()
                          .split("T")[0]
                      : ""
                }
                min={
                  selectedPromo?.berlakuDari
                    ? new Date(selectedPromo?.berlakuDari)
                        .toISOString()
                        .split("T")[0]
                    : promoBaru?.berlakuDari
                      ? new Date(promoBaru?.berlakuDari)
                          .toISOString()
                          .split("T")[0]
                      : ""
                }
                onChange={(e) =>
                  editingPromo
                    ? setSelectedPromo((prev) => ({
                        ...prev,
                        berlakuHingga: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      }))
                    : setPromoBaru((prev) => ({
                        ...prev,
                        berlakuHingga: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      }))
                }
              />
            </div>
          </div>

          {/* Jenis Syarat */}
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Jenis Syarat
              </label>
            </div>

            {(editingPromo
              ? selectedPromo?.syaratQuantity
              : promoBaru?.syaratQuantity) !== null ? (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Minimal Quantity
                </label>
                <input
                  type="number"
                  id="syaratQuantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                  min={1}
                  value={
                    (editingPromo && selectedPromo?.syaratQuantity) ||
                    (promoBaru && promoBaru?.syaratQuantity) ||
                    ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || !isNaN(value)) {
                      const intValue = value ? parseInt(value, 10) : "";
                      if (editingPromo) {
                        setSelectedPromo((prev) => ({
                          ...prev,
                          syaratQuantity: intValue,
                        }));
                      } else {
                        setPromoBaru((prev) => ({
                          ...prev,
                          syaratQuantity: intValue,
                        }));
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Minimal Total Harga (Rp)
                </label>
                <input
                  type="number"
                  id="syaratTotalRp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
                  min={0}
                  value={
                    editingPromo
                      ? selectedPromo?.syaratTotalRp || ""
                      : promoBaru?.syaratTotalRp || ""
                  }
                  onChange={(e) =>
                    editingPromo
                      ? setSelectedPromo((prev) => ({
                          ...prev,
                          syaratTotalRp: e.target.value,
                        }))
                      : setPromoBaru((prev) => ({
                          ...prev,
                          syaratTotalRp: e.target.value,
                        }))
                  }
                />
              </div>
            )}
            <select
              id="syaratType"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
              value={
                editingPromo
                  ? selectedPromo?.syaratQuantity
                    ? "quantity"
                    : "total"
                  : promoBaru?.syaratQuantity
                    ? "quantity"
                    : "total"
              }
              onChange={(e) => {
                const isQuantity = e.target.value === "quantity";
                if (editingPromo) {
                  setSelectedPromo((prev) => ({
                    ...prev,
                    syaratQuantity: isQuantity ? 1 : null,
                    syaratTotalRp: isQuantity ? null : 0,
                  }));
                } else {
                  setPromoBaru((prev) => ({
                    ...prev,
                    syaratQuantity: isQuantity ? 1 : null,
                    syaratTotalRp: isQuantity ? null : 0,
                  }));
                }
              }}
            >
              <option value="quantity">Berdasarkan Quantity</option>
              <option value="total">Berdasarkan Total Harga</option>
            </select>
          </div>

          {/* SKU Barang Bonus */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-700">
                SKU Barang Bonus
              </label>
              <div className="dropdown dropdown-hover">
                <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-64 text-xs text-gray-600">
                  Barang Gratis yang diberikan jika memenuhi syarat (bisa
                  diganti ditengah transaksi di aplikasi)
                </div>
              </div>
            </div>
            <input
              type="text"
              id="skuBarangBonus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
              value={
                selectedPromo?.skuBarangBonus || promoBaru?.skuBarangBonus || ""
              }
              onChange={(e) =>
                editingPromo
                  ? setSelectedPromo((prev) => ({
                      ...prev,
                      skuBarangBonus: e.target.value,
                    }))
                  : setPromoBaru((prev) => ({
                      ...prev,
                      skuBarangBonus: e.target.value,
                    }))
              }
              onClick={() =>
                document.getElementById("pickbonus").showModal()
              }
            />
          </div>

          {/* Quantity Bonus */}
          <div className="flex flex-col">
            <label className="text-sm flex items-center gap-x-2 font-medium text-gray-700 mb-1">
              Quantity Bonus
              <div className="dropdown dropdown-hover">
                <BadgeHelp className="text-gray-400 hover:text-gray-600" />
                <div className="dropdown-content z-[1] p-2 shadow bg-white rounded-md w-52 text-xs text-gray-600">
                  Quantity barang bonus yang didapat (default: 1)
                </div>
              </div>
            </label>

            <input
              type="number"
              id="quantityBonus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-950 focus:border-blue-950"
              min={1}
              value={
                selectedPromo?.quantityBonus || promoBaru?.quantityBonus || 1
              }
              onChange={(e) =>
                editingPromo
                  ? setSelectedPromo((prev) => ({
                      ...prev,
                      quantityBonus: parseInt(e.target.value),
                    }))
                  : setPromoBaru((prev) => ({
                      ...prev,
                      quantityBonus: parseInt(e.target.value),
                    }))
              }
            />
            <span className="text-xs text-gray-500 mt-1">
              Bisa diganti diaplikasi mobile{" "}
            </span>
          </div>
        </div>
      </div>

      {/* Product Selection Section */}
      {ShowpemilihanTerhubung && (
        <div className="flex flex-col h-full p-4">
          <h2 className="font-bold text-center mb-4 text-gray-700">
            Pilih produk untuk implementasi promo ini
          </h2>

          <div
            className="overflow-y-auto flex-grow"
            style={{ maxHeight: "700px" }}
          >
            <div className="sticky top-0 bg-white z-10 pb-2">
              <FilterInventories
                onChange={(value) => {
                  setFilter({ ...filter, searchKey: value.searchKey });
                }}
              />
            </div>
            <table className="table w-full border-collapse">
              <thead className="sticky top-12 bg-white">
                <tr className="text-left">
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Deskripsi</th>
                  <th className="px-4 py-2">Harga Dasar</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Terpilih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoriList?.data?.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{item.sku}</td>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2">
                      {item.RpHargaDasar?.$numberDecimal}
                    </td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">
                      {(
                        (editingPromo
                          ? selectedPromo?.skuList
                          : promoBaru?.skuList) || []
                      ).includes(item.sku) ? (
                        <button
                          onClick={() => {
                            if (editingPromo) {
                              setSelectedPromo((prev) => ({
                                ...prev,
                                skuList: prev.skuList.filter(
                                  (sku) => sku !== item.sku,
                                ),
                              }));
                            } else {
                              setPromoBaru((prev) => ({
                                ...prev,
                                skuList: prev.skuList.filter(
                                  (sku) => sku !== item.sku,
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        >
                          Terpilih
                        </button>
                      ) : (
                        <button
                          className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (editingPromo) {
                              setSelectedPromo((prev) => ({
                                ...prev,
                                skuList: [
                                  ...(prev.skuList || []),
                                  item.sku,
                                ],
                              }));
                            } else {
                              setPromoBaru((prev) => ({
                                ...prev,
                                skuList: [
                                  ...(prev.skuList || []),
                                  item.sku,
                                ],
                              }));
                            }
                          }}
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

          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 pb-2">
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex-1"
              onClick={() => {
                setTempPickTerhubung();
                setShowPemilihanTerhubung(false);
                setEditingTerhubungItem();
              }}
            >
              Batal
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-1"
              onClick={handleKonfirmasiTerhubung}
            >
              Simpan
            </button>
          </div>
        </div>
      )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={closeEditor}>
          close
        </button>
      </form>
    </dialog>
  );
};

export default ModalPromoEditor;
