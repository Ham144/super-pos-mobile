import { createRoot } from "react-dom/client";
import "./index.css";
import { Route, RouterProvider, createRoutesFromElements } from "react-router";
import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import ItemLibrary from "./pages/Item_Library.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Diskon from "./pages/Diskon.jsx";
import Promo from "./pages/Promo.jsx";
import Voucher from "./pages/Voucher.jsx";
import Artikel_Documentation from "./pages/Artikel_Documentation.jsx";
import Profile from "./pages/Profile.jsx";
// import SpgList from "./pages/SpgList.jsx";
import NotFound from "./pages/not-found.jsx";
import Outlet from "./pages/Outlet.jsx";
// import KasirList from "./pages/KasirList.jsx";
import AllAccounts from "./pages/AllAccounts.jsx";
import SpgReference from "./pages/SpgReference.jsx";
import PurchaseOrderReceive from "./pages/PurchaseOrderReceive.jsx";
import PurchaseOrdersCreate from "./pages/PurchaseOrderCreate.jsx";
import LevelWrapper from "./components/LevelWrapper";
import BrandList from "./pages/BrandList";
import ReportList from "./pages/ReportList";
import PaymentMethod from "./pages/PaymentMethod";
import Printer from "./pages/Printer";
import Invoices from "./pages/Invoices";
import SumberThirdParty from "./pages/SumberThirdParty";
import SaleReport from "./pages/SalesReport";
import EmailConfig from "./pages/EmailConfig";
import KwitansiPembayaranTertunda from "./pages/KwitansiPembayaranTertunda";
import Customer_list from "./pages/Customer_list";
import About from "./pages/About";
import ConvertVoucherToGenerated from "./pages/ConvertVoucherToGenerated";
import DownloadApkPage from "./pages/DownloadsApkPage";
// import BackupSalesReport from "../src/pages/TELAH_DIHAPUS/backup_SalesReport";
import StackTraceSkuPage from "./pages/StackTraceSkuPage";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/" element={<LevelWrapper />}>
        {/*semua page mengecek sudah login apa belum getUserInfo */}
        <Route index={true} path="/" element={<Home />} />

        <Route path="/item_library" element={<ItemLibrary />} />
        <Route path="/diskon" element={<Diskon />} />
        <Route path="/promo" element={<Promo />} />
        <Route path="/voucher" element={<Voucher />} />
        <Route path="/downloads/apk" element={<DownloadApkPage />} />
        <Route
          path="/purchase_order_create"
          element={<PurchaseOrdersCreate />}
        />
        <Route
          path="/purchase_order_receive"
          element={<PurchaseOrderReceive />}
        />
        <Route
          path="/artikel_documentation"
          element={<Artikel_Documentation />}
        />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stack_trace" element={<StackTraceSkuPage />} />
        {/* <Route path="/spg_list" element={<SpgList />} /> */}
        <Route path="/all_account" element={<AllAccounts />} />
        {/* <Route path="/kasir_list" element={<KasirList />} /> */}
        <Route path="/outlet_list" element={<Outlet />} />
        <Route path="/brands" element={<BrandList />} />
        <Route path="/report_list" element={<ReportList />} />
        <Route path="/payment_method" element={<PaymentMethod />} />
        <Route path="/printer_config" element={<Printer />} />
        <Route path="/spg_reference" element={<SpgReference />} />
        <Route path="/spg_list" element={<SpgReference />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/sumber_thirdparty" element={<SumberThirdParty />} />
        <Route path="/sales_report" element={<SaleReport />} />
        <Route path="/email_config" element={<EmailConfig />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/kwitansi_pembayaran_tertunda"
          element={<KwitansiPembayaranTertunda />}
        />
        <Route path="/customer_list" element={<Customer_list />} />
        <Route
          path="/voucher/generation"
          element={<ConvertVoucherToGenerated />}
        />
        {/* </Route> */}
      </Route>
      <Route index={true} path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
