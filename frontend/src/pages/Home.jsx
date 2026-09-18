import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
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
  UserRound,
  Store,
  FileText,
  HelpCircle,
  BookOpen,
  Bug,
  Star,
  ChevronRight,
  Grid,
  Mail,
  MapPin,
  Settings,
  MessageCircle,
  Network,
} from "lucide-react";

const DashboardPreview = lazy(() => import("../components/DashboardPreview"));
const QuickAccessCards = lazy(() => import("../components/QuickAccessCards"));
const ToolsAndResources = lazy(() => import("../components/ToolsAndResources"));

const pageCategories = {
  laporan: ["/sales_report", "/invoices", "/stack_trace", "/report_list"],
  inventori: [
    "/item_library",
    "/brands",
    "/purchase_order_create",
    "/purchase_order_receive",
  ],
  promosi: ["/promo", "/diskon", "/voucher", "/voucher/generation"],
  akun: ["/all_account", "/spg_reference", "/profile", "/customer_list"],
  transaksi: [
    "/outlet_list",
    "/payment_method",
    "/printer_config",
    "/kwitansi_pembayaran_tertunda",
  ],
  sistem: [
    "/email_config",
    "/whatsapp_config",
    "/ldap_config",
    "/artikel_documentation",
    "/downloads/apk",
    "/about",
    "/dashboard",
  ],
};

const categoryMeta = {
  laporan: { label: "Laporan", className: "bg-blue-100 text-blue-800" },
  inventori: { label: "Inventori", className: "bg-emerald-100 text-emerald-800" },
  promosi: { label: "Promosi", className: "bg-amber-100 text-amber-800" },
  akun: { label: "Akun", className: "bg-indigo-100 text-indigo-800" },
  transaksi: { label: "Transaksi", className: "bg-violet-100 text-violet-800" },
  sistem: { label: "Sistem", className: "bg-slate-100 text-slate-800" },
};

const quickLinks = [
  {
    path: "/invoices",
    icon: ShoppingCart,
    label: "Invoice",
    iconWrap: "bg-blue-100 text-blue-700",
  },
  {
    path: "/item_library",
    icon: Package,
    label: "Inventori",
    iconWrap: "bg-emerald-100 text-emerald-700",
  },
  {
    path: "/voucher",
    icon: Gift,
    label: "Voucher",
    iconWrap: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    path: "/promo",
    icon: Gift,
    label: "Promo",
    iconWrap: "bg-amber-100 text-amber-700",
  },
  {
    path: "/diskon",
    icon: Percent,
    label: "Diskon",
    iconWrap: "bg-rose-100 text-rose-700",
  },
  {
    path: "/sales_report",
    icon: BarChart3,
    label: "Laporan",
    iconWrap: "bg-violet-100 text-violet-700",
  },
  {
    path: "/all_account",
    icon: Users,
    label: "Akun",
    iconWrap: "bg-indigo-100 text-indigo-700",
  },
  {
    path: "/spg_reference",
    icon: UserRound,
    label: "SPG",
    iconWrap: "bg-sky-100 text-sky-700",
  },
  {
    path: "/outlet_list",
    icon: Store,
    label: "Outlet",
    iconWrap: "bg-teal-100 text-teal-700",
  },
  {
    path: "/email_config",
    icon: Mail,
    label: "Email",
    iconWrap: "bg-blue-100 text-blue-700",
  },
  {
    path: "/whatsapp_config",
    icon: MessageCircle,
    label: "WhatsApp",
    iconWrap: "bg-emerald-100 text-emerald-700",
  },
  {
    path: "/ldap_config",
    icon: Network,
    label: "LDAP",
    iconWrap: "bg-slate-100 text-slate-700",
  },
];

const popularPaths = [
  "/invoices",
  "/item_library",
  "/dashboard",
  "/promo",
  "/diskon",
  "/sales_report",
];

