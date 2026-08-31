import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { deleteKasir } from "../api/kasirApi";
import { toast } from "react-hot-toast";
import { deleteSpg, editSpg, getAllSpg } from "../api/spgApi";
import ModalNewAccount from "@/components/ModalNewAccount";
import { getOuletList, assignUserToOutlet } from "../api/outletApi";
import { getAllAccount, updateUser } from "@/api/authApi";
import { mockBackend, mockPages } from "@/api/constant";
import {
  UserPlus,
  Download,
  Filter,
  Edit,
  Trash2,
  X,
  Save,
  Eye,
  EyeOff,
  Shield,
  ShieldQuestion,
  Mail,
  Phone,
  Target,
  Store,
  Key,
  Lock,
  ShieldCheck,
  Ban,
  ShieldX,
  BadgeInfo,
} from "lucide-react";

const AllAccounts = () => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");
  const [uniqueRoles, setUniqueRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const queryClient = useQueryClient();
  const { data: spgList } = useQuery({
    queryFn: getAllSpg,
    queryKey: ["spg"],
  });
  const { data: outletList } = useQuery({
    queryFn: getOuletList,
    queryKey: ["outlet"],
  });
  const { mutateAsync: handleUpdateSpg } = useMutation({
    mutationFn: async () => {
      const body = {
        id: selectedUser?._id,
        name: selectedUser?.username,
        telepon: selectedUser?.telepon,
        email: selectedUser?.email,
        targetHargaPenjualan: selectedUser?.targetHargaPenjualan,
        targetQuantityPenjualan: selectedUser?.targetQuantityPenjualan,
      };
      await editSpg(body);
    },
    mutationKey: ["spg", "user"],
    onSuccess: () => {
      queryClient.invalidateQueries("spg");
      toast.success("Account updated successfully!");
      setSelectedUser(null);
      setShowEditForm(false);
    },
  });
  const { data: userList } = useQuery({
    queryFn: getAllAccount,
    queryKey: ["user"],
  });

  const { mutateAsync: handleDeleteUserKasir } = useMutation({
    mutationFn: (userId) => deleteKasir(userId),
    mutationKey: ["kasir", "user"],
    onSuccess: () => {
      setSelectedUser(null);
      queryClient.invalidateQueries("kasir");
      toast.success("Account deleted successfully!");
    },
    onError: (err) => {
      toast(err?.response?.data?.message || err.message);
    },
  });

  const { mutateAsync: handleUpdateUser } = useMutation({
    mutationFn: () => updateUser(selectedUser),
    onSuccess: () => {
      queryClient.invalidateQueries(["kasir", "user"]);
      setShowEditForm(false);
      setSelectedUser(null);
      toast.success("Edited successfully!");
    },
    onError: (err) => {
      toast(err?.response?.data?.message || err.message);
    },
  });

  const { mutateAsync: handleDeleteSpg } = useMutation({
    mutationFn: async (spgId) => await deleteSpg(spgId),
    mutationKey: ["spg"],
    onError: (error) => {
      toast.error(error?.response?.data?.message);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["spg"]);
      toast.success(res?.response?.data?.message || res.message);
      setSelectedUser(null);
      setShowEditForm(false);
    },
  });

  const { mutateAsync: handleAssignOutlet } = useMutation({
    mutationFn: ({ userId, outletId }) => assignUserToOutlet(userId, outletId),
    onSuccess: () => {
      queryClient.invalidateQueries(["outlet"]);
      toast.success("User assigned to outlet successfully");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to assign user to outlet",
      );
    },
  });

  const findOutletForUser = (userId, outletList) => {
    if (!outletList || !userId) return null;

    const outlet = outletList.find(
      (outlet) => outlet.kasirList && outlet.kasirList.includes(userId),
    );

    return outlet || null;
  };

  const handleEditClick = (user) => {
    setSelectedUser(null);

    setTimeout(() => {
      const userOutlet = findOutletForUser(user._id, outletList?.data || []);

      setSelectedUser({
        _id: user._id,
        username: user?.username || user?.name,
        password: "",
        email: user?.email || "",
        telepon: user?.telepon || "",
        targetHargaPenjualan: user?.targetHargaPenjualan || 0,
        targetQuantityPenjualan: user?.targetQuantityPenjualan || 0,
        outlet: userOutlet ? userOutlet._id : "",
        roleName: user?.roleName || "",
        blockedAccess: user?.blockedAccess || [],
        type: user?.type == "SPG" ? "SPG" : user?.roleName,
        kodeKasir: user?.kodeKasir || "",
        isDisabled: user?.isDisabled || false,
      });
    }, 0);
    setShowEditForm(true);
  };

  const handleDownloadAsCsv = () => {
    if (!filteredAccounts) {
      return toast("tidak ada data untuk didownload");
    }
    const csvRows = [];
    const headers = [
      "username",
      "kodeKasir",
      "email",
      "telepon",
      "targetHargaPenjualan",
      "targetQuantityPenjualan",
      "outlet",
      "roleName",
    ];
    csvRows.push(headers.join(","));
    filteredAccounts.forEach((user) => {
      const row = [
        user.username || user.name,
        user.kodeKasir || "-",
        user.email,
        user.telepon,
        user.targetHargaPenjualan,
        user.targetQuantityPenjualan,
        user.outlet,
        user.roleName,
      ];
      csvRows.push(row.join(","));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "allAccounts.csv");
    link.click();
  };

  useEffect(() => {
    const allSpg = spgList?.data.map((spg) => ({
      ...spg,
      type: "SPG",
    }));
    const all = [...(userList?.data || []), ...(allSpg || [])];
    setAllAccounts(all);

    // Extract unique roles
    const roles = new Set(all.map((account) => account.roleName || "SPG"));
    setUniqueRoles(Array.from(roles));

    // Apply current role filter
    filterAccountsByRole(selectedRole, all);
  }, [userList, spgList, selectedRole]);

  const filterAccountsByRole = (role, accounts = allAccounts) => {
    if (role === "all") {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(
        (account) => (account.roleName || "SPG") === role,
      );
      setFilteredAccounts(filtered);
    }
  };

  const toggleBlockedAccess = (page) => {
    setSelectedUser((prev) => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 mb-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-950 to-blue-600 rounded-xl shadow-lg shadow-blue-950/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Manajemen Akun Login
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Akun di halaman ini bersifat stateful: dipakai untuk login,
                session, role, dan akses. SPG dipindahkan ke menu SPG
                Reference karena hanya data referensi stateless.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                      <Shield className="w-4 h-4" />
                      Stateful
                    </div>
                    <p className="text-sm text-gray-700">
                      Akun login yang benar-benar masuk ke session aplikasi.
                      Dipakai untuk user, kasir, admin, dan role lain.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-2">
                      <BadgeInfo className="w-4 h-4" />
                      Stateless
                    </div>
                    <p className="text-sm text-gray-700">
                      SPG hanya data referensi. Bisa dibuat, diubah, dinonaktifkan,
                      tetapi tidak dipakai untuk login, <a className="link" href="/spg_reference">spg reference</a>
                    </p>
                  </div>
                </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 w-full gap-6">
        {/* Table Section */}
        <div
          className={`flex-1 transition-all duration-300 ${
            showEditForm && selectedUser ? "lg:w-[calc(100%-432px)]" : "w-full"
          }`}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* Table Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* New Account Button */}
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedUser(null);
                      document.getElementById("newAccount").showModal();
                    }}
                    className="btn bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-950/25"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Initialize New Account
                  </button>

                  {/* Role Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                    >
                      <option value="all">Semua Role</option>
                      {uniqueRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Download CSV */}
                  <button
                    onClick={handleDownloadAsCsv}
                    className="btn btn-outline border-gray-300 hover:bg-blue-50 hover:border-blue-300 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>

                  {/* Total Badge */}
                  <div className="badge badge-lg bg-gradient-to-r from-blue-950 to-blue-600 text-white border-0 px-4 py-3">
                    <Filter className="w-4 h-4 mr-2" />
                    Total: {filteredAccounts.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      <div className="flex items-center gap-1">
                        Username
                        <div
                          className="tooltip tooltip-bottom"
                          data-tip="untuk login"
                        >
                          <ShieldQuestion className="w-4 h-4 text-blue-200" />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      <div className="flex items-center gap-1">
                        Kode Kasir
                        <div
                          className="tooltip tooltip-bottom"
                          data-tip="untuk format kodeInvoice"
                        >
                          <ShieldQuestion className="w-4 h-4 text-blue-200" />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      Email
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      Status
                    </th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-white">
                      Target Harga
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                      Target Qty
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                      Outlet
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAccounts?.map((user) => (
                    <tr
                      key={user._id}
                      onClick={() => handleEditClick(user)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                            <Shield className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {user.username || user.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                          {user.kodeKasir || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.isDisabled ? "Nonaktif" : "Aktif"}
                        <div
                          className="tooltip tooltip-bottom flex items-center gap-1"
                          data-tip="untuk format kodeInvoice"
                        >
                          {user.isDisabled ? (
                            <ShieldX className="w-4 h-4 text-red-200" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-green-200" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        <span className="text-green-600 font-semibold">
                          {user.targetHargaPenjualan
                            ? `Rp ${user.targetHargaPenjualan.toLocaleString("id-ID")}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.targetQuantityPenjualan || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const outlet = findOutletForUser(
                            user._id,
                            outletList?.data || [],
                          );
                          return outlet ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                              {outlet.namaOutlet}
                            </span>
                          ) : (
                            "-"
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium
                                                ${
                                                  user.roleName === "SPG"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-blue-100 text-blue-700"
                                                }`}
                        >
                          {user.roleName || "SPG"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAccounts?.length === 0 && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Shield className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Tidak ada data akun</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form Section */}
        {showEditForm && selectedUser && (
          <div className="w-[400px]">
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden sticky top-4">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">
                    Edit User
                  </h2>
                </div>
              </div>

              {/* Form Actions */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="flex flex-col items-center p-2 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Batal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        `Apakah Anda yakin ingin menghapus ${selectedUser.username}?`,
                      );
                      if (confirmDelete) {
                        if (selectedUser.type == "SPG") {
                          handleDeleteSpg(selectedUser._id);
                        } else {
                          handleDeleteUserKasir(selectedUser._id);
                        }
                      }
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 border-red-200 text-white hover:bg-red-50 transition-colors ${selectedUser?.isDisabled ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    {selectedUser?.isDisabled ? (
                      <ShieldCheck className="w-5 h-5 mb-1" />
                    ) : (
                      <Ban className="w-5 h-5 mb-1" />
                    )}
                    <span className="text-xs font-medium">
                      {selectedUser?.isDisabled ? "Enable" : "Disable"}
                    </span>
                  </button>
                  <button
                    type="submit"
                    form="editUserForm"
                    className="flex flex-col items-center p-2 rounded-xl border-2 border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Save className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Simpan</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                <form
                  id="editUserForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (selectedUser.type == "SPG") {
                      handleUpdateSpg();
                    } else {
                      handleUpdateUser();
                    }
                  }}
                  className="space-y-4"
                >
                  {/* Username (Disabled) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-950" />
                      Username
                      <div
                        className="tooltip tooltip-bottom"
                        data-tip="Maaf. Tidak boleh diubah, sudah terlanjur penghubung (FK) antar Invoice"
                      >
                        <ShieldQuestion className="w-4 h-4 text-gray-400" />
                      </div>
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                      value={selectedUser.username || ""}
                    />
                  </div>

                  {/* Kode Kasir */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-950" />
                      Kode Kasir
                      <span className="badge badge-info text-xs">
                        Max 3 karakter
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 uppercase"
                      value={selectedUser.kodeKasir || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          kodeKasir: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Contoh: ADM"
                    />
                    <p className="text-xs text-gray-500">
                      Kode ini muncul dalam kode invoice dan harus unik (3
                      karakter)
                    </p>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-950" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                        value={selectedUser.password || ""}
                        onChange={(e) =>
                          setSelectedUser((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="Biarkan kosong jika tidak diubah"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-950" />
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      value={selectedUser.email || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="user@example.com"
                    />
                  </div>

                  {/* Telepon */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-950" />
                      Telepon
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      value={selectedUser.telepon || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          telepon: e.target.value,
                        }))
                      }
                      placeholder="08123456789"
                    />
                  </div>

                  {/* Target Harga */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-950" />
                      Target Harga Penjualan
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      value={selectedUser.targetHargaPenjualan || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          targetHargaPenjualan: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* Target Quantity */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-950" />
                      Target Quantity Penjualan
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      value={selectedUser.targetQuantityPenjualan || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          targetQuantityPenjualan:
                            parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* Outlet */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Store className="w-4 h-4 text-blue-950" />
                      Outlet
                    </label>
                    <select
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 appearance-none bg-white"
                      value={selectedUser.outlet || ""}
                      onChange={(e) => {
                        const newOutletId = e.target.value;
                        setSelectedUser((prev) => ({
                          ...prev,
                          outlet: newOutletId,
                        }));

                        if (selectedUser._id) {
                          handleAssignOutlet({
                            userId: selectedUser._id,
                            outletId: newOutletId,
                          });
                        }
                      }}
                    >
                      <option value="">Pilih Outlet</option>
                      {outletList?.data?.map((outlet) => (
                        <option key={outlet._id} value={outlet._id}>
                          {outlet.namaOutlet}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Name (for non-SPG) */}
                  {selectedUser?.type !== "SPG" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-950" />
                          Role Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200 uppercase"
                          value={selectedUser.roleName?.toUpperCase() || ""}
                          onChange={(e) =>
                            setSelectedUser((prev) => ({
                              ...prev,
                              roleName: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="ADMIN / MANAGER / KASIR"
                        />
                      </div>

                      {/* Blocked Access Sections */}
                      <div className="space-y-4 pt-2">
                        <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-blue-950" />
                            Blocked Access By Page
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {mockPages.map((page) => (
                              <div
                                key={page.originalPath}
                                className="flex items-start gap-3 p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUser.blockedAccess?.includes(
                                    page.originalPath,
                                  )}
                                  onChange={() =>
                                    toggleBlockedAccess(page.originalPath)
                                  }
                                  className="checkbox checkbox-primary checkbox-sm mt-1"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-800">
                                    {page.originalPath}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {page.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl p-4 border border-purple-100">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-purple-500" />
                            Blocked Access By API
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {mockBackend.map((api) => (
                              <div
                                key={api.originalPath}
                                className="flex items-start gap-3 p-2 bg-white rounded-lg hover:bg-purple-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUser.blockedAccess?.includes(
                                    api.originalPath,
                                  )}
                                  onChange={() =>
                                    toggleBlockedAccess(api.originalPath)
                                  }
                                  className="checkbox checkbox-primary checkbox-sm mt-1"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-800">
                                    {api.originalPath}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {api.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalNewAccount id="newAccount" />
    </div>
  );
};

export default AllAccounts;
