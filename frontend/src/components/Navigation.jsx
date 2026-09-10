import { useUserInfo } from "@/store";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  Lock,
  LogOut,
  FileText,
  AlertCircle,
  Info,
  BarChart3,
  Package,
  Users,
  CreditCard,
  Receipt,
  Printer,
  Tags,
  Percent,
  Ticket,
  ShoppingCart,
  Truck,
  Wallet,
  Store,
  Zap,
  Settings,
  UserCircle,
  Mail,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/api/authApi";
import { getSimpleOuletList, switchCurrentOutlet } from "@/api/outletApi";
import toast from "react-hot-toast";
import { renderIcon } from "@/lib/utils";
import { APP_NAME } from "@/api/constant";

const LG_BREAKPOINT = 1300;

const getCurrentOutletId = (currentOutlet) => {
  if (!currentOutlet) return "";
  return typeof currentOutlet === "object"
    ? currentOutlet._id?.toString()
    : currentOutlet.toString();
};

const SideDrawer = ({ children }) => {
  const { userInfo, setUserInfo, clearUserInfo } = useUserInfo();
  const [activeMenu, setActiveMenu] = useState();
  const [nosidebar, setNosidebar] = useState(false);
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const queryClient = useQueryClient();
  const [isShowSidebar, setIsShowSidebar] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= LG_BREAKPOINT,
  );

  const { data: outletList } = useQuery({
    queryKey: ["simpleOutletList"],
    queryFn: getSimpleOuletList,
    enabled: !!userInfo,
  });

  const outlets = outletList?.data ?? [];
  const currentOutletId = getCurrentOutletId(userInfo?.currentOutlet);
  const currentOutletName =
    outlets.find((o) => o._id === currentOutletId)?.namaOutlet ||
    userInfo?.currentOutlet?.namaOutlet ||
    "";
  
  const { mutate: handleSwitchCurrentOutlet } = useMutation({
    mutationKey: ["switchCurrentOutlet"],
    mutationFn: switchCurrentOutlet,
    onSuccess: (data, outletId) => {
      const prev = useUserInfo.getState().userInfo;
      if (prev) {
        const selected =
          data?.currentOutlet ||
          outlets.find((o) => o._id === outletId) ||
          outletId;
        setUserInfo({
          ...prev,
          currentOutlet: selected,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["userInfo"] });
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to switch outlet");
    },
  });

  const { mutate: handleLogout } = useMutation({
    mutationKey: ["userInfo"],
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries(["userInfo"]);
      clearUserInfo();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Session expired");
    },
  });

  const menuItems = [
    {
      title: "REPORTS",
      icon: BarChart3,
      items: [
        { name: "SALES REPORT.", icon: BarChart3 },
        { name: "INVOICES", icon: FileText },
        { name: "STACK TRACE.", icon: Package },
      ],
    },
    {
      title: "LIBRARY",
      icon: Package,
      items: [
        { name: "ITEM LIBRARY", icon: Package },
        { name: "PROMO.", icon: Percent },
        { name: "DISKON", icon: Tags },
        { name: "VOUCHER.", icon: Ticket },
      ],
    },
    {
      title: "INVENTORY",
      icon: ShoppingCart,
      items: [
        { name: "PURCHASE ORDER CREATE", icon: ShoppingCart },
        { name: "PURCHASE ORDER RECEIVE", icon: Truck },
      ],
    },
    {
      title: "CUSTOMER",
      icon: Users,
      items: [{ name: "CUSTOMER LIST", icon: Users }],
    },
    {
      title: "ACCOUNTS",
      icon: Wallet,
      items: [
        { name: "ALL ACCOUNT", icon: Wallet },
        { name: "SPG REFERENCE", icon: Users },
      ],
    },
    {
      title: "TRANSACTION SETTINGS",
      icon: Settings,
      items: [
        { name: "OUTLET LIST", icon: Store },
        { name: "PAYMENT METHOD", icon: CreditCard },
        { name: "PRINTER CONFIG", icon: Printer },
        { name: "KWITANSI PEMBAYARAN TERTUNDA", icon: Receipt },
      ],
    },
    {
      title: "APPLICATION SETTINGS",
      icon: Zap,
      items: [
        { name: "SUMBER THIRDPARTY", icon: Zap },
        { name: "PROFILE", icon: UserCircle },
        { name: "EMAIL CONFIG", icon: Mail },
      ],
    },
  ];

  const getMenuPath = (name) =>
    `/${name
      .replace(".", "")
      .replace("nosidebar", "")
      .replace(" ", "_")
      .replace(" ", "_")
      .replace(" ", "_")
      .replace("-", "")
      .toLowerCase()}`;

  const getMenuLabel = (name) =>
    name.replace("nosidebar", "").replace(".", "").replace("-", "");

  function navigatTo(menu) {
    setActiveMenu(menu);
    const navigation = menu
      .toLowerCase()
      .split(" ")
      .join("_")
      .replace("nosidebar", "")
      .replace(".", "")
      .replace("-", "");

    queryClient.invalidateQueries(["userInfo"]);
    navigate(`/${navigation}`);
  }

  const handleMenuClick = (menu) => {
    if (menu.includes("nosidebar")) {
      setNosidebar(true);
      navigatTo(menu);
    } else {
      setNosidebar(false);
      navigatTo(menu);
    }
  };

  // large/desktop = sidebar penuh, tablet/mobile = icon saja
  useEffect(() => {
    const syncSidebarMode = () => {
      setIsShowSidebar(window.innerWidth >= LG_BREAKPOINT);
    };

    syncSidebarMode();
    window.addEventListener("resize", syncSidebarMode);
    return () => window.removeEventListener("resize", syncSidebarMode);
  }, []);

  useEffect(() => {
    setNosidebar(pathname.includes("login"));
    if (!pathname.includes("login")) {
      queryClient.invalidateQueries(["userInfo"]);
    }
  }, [pathname, queryClient]);

  const sidebarWidth = isShowSidebar ? "w-64 lg:w-72" : "w-20";

  return (
    <div className="flex max-h-screen min-h-screen relative ">
      <div
        id="sidebar"
        className={`${
          nosidebar ? "hidden" : ""
        } ${sidebarWidth} max-h-screen bg-gradient-to-b from-blue-900 to-blue-400 text-white flex flex-col h-full shrink-0 shadow-2xl transition-all duration-300`}
      >
        <div
          onClick={() => navigate("/")}
          className="p-4 bg-gradient-to-r from-blue-100 to-blue-300 border-b border-blue-300 sticky top-0 z-10 flex items-center justify-between shadow-md cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0">
              <img
                src="./logo.png"
                alt="CSI SUPER POS Logo"
                className="w-10 h-10 object-contain rounded-xl"
              />
            </div>
            {isShowSidebar && (
              <span className="text-lg font-bold text-blue-900 uppercase">
                {APP_NAME}
              </span>
            )}
          </div>
        </div>

        {userInfo && outlets.length > 0 && (
          <div
            className={`border-b border-blue-800/40 bg-blue-950/30 ${
              isShowSidebar ? "px-3 py-2" : "px-2 py-2 flex justify-center"
            }`}
          >
            {isShowSidebar ? (
              <label className="flex items-center gap-2 min-w-0">
                <Store size={14} className="shrink-0 text-blue-200" />
                <select
                  value={currentOutletId}
                  onChange={(e) => handleSwitchCurrentOutlet(e.target.value)}
                  aria-label="Pilih outlet"
                  className="flex-1 min-w-0 bg-blue-900/60 text-white text-xs rounded-lg px-2 py-1.5 border border-blue-600/30 focus:outline-none focus:border-blue-300 truncate cursor-pointer"
                >
                  {outlets.map((outlet) => (
                    <option key={outlet._id} value={outlet._id}>
                      {outlet.namaOutlet} {" - "}
                      {outlet.mode}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="relative w-10 h-8 flex items-center justify-center">
                <Store
                  size={18}
                  className="text-blue-200 pointer-events-none"
                />
                <select
                  value={currentOutletId}
                  onChange={(e) => handleSwitchCurrentOutlet(e.target.value)}
                  aria-label="Pilih outlet"
                  title={currentOutletName}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {outlets.map((outlet) => (
                    <option key={outlet._id} value={outlet._id}>
                      {outlet.namaOutlet}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-hidden p-2">
          <div className="flex items-center justify-center w-full p-1">
            <div
              role="alert"
              className={`alert relative flex items-center justify-between bg-blue-900/90 backdrop-blur-sm text-white border border-blue-400/30 rounded-2xl shadow-xl transition-all duration-300  ${
                isShowSidebar
                  ? "w-full px-3 py-2 gap-3"
                  : "w-auto px-2 py-2 gap-2"
              }`}
            >
              {/* User Profile Area */}
              {userInfo ? (
                <div
                  onClick={() => navigate("/profile")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/profile");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Profil ${userInfo.username}`}
                  className={`flex items-center gap-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors p-1 ${
                    !isShowSidebar ? "justify-center" : "flex-1 min-w-0"
                  }`}
                >
                  {/* Avatar */}
                  <div className="avatar placeholder shrink-0">
                    <div className="bg-white text-blue-900 rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-md ring-2 ring-white/20">
                      <span aria-hidden="true">
                        {userInfo.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* User Info (Only visible when sidebar is open) */}
                  {isShowSidebar && (
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      {/* Username with truncation */}
                      <p className="text-xs font-semibold  leading-tight">
                        {userInfo.username}
                      </p>

                      {/* Logout Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogout();
                        }}
                        type="button"
                        aria-label="Keluar"
                        className="flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 text-white/90 px-2 py-0.5 rounded-full w-fit transition-colors mt-1 shrink-0"
                      >
                        <LogOut
                          size={10}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                        <span className="whitespace-nowrap">Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0 justify-between w-full ">
                  {isShowSidebar && (
                    <span className="font-medium text-xs text-white/80 hidden xl:block">
                      Dashboard
                    </span>
                  )}
                  <button
                    onClick={() => navigate("/dashboard")}
                    type="button"
                    aria-label="Buka Dashboard"
                    className="p-3 "
                    title="Dashboard"
                  >
                    <ArrowRight color="white" size={15} aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Arrow Action Button */}
            </div>
          </div>
          {menuItems.map((group, idx) => (
            <div key={idx} className="mt-3">
              {isShowSidebar && (
                <h2 className="px-4 py-2 text-sm font-bold bg-blue-900 border-b border-blue-300 flex items-center gap-2">
                  {renderIcon(group.icon, 16)}
                  <span>{group.title}</span>
                </h2>
              )}
              <ul className="mt-1">
                {group.items.map((item, i) =>
                  !item.name.includes("-") ? (
                    <li
                      key={i}
                      className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-700 transition-colors duration-200 ${
                        activeMenu === item.name ? "bg-blue-700 font-bold" : ""
                      } ${isShowSidebar ? "flex items-center justify-between" : "flex justify-center"}`}
                      onClick={() => handleMenuClick(item.name)}
                      title={!isShowSidebar ? getMenuLabel(item.name) : ""}
                    >
                      <div className="shrink-0">
                        {renderIcon(item.icon, isShowSidebar ? 20 : 24)}
                      </div>
                      {isShowSidebar && (
                        <span className="flex-1 ml-3">
                          {getMenuLabel(item.name)}
                        </span>
                      )}
                      {isShowSidebar && (
                        <div className="flex items-center gap-2">
                          {userInfo?.blockedAccess?.includes(
                            getMenuPath(item.name),
                          ) ? (
                            <Lock size={16} className="text-red-400" />
                          ) : null}
                          {item.name.includes(".") && (
                            <span className="badge bg-white text-blue-800 badge-xs font-bold">
                              New
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-blue-900 text-blue-200 text-xs bg-blue-900">
          {isShowSidebar ? (
            <>
              <h2 className="font-bold mb-2 text-white">Help & Support</h2>
              <p className="flex gap-2 flex-wrap">
                <a
                  href="/artikel_documentation"
                  className="text-white hover:underline flex items-center gap-1"
                >
                  <FileText size={14} /> Docs
                </a>
                <span>•</span>
                <button
                  onClick={() =>
                    document.getElementById("report_modal")?.showModal()
                  }
                  className="text-white hover:underline flex items-center gap-1"
                >
                  <AlertCircle size={14} /> Report
                </button>
                <span>•</span>
                <a
                  href="/about"
                  className="text-white hover:underline flex items-center gap-1"
                >
                  <Info size={14} /> About
                </a>
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <a href="/artikel_documentation" title="Docs">
                <FileText size={16} />
              </a>
              <button
                onClick={() =>
                  document.getElementById("report_modal")?.showModal()
                }
                title="Report"
              >
                <AlertCircle size={16} />
              </button>
              <a href="/about" title="About">
                <Info size={16} />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6 overflow-auto min-w-0">
        {children}
      </div>
    </div>
  );
};

export default SideDrawer;
