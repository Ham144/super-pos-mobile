import {
  NAV_CODEUNIT_NS,
  NAV_SOAP_OPERATIONS,
  defaultSoapAction,
} from "./constants.js";

export const createDefaultNavOperations = () => [
  {
    key: NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
    soapAction: defaultSoapAction(
      NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP,
    ),
    enabled: true,
    bodyTemplate: "",
  },
  {
    key: NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
    soapAction: defaultSoapAction(
      NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES,
    ),
    enabled: true,
    bodyTemplate: "",
  },
  {
    key: NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT,
    soapAction: defaultSoapAction(NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT),
    enabled: true,
    bodyTemplate: "",
  },
  {
    key: NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO,
    soapAction: defaultSoapAction(NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO),
    enabled: true,
    bodyTemplate: "",
  },
  {
    key: NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    soapAction: defaultSoapAction(
      NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    ),
    enabled: true,
    bodyTemplate: "",
  },
  {
    key: NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY,
    soapAction: defaultSoapAction(
      NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY,
    ),
    enabled: true,
    bodyTemplate: "",
  },
];

/**
 * Operasi SOAP final untuk disimpan/dipakai: pakai `incoming` kalau diisi, kalau tidak
 * pakai `existing`; operasi default yang belum ada selalu ditambahkan (enabled: true).
 * Entri yang sudah ada (termasuk enabled:false) tidak diubah.
 */
export const resolveSoapOperations = (incoming, existing) => {
  const base =
    Array.isArray(incoming) && incoming.length
      ? incoming
      : Array.isArray(existing) && existing.length
        ? existing
        : [];
  const cleaned = base.filter((op) => op && op.key);
  const keys = new Set(cleaned.map((op) => op.key));
  const missing = createDefaultNavOperations().filter((op) => !keys.has(op.key));
  return [...cleaned, ...missing];
};

/**
 * Seed helper — caller wajib kirim nilai dari .env (bukan fallback di sini).
 */
export const createDefaultSoapSeed = ({
  endpoint,
  usernameNTLM,
  passwordNTLM,
  noSeries,
  sellToCustNo,
  sellToCustName,
}) => {
  if (!endpoint || !usernameNTLM || !passwordNTLM) {
    throw new Error(
      "endpoint, usernameNTLM, dan passwordNTLM wajib untuk seed SOAP NAV",
    );
  }
  if (!noSeries || !sellToCustNo || !sellToCustName) {
    throw new Error(
      "noSeries, sellToCustNo, dan sellToCustName wajib untuk seed SOAP NAV",
    );
  }

  return {
    endpoint,
    usernameNTLM,
    passwordNTLM,
    timeoutMs: 30000,
    // legacy top-level
    noSeries,
    defaults: {
      noSeries,
      sellToCustNo,
      sellToCustName,
    },
    operations: createDefaultNavOperations(),
  };
};

export { NAV_CODEUNIT_NS };
