/**
 * Keputusan void dari web admin (invoice.route voidInvoice).
 * Offline: restore stok Mongo. Stateless: NAV undo, atau tolak jika belum ship.
 */
export const resolveWebVoidPath = ({
  outletMode,
  navDocumentNo,
  navShipmentNo,
}) => {
  if (outletMode === "stateless") {
    if (navDocumentNo || navShipmentNo) return "nav_voidBill";
    return "reject_mobile_only";
  }
  return "offline_mongo";
};
