/**
 * Backend source of truth for deny-list RBAC (blockedAccess).
 * Paths must match frontend mockPages / mockBackend `originalPath` values.
 * authorize.js uses startsWith for API prefixes; LevelWrapper uses exact path match for UI.
 */

/** UI routes (mirror frontend/src/api/constant.js → mockPages + main.jsx) */
export const ACCESS_PAGE_PATHS = [
  "/dashboard",
  "/downloads/apk",
  "/sales_report",
  "/invoices",
  "/report_list",
  "/item_library",
  "/promo",
  "/diskon",
  "/voucher",
  "/voucher/generation",
  "/brands",
  "/purchase_order_create",
  "/purchase_order_receive",
  "/customer_list",
  "/all_account",
  "/spg_reference",
  "/outlet_list",
  "/payment_method",
  "/printer_config",
  "/kwitansi_pembayaran_tertunda",
  "/profile",
  "/artikel_documentation",
  "/email_config",
  "/whatsapp_config",
  "/ldap_config",
  "/stack_trace",
  "/about",
];

/**
 * Default deny list for auto-provisioned LDAP users (role Kasir).
 * Blocks catalog/admin UI + matching management APIs.
 * Does NOT block POS read / checkout paths (getInventory, voucher redeem, etc.).
 */
export const DEFAULT_BLOCKED_ACCESS_LDAP = [
  // UI
  "/item_library",
  "/promo",
  "/diskon",
  "/voucher",
  "/voucher/generation",
  "/brands",
  "/all_account",
  "/outlet_list",
  "/payment_method",
  "/printer_config",
  "/email_config",
  "/whatsapp_config",
  "/ldap_config",
  "/report_list",
  "/stack_trace",
  "/downloads/apk",
  // Management APIs (prefix-friendly)
  "/api/v1/auth/createNewUser",
  "/api/v1/auth/updateUser",
  "/api/v1/auth/getAllAccount",
  "/api/v1/inventories/registerSingleInventori",
  "/api/v1/inventories/updateSingleInventori",
  "/api/v1/inventories/updateBulkPrices",
  "/api/v1/inventories/importInventoryCsv",
  "/api/v1/inventories/disableSingleInventoriToggle",
  "/api/v1/promo/registerPromo",
  "/api/v1/promo/updatePromo",
  "/api/v1/promo/importPromoCsv",
  "/api/v1/diskon/registerDiskon",
  "/api/v1/diskon/updateDiskon",
  "/api/v1/diskon/deleteDiskon",
  "/api/v1/diskon/registerMultiDiskon",
  "/api/v1/voucher/addVoucherLogic",
  "/api/v1/voucher/editVoucherLogic",
  "/api/v1/voucher/deleteVoucherLogic",
  "/api/v1/outlet/registerOutlet",
  "/api/v1/outlet/edit",
  "/api/v1/outlet/delete",
  "/api/v1/outlet/assignUserToOutlet",
  "/api/v1/outlet/linkBrandToOutlet",
  "/api/v1/admin/whatsapp-config",
  "/api/v1/admin/ad-config",
  "/api/v1/admin/test-whatsapp",
  "/api/v1/admin/test-ldap",
];
