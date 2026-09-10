import { createNewUser } from "@/api/authApi";
import { getSimpleOuletList } from "@/api/outletApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { mockBackend, mockPages } from "@/api/constant";

import {
  User,
  Lock,
  Store,
  Shield,
  Key,
  X,
  AlertCircle,
  UserPlus,
  Info,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

const ModalNewAccount = () => {
  const [newAccount, setNewAccount] = useState({
    username: "",
    password: "",
    outlet: "",
    roleName: "",
    blockedAccess: [],
    kodeKasir: "",
    outletId: "",
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const [showPassword, setShowPassword] = useState(false);

  const queryClient = useQueryClient();
  const { data: outletList } = useQuery({
    queryKey: ["simpleOutletList"],
    queryFn: getSimpleOuletList,
  });

  const { mutateAsync: handleCreateNewUser } = useMutation({
    mutationFn: async () => {
      // Jika outlet dipilih, lakukan assignUserToOutlet setelah user dibuat
      const response = await createNewUser(newAccount);

      // Jika outlet dipilih dan createNewUser berhasil, assign user ke outlet
      if (newAccount.outletId && response.kodeKasir) {
        try {
          const outletAssignResponse = await fetch(
            "/api/v1/outlet/assignUserToOutlet",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                userId: response.userId, // ID user yang baru dibuat
                outletId: newAccount.outletId, // ID outlet yang dipilih
              }),
            },
          );

          if (!outletAssignResponse.ok) {
            console.error("Gagal mengassign user ke outlet");
          }
        } catch (error) {
          console.error("Error saat assign user ke outlet:", error);
        }
      }

      return response;
    },
    mutationKey: ["user"],
    onSuccess: () => {
      queryClient.invalidateQueries(["user", "kasir", "spg", "admin"]);
      document.getElementById("newAccount").close();
      setNewAccount({
        username: "",
        password: "",
        roleName: "",
        blockedAccess: [],
        kodeKasir: "",
        outletId: "",
      });
      setErrorMessage(null);
      toast.success("Account created successfully!");
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || err.message);
      setTimeout(() => {
        setErrorMessage(null);
      }, 6000);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewAccount((prev) => ({
      ...prev,
      [name]: name === "roleName" ? value.toUpperCase() : value,
    }));
  };

  const toggleBlockedAccess = (page) => {
    setNewAccount((prev) => {
      const blockedAccess = prev.blockedAccess || [];
      if (blockedAccess.includes(page)) {
        return {
          ...prev,
          blockedAccess: blockedAccess.filter((item) => item !== page),
        };
      } else {
        return {
          ...prev,
          blockedAccess: [...blockedAccess, page],
        };
      }
    });
  };

  return (
    <dialog id="newAccount" className="modal">
      <Toaster position="top-center" />
      <div className="modal-box w-full max-w-7xl p-0 overflow-hidden bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-white">
                  Create New Account
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Tambahkan akun baru untuk kasir atau SPG
                </p>
              </div>
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <form method="dialog">
                <button
                  type="button"
                  onClick={() => document.getElementById("newAccount").close()}
                  className="px-6 py-3 border border-white text-white font-medium rounded-md"
                >
                  Batal
                </button>
              </form>
              <button
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg shadow-blue-950/25"
                onClick={() => handleCreateNewUser()}
              >
                <Save className="w-5 h-5" />
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          className="p-8"
          style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
        >
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
          

          {/* Grid Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-950" />
                Username
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={newAccount.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-950" />
                Password
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={newAccount.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Outlet */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-950" />
                Outlet
                <span className="badge badge-soft badge-info text-xs">
                  Opsional
                </span>
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  name="outlet"
                  value={newAccount.outletId}
                  onChange={(e) =>
                    setNewAccount((prev) => ({
                      ...prev,
                      outletId: e.target.value,
                    }))
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                >
                  <option value="">Pilih Outlet</option>
                  {outletList?.data?.map((outlet) => (
                    <option key={outlet._id} value={outlet._id}>
                      {outlet.namaOutlet}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">Untuk keperluan statistik</p>
            </div>

            {/* Role Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-950" />
                Role Name
                <span className="text-red-500">*</span>
                <span className="badge badge-soft badge-info text-xs">
                  Untuk Routing
                </span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="roleName"
                  value={newAccount.roleName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                  placeholder="ADMIN / MANAGER / KASIR / SPG"
                />
              </div>
            </div>

            {/* Kode Kasir */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-950" />
                Kode Kasir
                <span className="badge badge-soft badge-warning text-xs">
                  Max 3 karakter
                </span>
                <span className="badge badge-soft badge-info text-xs">
                  Untuk Mobile
                </span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="kodeKasir"
                    value={newAccount.kodeKasir}
                    onChange={handleChange}
                    maxLength={3}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 uppercase"
                    placeholder="ADM"
                  />
                </div>
                <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-4 rounded-xl border border-gray-200">
                  <Info className="w-4 h-4 mr-2 text-blue-950" />
                  Akan dibuat otomatis jika tidak diisi
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Access Frontend */}
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              Blocked Access By Page
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {mockPages.map((page) => (
                <div
                  key={page.originalPath}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer truncate text-xs"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={newAccount.blockedAccess.includes(
                        page.originalPath,
                      )}
                      onChange={() => toggleBlockedAccess(page.originalPath)}
                      className="checkbox checkbox-primary checkbox-sm mt-1"
                    />
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {page.originalPath}
                      </h5>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {page.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="divider">
            <span className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
              ATAU LEBIH SPESIFIK
            </span>
          </div>

          {/* Blocked Access Backend */}
          <div className="mb-8">
            <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
              Blocked Access By API Specific
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {mockBackend.map((api) => (
                <div
                  key={api.originalPath}
                  className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer truncate text-xs"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={newAccount.blockedAccess.includes(
                        api.originalPath,
                      )}
                      onChange={() => toggleBlockedAccess(api.originalPath)}
                      className="checkbox checkbox-primary checkbox-sm mt-1"
                    />
                    <div className="flex-1 hover:text-wrap">
                      <h5 className="text-sm font-semibold text-gray-800 group-hover:text-purple-600 transition-colors hover:text-wrap">
                        {api.originalPath}
                      </h5>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 hover:text-wrap">
                        {api.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default ModalNewAccount;
