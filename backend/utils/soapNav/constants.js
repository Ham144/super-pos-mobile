export const NAV_CODEUNIT_NS =
  "urn:microsoft-dynamics-schemas/codeunit/WSNav";

export const NAV_XMLPORTS = {
  salesHeader: "urn:microsoft-dynamics-nav/xmlports/x50032",
  salesShipmentLines: "urn:microsoft-dynamics-nav/xmlports/x50031",
  inventoryPerLocation: "urn:microsoft-dynamics-nav/xmlports/x50033",
};

export const NAV_SOAP_OPERATIONS = {
  SALES_ORDER_AUTO_POSTING_SHIP: "SalesOrderAutoPostingShip",
  GET_SALES_SHIPMENT_LINES: "GetSalesShipmentLines",
  WS_UNDO_SHIPMENT: "WsUndoShipment",
  WS_POST_INVOICE_SO: "WsPostInvoiceSO",
  GET_INVENTORY_BY_LOCATION_MULTIPLE: "GetInventoryByLocationMultiple",
  GET_STATELESS_INVENTORY: "GetStatelessInventory",
};

export const defaultSoapAction = (operationKey) =>
  `${NAV_CODEUNIT_NS}:${operationKey}`;

export const requireSoapDefault = (value, fieldName) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`defaults.${fieldName} belum dikonfigurasi di SOAP NAV`);
  }
  return String(value).trim();
};
