import React, { useState, useRef, useCallback } from "react";
import { useFilter, useUserInfo } from "../store";
import { useQuery } from "@tanstack/react-query";
import { getOuletByUserId } from "../api/outletApi";
import ModalFilterByBrand from "./ModalFilterByBrand";
import { getAllBrands } from "@/api/brandApi";


import {
  Search,
  X,
  SlidersHorizontal,
  Loader2,
  Calendar,
  Package,
  Info,
  RotateCcw,
  Check,
} from "lucide-react";

const FilterInventories = ({ onChange }) => {
  const { userInfo } = useUserInfo();
  const { setFilter: setFilterZustand } = useFilter();

  const { data: myOutlet } = useQuery({
    queryKey: ["outlet", userInfo?._id],
    queryFn: () => getOuletByUserId(userInfo?._id),
    enabled: !!userInfo?._id,
  });

  const { data: brandList } = useQuery({
    queryKey: ["brand"],
    queryFn: () => getAllBrands(),
  });

  const initialFilter = {
    startDate: "",
    endDate: "",
    limit: 100,
    skip: 0,
    asc: true,
    searchKey: "",
    page: 1,
    brandIds: [],
    requiredQuantity: false,
    requiredRpHargaDasar: false,
    requiredBarcodeItem: false,
  };

  const [filter, setFilter] = useState(initialFilter);
  const [expanded, setExpanded] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const formRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const debouncedUpdateFilter = useCallback(
    (updatedFilter) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsDebouncing(true);

      debounceTimerRef.current = setTimeout(() => {
        setFilter(updatedFilter);
        if (onChange) onChange(updatedFilter);
        setIsDebouncing(false);
      }, 500);
    },
    [onChange]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    const updatedFilter = {
      ...filter,
      [name]: newValue,
    };

    setFilter(updatedFilter);

    if (name === "searchKey") {
      debouncedUpdateFilter(updatedFilter);
    }
  };

  const handleConfirmBrandFilter = (temporarySelected) => {
    const updatedFilter = {
      ...filter,
      brandIds: temporarySelected,
    };
    setFilter(updatedFilter);
    if (onChange) onChange(updatedFilter);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      setIsDebouncing(false);
    }

    const updatedFilter = {
      ...filter,
      page: 1,
      skip: 0,
    };
    setFilter(updatedFilter);
    if (onChange) onChange(updatedFilter);
  };

  const handleResetSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      setIsDebouncing(false);
    }

    const resetState = { ...filter, searchKey: "" };
    setFilter(resetState);
    if (onChange) onChange(resetState);
  };

  const handleResetFilter = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      setIsDebouncing(false);
    }

    const resetState = {
      ...initialFilter,
      brandIds: [],
      page: 1,
      skip: 0,
    };
    setFilter(resetState);
    setExpanded(false);
    if (onChange) onChange(resetState);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto mb-4">
      {/* Top Main Filter Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full">
        {/* Search Input Container */}
        <div className="relative flex-1 w-full flex items-center bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <div className="pl-3.5 pr-2 text-gray-400 pointer-events-none">
            {isDebouncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            type="text"
            name="searchKey"
            value={filter.searchKey}
            onChange={handleChange}
            placeholder="Cari SKU atau deskripsi produk..."
            className="w-full py-2.5 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />

          {filter.searchKey && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="p-1 mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className="h-full px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-r-[11px] hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
          >
            Cari
          </button>
        </div>

        {/* Expand Drawer Button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`h-11 px-4 sm:w-auto w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium border transition-all ${
            expanded
              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filter Lanjutan</span>
          {filter.brandIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary font-semibold rounded-full">
              {filter.brandIds.length}
            </span>
          )}
        </button>
      </form>

      {/* Expanded Filter Panel */}
      {expanded && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={() => setExpanded(false)}
          />

          <div
            ref={formRef}
            className="absolute right-0 top-14 z-50 w-full sm:w-[42rem] lg:w-[48rem] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Filter Lanjutan</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sesuaikan parameter tanggal, merek, dan data spesifik
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal Awal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Tanggal Terupdate Awal
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filter.startDate}
                  onChange={handleChange}
                  className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Tanggal Akhir */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Tanggal Terupdate Akhir
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={filter.endDate}
                  onChange={handleChange}
                  className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Limit */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-700">Limit Baris Data</label>
                <input
                  type="number"
                  name="limit"
                  min="1"
                  value={filter.limit}
                  onChange={handleChange}
                  className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Brand Filter */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    Brand Filter ({myOutlet?.data?.namaOutlet || "Outlet Default"})
                    <span
                      className="tooltip tooltip-right cursor-pointer text-gray-400 hover:text-gray-600"
                      data-tip="Hanya menampilkan item terkait brand ini."
                    >
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50/50 border border-gray-200 rounded-xl min-h-[44px]">
                  {brandList?.data?.data
                    ?.filter((brand) => filter?.brandIds?.includes(brand._id))
                    .map((brand) => (
                      <span
                        key={brand._id}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-md shadow-2xs"
                      >
                        {brand.name}
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                          onClick={() => {
                            setFilter((prev) => ({
                              ...prev,
                              brandIds: prev.brandIds.filter((id) => id !== brand._id),
                            }));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
                    onClick={() => document.getElementById("modalFilterByBrand")?.showModal()}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Pilih Brand</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50/75 rounded-xl border border-gray-100">
              {[
                { id: "asc", label: "Urutan Ascending (Terbaru)", checked: filter.asc },
                { id: "requiredQuantity", label: "Hanya yang memiliki stok", checked: filter.requiredQuantity },
                { id: "requiredRpHargaDasar", label: "Hanya dengan harga dasar", checked: filter.requiredRpHargaDasar },
                { id: "requiredBarcodeItem", label: "Hanya dengan barcode", checked: filter.requiredBarcodeItem },
              ].map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    name={item.id}
                    checked={item.checked}
                    onChange={handleChange}
                    className="checkbox checkbox-sm checkbox-primary rounded"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleResetFilter}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Semua
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                      setIsDebouncing(false);
                    }
                    setExpanded(false);
                    setFilterZustand(filter);
                    if (onChange) onChange(filter);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ModalFilterByBrand
        onConfirm={handleConfirmBrandFilter}
        selectedBrand={filter.brandIds}
      />
    </div>
  );
};


export default FilterInventories;
