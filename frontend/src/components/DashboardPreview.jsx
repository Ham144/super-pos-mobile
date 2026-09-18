import { getSimpleOverview } from "@/api/dashboardApi";
import { useUserInfo } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChartBar, Delete, List, ShoppingBag, ShoppingCart } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

const DashboardPreview = () => {
  const navigate = useNavigate();

  const { userInfo } = useUserInfo();

  const { data: simpleOverview } = useQuery({
    enabled: !!userInfo,
    queryKey: ["dashboard_preview"],
    queryFn: async () => {
      const response = await getSimpleOverview();
      return response.data;
    },
  });

  return (
    <div className="mb-8 md:mb-10">
      <div className="flex justify-between items-center mb-6 flex-col md:flex-row">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3 md:mb-0 flex items-center gap-2">
          <ChartBar color="blue" />
          Ringkasan Bisnis
        </h2>
        <button
          onClick={() => navigate("/sales_report")}
          className="btn btn-sm btn-primary hover:bg-blue-600 text-white shadow-md"
        >
          <List color="white" />
          Detail Overview
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Penjualan Hari Ini */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-md">
              <ShoppingBag color="green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-600">
                Penjualan Hari Ini
              </h3>
              <p className="text-xl font-bold text-gray-800">
                {userInfo ? (
                  Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    simpleOverview?.penjualanHariIni[0]?.totalSales || 0,
                  )
                ) : (
                  <span className="badge badge-warning">Perlu Login</span>
                )}
              </p>
              <p className="text-xs text-gray-500">Hanya outlet Anda</p>
            </div>
          </div>
        </div>

        {/* Total Transaksi Hari Ini */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-md">
              <ShoppingBag color="blue" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-600">
                Total Transaksi Hari Ini
              </h3>
              <p className="text-xl font-bold text-gray-800">
                {userInfo ? (
                  simpleOverview?.totalTransaksiHariIni
                ) : (
                  <span className="badge badge-warning">Perlu Login</span>
                )}
              </p>
              <p className="text-xs text-gray-500">Hanya outlet Anda</p>
            </div>
          </div>
        </div>

        {/* Transaksi Void Hari Ini */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-md">
              <Delete color="red" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-600">
                Transaksi Void Hari Ini
              </h3>
              <p className="text-xl font-bold text-gray-800">
                {userInfo ? (
                  simpleOverview?.transaksiBatalHariIni
                ) : (
                  <span className="badge badge-warning">Perlu Login</span>
                )}
              </p>
              <p className="text-xs text-gray-500">Hanya outlet Anda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card: Outlet Terlaris Hari Ini */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform transition-transform duration-300 hover:scale-[1.01]">
          <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
            <ShoppingCart color="blue" className="w-5 h-5 mr-2" />
            <span className="text-blue-950">Outlet Terlaris Hari Ini</span>
          </h3>
          <div className="text-gray-800">
            {userInfo ? (
              <div className="space-y-3">
                <p>
                  <span className="font-medium text-gray-600">
                    Nama Outlet:
                  </span>{" "}
                  <span className="ml-1">
                    {simpleOverview?.outletTerlarisHariIni[0]?.outlet
                      ?.namaOutlet || "Belum ada data"}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Kode Outlet:
                  </span>{" "}
                  <span className="ml-1">
                    {simpleOverview?.outletTerlarisHariIni[0]?.outlet
                      ?.kodeOutlet || "Belum ada data"}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Transaksi Hari Ini:
                  </span>{" "}
                  <span className="ml-1 font-semibold text-blue-600">
                    {simpleOverview?.outletTerlarisHariIni[0]
                      ?.jumlahTransaksi || "0"}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">Alamat:</span>{" "}
                  <span className="ml-1">
                    {simpleOverview?.outletTerlarisHariIni[0]?.outlet?.alamat ||
                      "Belum ada data"}
                  </span>
                </p>
              </div>
            ) : (
              <div role="alert" className="alert alert-warning text-sm">
                <AlertCircle color="warning" className="w-5 h-5 mr-2" />
                <span>Anda perlu login untuk melihat data ini.</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4 italic">
            *Data diambil dari semua outlet yang terdaftar.
          </p>
        </div>

        {/* Card: 3 Barang Terlaris Hari Ini */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform transition-transform duration-300 hover:scale-[1.01]">
          <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
            <ShoppingCart color="green" className="w-5 h-5 mr-2" />
            <span className="text-green-950">3 Barang Terlaris Hari Ini</span>
          </h3>
          <div className="overflow-x-auto max-h-[220px] custom-scrollbar">
            {userInfo ? (
              <table className="table w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 text-gray-600">SKU</th>
                    <th className="text-left py-2 px-3 text-gray-600">
                      Rekor Terjual
                    </th>
                    <th className="text-left py-2 px-3 text-gray-600">
                      Terjual Hari Ini
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {simpleOverview?.barangTerlarisHariIni &&
                  simpleOverview.barangTerlarisHariIni.length > 0 ? (
                    simpleOverview.barangTerlarisHariIni.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium">
                          {item?.barang?.sku || "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {item?.barang?.terjual || "0"}
                        </td>
                        <td className="py-2 px-3 font-semibold text-green-600">
                          {item?.totalQuantityTerjual || "0"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="text-center py-4 text-gray-500"
                      >
                        Belum ada data penjualan barang hari ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div role="alert" className="alert alert-warning text-sm">
                <AlertCircle color="warning" className="w-5 h-5 mr-2" />
                <span>Anda perlu login untuk melihat data ini.</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4 italic">
            *Data diambil dari penjualan di semua outlet Anda.
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardPreview);
