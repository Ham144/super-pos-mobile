import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef, useEffect } from "react";
import {
  assignSpgToOutlet,
  assignFavoritedInventoryToOutlet,
  getFavoritedInventorySkus,
  assignUserToOutlet,
  deleteOutlet,
  editOutlet,
  getOuletList,
  registerOutlet,
} from "../api/outletApi";
import ModalOutletEdit from "@/components/ModalOutletEdit";
import {
  Plus,
  Settings2,
  ShieldQuestion,
  Store,
  Shield,
  BadgeInfo,
  ShieldOff,
} from "lucide-react";

import toast from "react-hot-toast";
import ModalPickKasir from "../components/ModalPickKasir";
import { getAllAccount } from "@/api/authApi";
import ModalConfirmation from "../components/ModalConfirmation";
import ModalBrandPick from "@/components/ModalBrandPick";
import { getAllBrands } from "@/api/brandApi";
import ModalRegisterOutlet from "@/components/ModalRegisterOutlet";
import ModalConfirmation2 from "@/components/ModalConfirmation2";
import ModalSpgMultiPick from "@/components/modalSpgMultiPick";
import ModalFavoritedInventoryPick from "@/components/ModalFavoritedInventoryPick";
import { getAllSpg } from "@/api/spgApi";

const Outlet = () => {
  const [selectedOutlet, setSelectedOutlet] = useState();
  const initialNewOutletForm = {
    kodeOutlet: "",
    namaOutlet: "",
    description: "",
    mode: "",
    kasirList: [],
  };
  const [newOutletForm, setNewOutletForm] = useState(initialNewOutletForm);
  const modalPickKasirRef = useRef();
  const [outletToDelete, setOutletToDelete] = useState(null);
  const [selectedSpgIds, setSelectedSpgIds] = useState([]);
  const [selectedFavoritedSkus, setSelectedFavoritedSkus] = useState([]);

  //tanstack
  const queryClient = useQueryClient();
  const { data: outletList, refetch: refetchOutlets } = useQuery({
    queryFn: getOuletList,
    queryKey: ["outlet"],
  });
  const { data: userList } = useQuery({
    queryFn: getAllAccount,
    queryKey: ["user", "kasir"],
  });
  const { data: brandList } = useQuery({
    queryKey: ["brand"],
    queryFn: getAllBrands,
  });
  const { data: spgList } = useQuery({
    queryKey: ["spg"],
    queryFn: getAllSpg,
  });

  useEffect(() => {
    // Refetch outlet list ketika selectedOutlet berubah
    if (selectedOutlet) {
      refetchOutlets();
    }
  }, [selectedOutlet, refetchOutlets]);

  useEffect(() => {
    if (!selectedOutlet?._id) {
      setSelectedFavoritedSkus([]);
      return;
    }
    getFavoritedInventorySkus(selectedOutlet._id)
      .then((res) => setSelectedFavoritedSkus(res?.data?.skus || []))
      .catch(() => setSelectedFavoritedSkus([]));
  }, [selectedOutlet?._id]);

  const { mutateAsync: handleEditOutlet, isPending: isSavingOutlet } =
    useMutation({
      mutationFn: async (body) => {
        const kasirList = [...(body.kasirList || [])];
        const { kasirList: _, ...outletData } = body;

        await editOutlet(outletData);

        if (kasirList?.length > 0) {
          const assignPromises = kasirList.map((kasirId) =>
            assignUserToOutlet(kasirId, body._id),
          );
          await Promise.all(assignPromises);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries(["outlet"]);
      },
      onError: (err) => {
        throw err;
      },
    });

  const { mutateAsync: handleAssignSpgToOutlet } = useMutation({
    mutationFn: async ({ spgIds, outletId }) => {
      return await assignSpgToOutlet(spgIds, outletId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["outlet", "spg"]);
      toast.success("Berhasil menambahkan spg ke outlet");
      document.getElementById("modalSpgPick").close();
    },
    onError: (err) => {
      toast.error(err.response.data.message);
    },
  });

  const { mutateAsync: handleAssignFavoritedInventory } = useMutation({
    mutationFn: async ({ skus, outletId }) => {
      return await assignFavoritedInventoryToOutlet(skus, outletId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["outlet"]);
      setSelectedFavoritedSkus(res?.data?.skus || []);
      setSelectedOutlet((prev) =>
        prev
          ? {
              ...prev,
              favoritedInventoryIds: res?.data?.favoritedInventoryIds || [],
            }
          : prev,
      );
      toast.success(res?.message || "Berhasil menyimpan SKU tampil gambar");
      document.getElementById("modalFavoritedInventoryPick")?.close();
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.data?.missingSkus?.length
          ? `SKU tidak terdaftar: ${err.response.data.missingSkus.join(", ")}`
          : "Gagal menyimpan SKU tampil gambar");
      toast.error(msg);
    },
  });

  const { mutateAsync: handleRegisterOutlet } = useMutation({
    mutationFn: async (body) => {
      // Simpan daftar kasir sebelum create
      const kasirList = [...(body.kasirList || [])];

      // Hapus kasirList dari body yang dikirim ke API
      const { kasirList: _, ...outletData } = body;

      // Create outlet tanpa kasirList
      const response = await registerOutlet(outletData);

      // Assign kasir ke outlet baru
      if (kasirList?.length > 0 && response?.data?._id) {
        const assignPromises = kasirList?.map(async (kasirId) => {
          return await assignUserToOutlet(kasirId, response.data._id);
        });
        await Promise.all(assignPromises);
      }

      return response;
    },
    mutationKey: ["outlet"],
    onSuccess: () => {
      queryClient.invalidateQueries(["outlet"]);
      toast.success("Berhasil membuat outlet");
      setNewOutletForm(initialNewOutletForm);
      document.getElementById("newoutlet").close();
    },
    onError: (error) => {
      toast.error(error.response.data.message);
    },
  });

  const { mutateAsync: handleDeleteOutlet } = useMutation({
    mutationFn: (_id) => deleteOutlet(_id),
    mutationKey: ["outlet"],
    onSuccess: () => {
      queryClient.invalidateQueries(["outlet"]);
      toast.success("Berhasil menghapus outlet");
      setSelectedOutlet(null);
      document.getElementById("modalOutletEdit")?.close();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Mungkin anda tidak memiliki akses",
      );
    },
  });

  const [ambiguKasir, setAmbiguKasir] = useState([]);
  const [selectedKasirIds, setSelectedKasirIds] = useState([]);

  const beforeHandleSelectKasir = (kasirIds) => {
    // Simpan kasir IDs dari modal ke state
    setSelectedKasirIds(kasirIds);

    // Cek apakah ada kasir yang sudah berada di outlet lain
    const usersInOtherOutlets = [];

    // Loop untuk mencari kasir yang sudah terdaftar di outlet lain
    kasirIds.forEach((kasirId) => {
      const isUserInOtherOutlet = outletList?.data.some(
        (outlet) =>
          (selectedOutlet ? outlet._id !== selectedOutlet._id : true) &&
          outlet.kasirList &&
          outlet.kasirList.includes(kasirId),
      );

      if (isUserInOtherOutlet) {
        // Tambahkan username ke list untuk ditampilkan di konfirmasi
        const user = userList?.data?.find((u) => u._id === kasirId);
        if (user?.username) {
          usersInOtherOutlets.push(user.username);
        }
      }
    });

    if (usersInOtherOutlets?.length > 0) {
      // Tampilkan modal konfirmasi jika ada konflik
      setAmbiguKasir(usersInOtherOutlets);
      document.getElementById("modal_confirmation2").showModal();
    } else {
      // Jika tidak ada konflik, langsung update state
      handleKasirSelection();
    }
  };

  // Fungsi untuk menerapkan pilihan kasir (tanpa API call)
  const handleKasirSelection = () => {
    if (!selectedKasirIds?.length) return;

    if (selectedOutlet) {
      // Update state untuk outlet yang sudah ada
      setSelectedOutlet((prev) => ({
        ...prev,
        kasirList: selectedKasirIds,
      }));
    } else {
      // Update state untuk outlet baru
      setNewOutletForm((prev) => ({
        ...prev,
        kasirList: selectedKasirIds,
      }));
    }

    // Bersihkan state setelah selesai
    setSelectedKasirIds([]);
    setAmbiguKasir([]);
  };

  const handleEditClick = (outlet) => {
    setSelectedOutlet({ ...outlet });
    requestAnimationFrame(() => {
      document.getElementById("modalOutletEdit")?.showModal();
    });
  };

  // Function to reset the new outlet form
  const resetNewOutletForm = () => {
    setNewOutletForm(initialNewOutletForm);
    setSelectedOutlet();
    if (modalPickKasirRef.current) {
      modalPickKasirRef.current.resetModal();
    }
  };

  const handleRemoveKasir = (kasirId) => {
    setSelectedOutlet((prev) => ({
      ...prev,
      kasirList: (prev.kasirList || []).filter((id) => id !== kasirId),
    }));
  };

  const modeLabel = (mode) => {
    if (mode === "offline") return "Offline";
    if (mode === "stateless") return "Stateless";
    return "—";
  };

  //untuk new outlet
  const tambahkanTerpilih = (brandIds) => {
    setNewOutletForm((prev) => ({
      ...prev,
      brandIds: brandIds,
    }));
    // Invalidate dan refetch data
    queryClient.invalidateQueries({ queryKey: ["outlet"] });
    queryClient.invalidateQueries({ queryKey: ["brand"] });
  };

  // Update handleSpgSelection function
  const handleSpgSelection = async (spgIds) => {
    if (selectedOutlet) {
      setSelectedOutlet((prev) => ({
        ...prev,
        spgList: spgIds,
      }));
      await handleAssignSpgToOutlet({
        spgIds,
        outletId: selectedOutlet._id,
      });
    } else {
      setNewOutletForm((prev) => ({
        ...prev,
        spgList: spgIds,
      }));
    }
  };

  const handleRemoveSpgFromOutlet = async (spgId) => {
    if (!selectedOutlet) return;
    const newList = (selectedOutlet.spgList || []).filter(
      (id) => String(id) !== String(spgId),
    );
    setSelectedOutlet((prev) => ({ ...prev, spgList: newList }));
    await handleAssignSpgToOutlet({
      spgIds: newList,
      outletId: selectedOutlet._id,
    });
  };

  const handleFavoritedSkuSelection = async (skus) => {
    if (!selectedOutlet) return;
    setSelectedFavoritedSkus(skus);
    await handleAssignFavoritedInventory({
      skus,
      outletId: selectedOutlet._id,
    });
  };

  const handleRemoveFavoritedSku = async (sku) => {
    if (!selectedOutlet) return;
    const newList = selectedFavoritedSkus.filter((s) => s !== sku);
    setSelectedFavoritedSkus(newList);
    await handleAssignFavoritedInventory({
      skus: newList,
      outletId: selectedOutlet._id,
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white min-h-screen p-6 w-full">
      <div className="flex flex-col space-y-4  mx-auto ">
        {/* Header Actions */}
        {/* Header */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            {/* Left: Title & Action */}
            <div className="flex items-center justify-between xl:justify-start gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                    Manajemen Outlet
                  </h1>
                  <p className="text-xs text-slate-400 font-medium hidden sm:block">
                    Kelola konfigurasi sinkronisasi dan status operasional
                    outlet
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  resetNewOutletForm();
                  document.getElementById("newoutlet").showModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Outlet Baru</span>
              </button>
            </div>

            {/* Right: Info / Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 xl:max-w-2xl w-full">
              {/* Offline Mode Card */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 flex flex-col justify-start">
                <div className="flex items-center gap-2 text-sky-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                  <div className="p-1 bg-sky-200/60 rounded-md">
                    <Shield className="w-3.5 h-3.5 text-sky-700" />
                  </div>
                  Offline Mode
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mendukung kerja luring & sinkronisasi berkala saat online.
                  Stok & katalog tersimpan di database lokal.
                </p>
              </div>

              {/* Stateless Mode Card */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 flex flex-col justify-start">
                <div className="flex items-center gap-2 text-indigo-800 font-semibold text-xs tracking-wide uppercase mb-1.5">
                  <div className="p-1 bg-indigo-200/60 rounded-md">
                    <ShieldOff className="w-3.5 h-3.5 text-indigo-700" />
                  </div>
                  Stateless Mode
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Wajib koneksi internet aktif. Data kuantitas & library produk
                  langsung diambil real-time dari SOAP NAV.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      Kode Outlet
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="untuk format kodeInvoice"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      Nama Outlet
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="untuk display dan struk"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    Deskripsi
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      Pendapatan
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="Pendapatan total outlet terkait terlepas dari kasir"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      Kasir List
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="Kasir yang di assign/set untuk outlet ini"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      SPG List
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="spg yang di assing/set ke outlet ini"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      Perusahaan
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="Nama perusahaan yang terkait dengan outlet ini"
                      >
                        <ShieldQuestion className="w-4 h-4 text-blue-200" />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    Mode
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">
                    Brand
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold w-24">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {outletList?.data?.map((outlet) => (
                  <tr
                    key={outlet._id}
                    className="hover:bg-blue-50/50 transition-all duration-200 group"
                  >
                    <td className="px-4 py-4 text-sm">
                      <span className="font-mono bg-blue-50 px-2 py-1 rounded-lg text-blue-700">
                        {outlet.kodeOutlet}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-950" />
                        <span className="font-medium text-gray-800">
                          {outlet.namaOutlet}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-[150px] truncate">
                      {outlet.description || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-green-600">
                        {outlet.pendapatan
                          ? Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(Number(outlet.pendapatan))
                          : "Rp 0"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {userList?.data
                          ?.filter((user) =>
                            outlet?.kasirList?.includes(user._id),
                          )
                          ?.slice(0, 2)
                          ?.map((user) => (
                            <span
                              key={user._id}
                              className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium"
                            >
                              {user.username}
                            </span>
                          ))}
                        {outlet?.kasirList?.length > 2 && (
                          <span className="text-xs text-blue-950 font-medium">
                            +{outlet.kasirList.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {spgList?.data
                          ?.filter((spg) =>
                            outlet?.spgList?.some(
                              (id) => String(id) === String(spg._id),
                            ),
                          )
                          .slice(0, 2)
                          .map((spg) => (
                            <span
                              key={spg._id}
                              className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-medium"
                            >
                              {spg.name}
                            </span>
                          ))}
                        {outlet?.spgList?.length > 2 && (
                          <span className="text-xs text-purple-500 font-medium">
                            +{outlet.spgList.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-[150px] truncate">
                      {outlet.namaPerusahaan || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {outlet.mode ? (
                        <span
                          className={`badge badge-sm font-medium ${
                            outlet.mode === "stateless"
                              ? "badge-info"
                              : "badge-warning"
                          }`}
                        >
                          {modeLabel(outlet.mode)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {outlet.brandIds?.length > 0 && (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {brandList?.data?.data
                            ?.filter((brand) =>
                              outlet.brandIds.includes(brand._id),
                            )
                            ?.slice(0, 2)
                            ?.map((brand) => (
                              <span
                                key={brand._id}
                                className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium"
                              >
                                {brand.name}
                              </span>
                            ))}
                          {outlet.brandIds.length > 2 && (
                            <span className="text-xs text-blue-600 font-medium">
                              +{outlet.brandIds.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleEditClick(outlet)}
                        className="btn btn-sm btn-ghost text-blue-700 hover:bg-blue-100"
                        title="Konfigurasi outlet"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalOutletEdit
        outlet={selectedOutlet}
        setOutlet={setSelectedOutlet}
        onSave={handleEditOutlet}
        onDelete={() => {
          setOutletToDelete(selectedOutlet?._id);
          document.getElementById("modal_confirmation")?.showModal();
        }}
        userList={userList}
        brandList={brandList}
        spgList={spgList}
        selectedFavoritedSkus={selectedFavoritedSkus}
        onOpenPickKasir={() =>
          document.getElementById("pickKasir")?.showModal()
        }
        onOpenBrandPick={() =>
          document.getElementById("modalBrandPick")?.showModal()
        }
        onOpenSpgPick={() => {
          setSelectedSpgIds(selectedOutlet?.spgList || []);
          document.getElementById("modalSpgPick")?.showModal();
        }}
        onOpenFavoritedPick={() =>
          document.getElementById("modalFavoritedInventoryPick")?.showModal()
        }
        onRemoveKasir={handleRemoveKasir}
        onRemoveSpg={handleRemoveSpgFromOutlet}
        onRemoveFavoritedSku={handleRemoveFavoritedSku}
        isSaving={isSavingOutlet}
      />

      {/* Modals */}
      <ModalRegisterOutlet
        newOutletForm={newOutletForm}
        setNewOutletForm={setNewOutletForm}
        handleRegisterOutlet={handleRegisterOutlet}
        resetNewOutletForm={resetNewOutletForm}
        brandList={brandList}
        spgList={spgList}
      />
      <ModalPickKasir
        ref={modalPickKasirRef}
        key="kasir"
        callback={beforeHandleSelectKasir}
        currentSelected={
          selectedOutlet
            ? selectedOutlet.kasirList
            : newOutletForm?.kasirList || []
        }
      />
      <ModalConfirmation
        onConfirm={() => handleDeleteOutlet(outletToDelete)}
        onCancel={() => {
          setOutletToDelete(null);
          document.getElementById("modal_confirmation").close();
        }}
        title="Konfirmasi Hapus Outlet"
        message={`Apakah Anda yakin ingin menghapus outlet "${selectedOutlet?.namaOutlet}"? Tindakan ini tidak dapat dibatalkan.`}
      />
      <ModalBrandPick
        selectedOutlet={selectedOutlet}
        setSelectedOutlet={setSelectedOutlet}
        TambahkanTerpilih={tambahkanTerpilih}
        newOutletForm={newOutletForm}
      />
      <ModalConfirmation2
        onConfirm={() => {
          handleKasirSelection();
          document.getElementById("modal_confirmation2").close();
        }}
        onCancel={() => {
          document.getElementById("modal_confirmation2").close();
          setAmbiguKasir([]);
          setSelectedKasirIds([]);
        }}
        title={"Konfirmasi Pemindahan Kasir"}
        message={`${ambiguKasir.join(
          ", ",
        )} sudah terdaftar di outlet lain. Satu kasir hanya dapat ditugaskan ke satu outlet, Apakah anda yakin ingin memindahkan kasir?`}
      />
      <ModalSpgMultiPick
        selectedOutletObj={selectedOutlet}
        selectedSpgIds={
          selectedOutlet ? selectedOutlet.spgList : newOutletForm?.spgList || []
        }
        setSelectedSpgIds={handleSpgSelection}
        key={"modalSpgMultiPick"}
      />
      <ModalFavoritedInventoryPick
        selectedSkus={selectedFavoritedSkus}
        setSelectedSkus={handleFavoritedSkuSelection}
      />
    </div>
  );
};

export default Outlet;
