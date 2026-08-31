import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import MenuNavigation from "../components/MenuNavigation";
import { APP_NAME, mockPages, APP_DESC } from "../api/constant";

import {
  Search,
  ShoppingCart,
  Package,
  Percent,
  Gift,
  BarChart3,
  Users,
  Presentation,
  Store,
  FileText,
  HelpCircle,
  BookOpen,
  Bug,
  Star,
  ChevronRight,
  Grid,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

// Lazy load components
const DashboardPreview = lazy(() => import("../components/DashboardPreview"));
const QuickAccessCards = lazy(() => import("../components/QuickAccessCards"));
const ToolsAndResources = lazy(() => import("../components/ToolsAndResources"));

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  // Kelompokkan halaman berdasarkan kategori
  const pageCategories = useMemo(
    () => ({
      penjualan: [
        "/invoices",
        "/sales_report",
        "/kwitansi_pembayaran_tertunda",
        "/payment_method",
      ],
      inventori: [
        "/item_library",
        "/summary",
        "/brands",
        "/purchase_order_create",
        "/purchase_order_receive",
      ],
      promosi: ["/promo", "/diskon", "/voucher"],
      pengguna: ["/all_account", "/kasir_list", "/spg_list", "/profile"],
      outlet: ["/outlet_list", "/dashboard"],
      lainnya: [
        "/ui",
        "/artikel_documentation",
        "/help",
        "/database",
        "/customer_list",
      ],
    }),
    [],
  );

  // Halaman populer yang sering diakses pengguna
  const popularPages = useMemo(
    () => [
      "/invoices",
      "/item_library",
      "/dashboard",
      "/promo",
      "/diskon",
      "/sales_report",
    ],
    [],
  );

  // Mendapatkan detail halaman dari path
  const getPageDetails = useCallback((path) => {
    return mockPages.find((page) => page.originalPath === path);
  }, []);

  // Mendapatkan halaman populer dengan detail
  const getPopularPagesWithDetails = useCallback(() => {
    return popularPages.map((path) => getPageDetails(path)).filter(Boolean);
  }, [popularPages, getPageDetails]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedResultIndex(-1);

    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const filteredPages = mockPages.filter(
      (page) =>
        page.originalPath.toLowerCase().includes(query.toLowerCase()) ||
        page.description.toLowerCase().includes(query.toLowerCase()),
    );

    setSearchResults(filteredPages);
  }, []);

  const navigateToPage = useCallback((path) => {
    window.location.href = path;
  }, []);
  
  const handleKeyDown = useCallback(
    (e) => {
      if (!searchResults.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev,
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }

      if (e.key === "Enter" && selectedResultIndex >= 0) {
        e.preventDefault();
        navigateToPage(searchResults[selectedResultIndex].originalPath);
      }
    },
    [searchResults, selectedResultIndex, navigateToPage],
  );

  // Mendapatkan label kategori dalam bahasa Indonesia
  const getCategoryLabel = useCallback((category) => {
    const labels = {
      penjualan: "Penjualan",
      inventori: "Inventori",
      promosi: "Promosi",
      pengguna: "Pengguna",
      outlet: "Outlet",
      lainnya: "Lainnya",
    };
    return labels[category] || category;
  }, []);

  // Mendapatkan warna untuk kategori
  const getCategoryColor = useCallback((category) => {
    const colors = {
      penjualan: "bg-blue-100 text-blue-800",
      inventori: "bg-green-100 text-green-800",
      promosi: "bg-yellow-100 text-yellow-800",
      pengguna: "bg-indigo-100 text-indigo-800",
      outlet: "bg-purple-100 text-purple-800",
      lainnya: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  }, []);

  return (
    <>
        <title>
          CSI SUPER POS - Sistem POS by CSI untuk penjualan di outlet dan event besar PT. Catur Sukses
          Internasional
        </title>
        <meta
          name="description"
          content="CSI SUPER POS adalah Sistem POS by CSI untuk penjualan di outlet dan event besar internal PT Catur Sukses Internasional (CSI) yang terintegrasi dengan aplikasi mobile CSI SUPER POS."
        />
        <meta
          name="keywords"
          content="Catur sukses internasional, catur sukses, CSI SUPER POS, Point of Sale, POS System, Retail Management, Inventory Management"
        />
        <meta property="og:title" content="CSI SUPER POS" />
        <meta
          property="og:description"
          content="Sistem POS by CSI untuk penjualan di outlet dan event besar internal PT Catur Sukses Internasional (CSI)"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://internal-pos.mycsi.net" />
        <link rel="canonical" href="https://internal-pos.mycsi.net" />
        <link rel="preconnect" href="https://internal-pos.mycsi.net" />

      <div className="md:mt-20 max-md:mt-20">
        <MenuNavigation />

        {/* Main Content */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-gray-50">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-blue-900">
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10"></div>
              </div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
              <div className="text-center">
                {/* Logo/Brand */}
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-white rounded-3xl backdrop-blur-sm border border-white/20">
                    <img
                      src="/internal-pos.png"
                      alt="CSI SUPER POS"
                      className="w-16 h-16 md:w-20 md:h-20"
                    />
                  </div>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                  {APP_NAME}
                </h1>
                <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                  {APP_DESC}
                </p>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="relative -mt-12 mb-8">
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-2xl shadow-xl focus:ring-4 focus:ring-blue-200 transition-all duration-200 text-gray-800 placeholder-gray-400"
                      placeholder="Cari fitur atau halaman..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() =>
                        setTimeout(() => setIsSearchFocused(false), 200)
                      }
                      onKeyDown={handleKeyDown}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                      ⌘K
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {isSearchFocused && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <>
                        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                          {searchResults.map((page, index) => (
                            <div
                              key={index}
                              className={`p-4 hover:bg-blue-50/50 cursor-pointer transition-all ${
                                selectedResultIndex === index
                                  ? "bg-blue-50"
                                  : ""
                              }`}
                              onClick={() => navigateToPage(page.originalPath)}
                              onMouseEnter={() => setSelectedResultIndex(index)}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-md">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-800">
                                      {page.originalPath
                                        .replace("/", "")
                                        .replace(/_/g, " ")}
                                    </h4>
                                    {Object.entries(pageCategories).map(
                                      ([category, paths]) =>
                                        paths.includes(page.originalPath) ? (
                                          <span
                                            key={category}
                                            className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(category)}`}
                                          >
                                            {getCategoryLabel(category)}
                                          </span>
                                        ) : null,
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {page.description}
                                  </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                          <span>Tekan ↑ ↓ untuk navigasi</span>
                          <span>Enter untuk memilih</span>
                        </div>
                      </>
                    ) : searchQuery.trim() !== "" ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600">
                          Tidak ada hasil untuk "{searchQuery}"
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Coba kata kunci lain
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Category Filters */}
                        <div className="p-4 border-b border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-3">
                            FILTER KATEGORI
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(pageCategories).map(
                              ([category, paths]) => (
                                <button
                                  key={category}
                                  className={`text-xs px-3 py-1.5 rounded-full ${getCategoryColor(category)} transition-all hover:shadow-md`}
                                  onClick={() => {
                                    const categoryPages = mockPages.filter(
                                      (page) =>
                                        paths.includes(page.originalPath),
                                    );
                                    setSearchResults(categoryPages);
                                  }}
                                >
                                  {getCategoryLabel(category)} ({paths.length})
                                </button>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Popular Pages */}
                        <div className="p-4">
                          <p className="text-xs font-medium text-gray-500 mb-3">
                            HALAMAN POPULER
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {getPopularPagesWithDetails()
                              .slice(0, 4)
                              .map((page, index) => (
                                <button
                                  key={index}
                                  className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors text-left"
                                  onClick={() =>
                                    navigateToPage(page.originalPath)
                                  }
                                >
                                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-950 to-blue-600 text-white text-xs flex items-center justify-center font-medium">
                                    {index + 1}
                                  </span>
                                  <span className="text-sm truncate flex-1">
                                    {page.originalPath
                                      .replace("/", "")
                                      .replace(/_/g, " ")}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Category Navigation */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-600" />
                Akses Cepat Berdasarkan Kategori
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[
                  {
                    path: "/invoices",
                    icon: ShoppingCart,
                    label: "Penjualan",
                    color: "blue",
                  },
                  {
                    path: "/item_library",
                    icon: Package,
                    label: "Inventori",
                    color: "green",
                  },
                  {
                    path: "/voucher",
                    icon: Percent,
                    label: "Voucher",
                    color: "green",
                  },
                  {
                    path: "/promo",
                    icon: Gift,
                    label: "Promo",
                    color: "yellow",
                  },
                  {
                    path: "/diskon",
                    icon: Percent,
                    label: "Diskon",
                    color: "red",
                  },
                  {
                    path: "/sales_report",
                    icon: BarChart3,
                    label: "Laporan",
                    color: "purple",
                  },
                  {
                    path: "/all_account",
                    icon: Users,
                    label: "Kasir",
                    color: "indigo",
                  },
                  {
                    path: "/spg",
                    icon: Presentation,
                    label: "SPG",
                    color: "indigo",
                  },
                  {
                    path: "/outlet_list",
                    icon: Store,
                    label: "Outlet",
                    color: "indigo",
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      onClick={() => navigateToPage(item.path)}
                      className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-${item.color}-100 group-hover:bg-${item.color}-200 flex items-center justify-center mb-3 transition-colors`}
                      >
                        <Icon className={`w-6 h-6 text-${item.color}-600`} />
                      </div>
                      <h3 className="font-medium text-gray-800 text-sm">
                        {item.label}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Lihat detail →
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Pages Section */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Halaman Populer
                </h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Akses Cepat
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getPopularPagesWithDetails().map((page, index) => (
                  <div
                    key={index}
                    onClick={() => navigateToPage(page.originalPath)}
                    className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {page.originalPath
                            .replace("/", "")
                            .replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {page.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lazy Loaded Components */}
            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                </div>
              }
            >
              <DashboardPreview />
            </Suspense>
              
            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="loading loading-spinner loading-lg text-blue-600"></div>
                </div>
              }
            >
              <QuickAccessCards />
            </Suspense>

            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="loading loading-spinner loading-lg text-blue-600"></div>
                </div>
              }
            >
              <ToolsAndResources />
            </Suspense>

            {/* Support Section */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white mt-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Butuh Bantuan?</h2>
                    <p className="text-blue-100">
                      Temukan panduan penggunaan sistem dan informasi terkini
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigateToPage("/artikel_documentation")}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors backdrop-blur-sm border border-white/20 flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    Dokumentasi
                  </button>
                  <button
                    onClick={() => {
                      document.getElementById("report_modal").showModal();
                      // Buka modal report bug
                    }}
                    className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-colors shadow-lg flex items-center gap-2"
                  >
                    <Bug className="w-5 h-5" />
                    Report Bug
                  </button>
                </div>
              </div>

              {/* Quick Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-200" />
                  <span className="text-sm">yafizham@catur.co.id</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-200" />
                  <span className="text-sm">Jakarta, Indonesia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
  );
};

export default React.memo(Home);