const formatPathLabel = (path) =>
  path.replace(/^\//, "").replace(/\//g, " / ").replace(/_/g, " ");

const findCategoryForPath = (path) =>
  Object.entries(pageCategories).find(([, paths]) => paths.includes(path))?.[0];

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  const popularPages = useMemo(
    () =>
      popularPaths
        .map((path) => mockPages.find((page) => page.originalPath === path))
        .filter(Boolean),
    [],
  );

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedResultIndex(-1);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    setSearchResults(
      mockPages.filter(
        (page) =>
          page.originalPath.toLowerCase().includes(q) ||
          page.description.toLowerCase().includes(q),
      ),
    );
  }, []);

  const goTo = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

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
        goTo(searchResults[selectedResultIndex].originalPath);
      }
    },
    [searchResults, selectedResultIndex, goTo],
  );

  return (
    <>
      <title>
        CSI SUPER POS - Sistem POS by CSI untuk penjualan di outlet dan event
        besar PT. Catur Sukses Internasional
      </title>
      <meta
        name="description"
        content="CSI SUPER POS adalah Sistem POS by CSI untuk penjualan di outlet dan event besar internal PT Catur Sukses Internasional (CSI)."
      />

      <div className="md:mt-20 max-md:mt-20">
        <MenuNavigation />

        <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-slate-50">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-blue-900">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full opacity-20 blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white rounded-3xl border border-white/20 shadow-lg">
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
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto">
                {APP_DESC}
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="relative -mt-12 mb-10">
              <div className="max-w-2xl mx-auto relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-16 py-4 bg-white border-0 rounded-2xl shadow-xl focus:ring-4 focus:ring-blue-200 transition-all text-gray-800 placeholder-gray-400"
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

                {isSearchFocused && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <>
                        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                          {searchResults.map((page, index) => {
                            const category = findCategoryForPath(
                              page.originalPath,
                            );
                            return (
                              <button
                                type="button"
                                key={page.originalPath}
                                className={`w-full p-4 text-left hover:bg-blue-50/50 transition-all ${
                                  selectedResultIndex === index
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                                onClick={() => goTo(page.originalPath)}
                                onMouseEnter={() =>
                                  setSelectedResultIndex(index)
                                }
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className="font-semibold text-gray-800">
                                        {formatPathLabel(page.originalPath)}
                                      </h4>
                                      {category && (
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-full ${categoryMeta[category].className}`}
                                        >
                                          {categoryMeta[category].label}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      {page.description}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                          <span>↑ ↓ navigasi</span>
                          <span>Enter pilih</span>
                        </div>
                      </>
                    ) : searchQuery.trim() ? (
                      <div className="p-8 text-center">
                        <Search className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">
                          Tidak ada hasil untuk &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-3">
                            FILTER KATEGORI
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(pageCategories).map(
                              ([key, paths]) => (
                                <button
                                  type="button"
                                  key={key}
                                  className={`text-xs px-3 py-1.5 rounded-full ${categoryMeta[key].className} hover:shadow-sm`}
                                  onClick={() =>
                                    setSearchResults(
                                      mockPages.filter((page) =>
                                        paths.includes(page.originalPath),
                                      ),
                                    )
                                  }
                                >
                                  {categoryMeta[key].label} ({paths.length})
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-3">
                            HALAMAN POPULER
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {popularPages.slice(0, 4).map((page, index) => (
                              <button
                                type="button"
                                key={page.originalPath}
                                className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg text-left"
                                onClick={() => goTo(page.originalPath)}
                              >
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-950 to-blue-600 text-white text-xs flex items-center justify-center font-medium">
                                  {index + 1}
                                </span>
                                <span className="text-sm truncate">
                                  {formatPathLabel(page.originalPath)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-600" />
                Akses Cepat
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-4 text-left transition-all hover:-translate-y-0.5"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl ${item.iconWrap} flex items-center justify-center mb-3`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-medium text-gray-800 text-sm">
                        {item.label}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 group-hover:text-blue-600">
                        Buka →
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Halaman Populer
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularPages.map((page, index) => (
                  <button
                    type="button"
                    key={page.originalPath}
                    onClick={() => goTo(page.originalPath)}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-4 text-left transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-950 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
                          {formatPathLabel(page.originalPath)}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {page.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              }
            >
              <DashboardPreview />
              <QuickAccessCards />
              <ToolsAndResources />
            </Suspense>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white mt-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Butuh Bantuan?</h2>
                    <p className="text-blue-100">
                      Dokumentasi, laporan bug, atau pengaturan sistem
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => goTo("/artikel_documentation")}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium border border-white/20 flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    Dokumentasi
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo("/report_list")}
                    className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-medium shadow flex items-center gap-2"
                  >
                    <Bug className="w-5 h-5" />
                    Report List
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo("/about")}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium border border-white/20 flex items-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    About
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20">
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
