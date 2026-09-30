import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  StepBack,
  StepForward,
  RefreshCcw,
  Package,
  Truck,
  Barcode,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import React, { useState } from "react";
import {
  completeAllPurchaseOrder,
  manualEditPurchaseOrder,
  scanBarcode,
  scanErp,
} from "../api/purchaseOrderApi";
import toast from "react-hot-toast";
import { ModalItemEdit } from "../components/ModalItemEdit";
import ModalConfirmation from "@/components/ModalConfirmation";

const PurchaseOrderReceive = () => {
  const [currentForm, setCurrentForm] = useState("Erp"); //Erp, barcode

  //states input
  const [Erp, setErp] = useState("");
  const [plat, setPlat] = useState("");
  const [barcode, setBarcode] = useState("");

  //states modif
  const [searchResult, setSearchResult] = useState();
  const [selectedItem, setSelectedItem] = useState();

  //tanstack
  const { mutateAsync: handleScanErp } = useMutation({
    mutationFn: () =>
      scanErp({ Erp: Erp?.toUpperCase(), plat: plat?.toUpperCase() }),
    mutationKey: ["purchaseOrder"],
    onSuccess: (res) => {
      setCurrentForm("barcode");
      setSearchResult(res.data);
    },
    onError: (res) => {
      setCurrentForm("Erp");
      toast.error(res?.response?.data?.message || res?.message);
    },
  });

  const queryClient = useQueryClient();
  const { mutateAsync: handleScanBarcode } = useMutation({
    mutationFn: () =>
      scanBarcode({ Erp: Erp?.toUpperCase(), barcode: barcode?.toUpperCase() }),
    mutationKey: ["purchaseOrder", "inventories"],
    onSuccess: (res) => {
      queryClient.invalidateQueries(["purchaseOrder", "inventories"]);
    },
    onError: (res) => {
      toast.error(res?.response?.data?.message || "Kegagalan tidak diketahui");
    },
  });

  const { mutateAsync: handleCompleteAllPurchaseOrder } = useMutation({
    mutationFn: async () => {
      const body = { Erp, currentTime: new Date() };
      const response = await completeAllPurchaseOrder(body);
      return response.data;
    },
    mutationKey: ["purchaseOrder"],
    onSuccess: (res) => {
      queryClient.invalidateQueries(["purchaseOrder", "inventories"]);
      handleScanErp();
      return setSearchResult(res?.data || searchResult);
    },
    onError: (res) => res?.response?.data?.message,
  });
  // Mutasi untuk mengedit item
  const { mutateAsync: handleManualEditPurchaseOrder } = useMutation({
    mutationFn: async () => {
      const body = {
        Erp: Erp?.toUpperCase(),
        sku: selectedItem?.sku,
        request: selectedItem?.request,
        received: selectedItem?.received,
        currentTime: new Date(),
      };
      const data = await manualEditPurchaseOrder(body);
      return data; //jangan lupa Kembalikan data ke onSuccess
    },
    mutationKey: ["purchaseOrder", "inventories"],
    onSuccess: (res) => {
      queryClient.invalidateQueries(["purchaseOrder", "inventories"]);
      document.getElementById("editItemModal").close();
      setSearchResult(res?.data || searchResult);
    },
    onError: (error) => {
      console.log("Error dari onError:", error); // Debugging
      toast.error(error?.response?.data?.message || "Gagal mengupdate item");
    },
  });
  const handlePickItem = (item) => {
    document.getElementById("editItemModal").showModal();
    setSelectedItem(item);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50/30 to-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Terima Purchase Order</h1>
              <p className="text-blue-100 mt-1">
                Terima dan verifikasi item yang datang
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-b-2xl shadow-xl border-x border-b border-blue-100 p-8">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-3 mb-8">
            <button
              disabled={currentForm === "Erp"}
              onClick={() => setCurrentForm("Erp")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                            ${
                              currentForm === "Erp"
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-950/25"
                            }`}
            >
              <StepBack className="w-5 h-5" />
              ERP
            </button>

            <button
              disabled={!searchResult?.items?.length && !barcode && !Erp}
              onClick={() => {
                setCurrentForm("Erp");
                setSearchResult(null);
                setErp("");
                setBarcode("");
                setPlat("");
              }}
              className="p-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset Form"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            <button
              disabled={
                (currentForm === "Erp" && !Erp) ||
                (currentForm === "barcode" && !barcode)
              }
              onClick={() =>
                currentForm === "Erp" ? handleScanErp() : handleScanBarcode()
              }
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                            ${
                              (currentForm === "Erp" && !Erp) ||
                              (currentForm === "barcode" && !barcode)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-950/25"
                            }`}
            >
              {currentForm === "Erp" ? "Cari PO" : "Scan Barcode"}
              <StepForward className="w-5 h-5" />
            </button>
          </div>

          {/* ERP Form */}
          {currentForm === "Erp" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanErp();
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="Erp"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <Package className="w-4 h-4 text-blue-950" />
                    Purchase Code (ERP)
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                    <input
                      id="Erp"
                      type="text"
                      value={Erp}
                      onChange={(e) => setErp(e.target.value)}
                      placeholder="Masukkan kode Purchase Order"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="plat"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4 text-blue-950" />
                    Plat Kendaraan (Opsional)
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                    <input
                      id="plat"
                      type="text"
                      value={plat}
                      onChange={(e) => setPlat(e.target.value)}
                      placeholder="Contoh: B 1234 XYZ"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="hidden">
                Submit
              </button>
            </form>
          )}

          {/* Barcode Form */}
          {currentForm === "barcode" && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScanBarcode();
                }}
                className="space-y-2"
              >
                <label
                  htmlFor="barcodeScanner"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Barcode className="w-4 h-4 text-blue-950" />
                  Scan Barcode Item
                  <span className="badge badge-warning gap-1 ml-2">
                    <AlertCircle className="w-3 h-3" />
                    Bug: Hapus inventory dengan barcode sama
                  </span>
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    id="barcodeScanner"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    type="text"
                    placeholder="Arahkan scanner barcode ke sini"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-950 transition-all duration-200"
                    autoFocus
                  />
                </div>
              </form>

              {/* PO Summary */}
              {searchResult?.items?.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Purchase Order</p>
                      <p className="font-semibold text-gray-800">
                        {searchResult.Erp}
                      </p>
                      <p className="text-xs text-gray-500">
                        {searchResult.items.length} item
                      </p>
                    </div>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
                    onClick={() =>
                      document.getElementById("modal_confirmation").showModal()
                    }
                  >
                    <CheckCircle className="w-4 h-4" />
                    Selesaikan Semua
                  </button>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Request
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Barcode
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Received
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Keterangan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {searchResult?.items?.length > 0 ? (
                        searchResult.items.map((item, index) => {
                          const isComplete = item.request === item.received;
                          return (
                            <tr
                              key={item.sku || index}
                              onClick={() => handlePickItem(item)}
                              className={`hover:bg-blue-50/50 transition-colors cursor-pointer group
                                                            ${isComplete ? "bg-green-50/50" : ""}
                                                        `}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center
                                                                    ${isComplete ? "bg-green-100" : "bg-gradient-to-br from-blue-950 to-blue-600 text-white"}`}
                                  >
                                    {isComplete ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Package className="w-4 h-4" />
                                    )}
                                  </div>
                                  <span
                                    className={`font-medium ${isComplete ? "text-gray-500" : "text-blue-700"}`}
                                  >
                                    {item.sku}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`font-semibold ${isComplete ? "text-gray-500" : "text-gray-800"}`}
                                >
                                  {item.request}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-sm">
                                {item.barcodeItem}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                                                ${
                                                                  isComplete
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-yellow-100 text-yellow-700"
                                                                }`}
                                >
                                  {item.received} / {item.request}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                                <div
                                  className="line-clamp-1"
                                  title={item.keterangan}
                                >
                                  {item.keterangan || "-"}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-12">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500">
                                {Erp
                                  ? "Tidak ada item ditemukan untuk PO ini"
                                  : "Scan barcode untuk melihat item"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress Indicator */}
              {searchResult?.items?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress Penerimaan
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {
                        searchResult.items.filter(
                          (i) => i.request === i.received,
                        ).length
                      }{" "}
                      / {searchResult.items.length} item
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-950 to-blue-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${(searchResult.items.filter((i) => i.request === i.received).length / searchResult.items.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ModalItemEdit
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        onConfirm={handleManualEditPurchaseOrder}
      />

      <ModalConfirmation
        onConfirm={handleCompleteAllPurchaseOrder}
        title={`Selesaikan Semua Item untuk PO ${searchResult?.Erp}?`}
        message="Tindakan ini akan menandai semua item dalam Purchase Order ini sebagai telah diterima (received) sesuai jumlah request."
        onCancel={() => {
          const modal = document.getElementById("modal_confirmation");
          if (modal) modal.close();
        }}
      />
    </div>
  );
};

export default PurchaseOrderReceive;
