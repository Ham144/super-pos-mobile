import Soap from "../../models/Soap.model.js";
import Outlet from "../../models/Outlet.model.js";
import {
  defaultSoapAction,
  NAV_SOAP_OPERATIONS,
  requireSoapDefault,
} from "./constants.js";
import { buildSoapXml } from "./buildXml.js";
import {
  callSoapNav,
  extractXmlTagValue,
  parseInventoryPerLocationList,
} from "./callSoap.js";

const normalizeSkuKey = (sku) => String(sku ?? "").trim().toUpperCase();
const normalizeLocationKey = (code) => String(code ?? "").trim().toUpperCase();

const operationNeedsLocationCode = (operationKey) =>
  operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP ||
  operationKey === NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE ||
  operationKey === NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY;

export const getOutletLocationCode = async (outletId) => {
  const outlet = await Outlet.findById(outletId).select("kodeOutlet").lean();
  if (!outlet) {
    throw new Error("Outlet tidak ditemukan");
  }

  return requireSoapDefault(outlet.kodeOutlet, "kodeOutlet");
};

const getResolvedLocationCode = async (outletId, payload = {}) => {
  if (payload.locationCode) {
    return requireSoapDefault(payload.locationCode, "locationCode");
  }

  return getOutletLocationCode(outletId);
};

const assertDefaultsForOperation = (soapConfig, operationKey) => {
  if (operationKey === NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP) {
    requireSoapDefault(
      soapConfig.defaults?.noSeries || soapConfig.noSeries,
      "noSeries",
    );
    requireSoapDefault(soapConfig.defaults?.sellToCustNo, "sellToCustNo");
  }
};

export const getSoapConfigByOutlet = async (outletId) => {
  return Soap.findOne({ outlet: outletId }).lean();
};

export const getEnabledOperation = (soapConfig, operationKey) => {
  const operation = soapConfig?.operations?.find(
    (item) => item.key === operationKey,
  );

  if (!operation) {
    throw new Error(`Operasi ${operationKey} belum dikonfigurasi untuk outlet ini`);
  }

  if (operation.enabled === false) {
    throw new Error(`Operasi ${operationKey} dinonaktifkan untuk outlet ini`);
  }

  return operation;
};

export const executeNavSoap = async ({
  outletId,
  operationKey,
  payload = {},
}) => {
  const soapConfig = await getSoapConfigByOutlet(outletId);
  if (!soapConfig) {
    throw new Error("Konfigurasi SOAP NAV belum ada untuk outlet ini");
  }

  assertDefaultsForOperation(soapConfig, operationKey);

  const operation = getEnabledOperation(soapConfig, operationKey);

  const resolvedPayload = { ...payload };
  if (operationNeedsLocationCode(operationKey)) {
    resolvedPayload.locationCode = await getResolvedLocationCode(
      outletId,
      payload,
    );
  }

  const xmlBody = buildSoapXml(operationKey, resolvedPayload);

  const soapAction =
    operation.soapAction || defaultSoapAction(operationKey);

  const response = await callSoapNav({
    endpoint: soapConfig.endpoint,
    usernameNTLM: soapConfig.usernameNTLM,
    passwordNTLM: soapConfig.passwordNTLM,
    soapAction,
    xmlBody,
    timeoutMs: soapConfig.timeoutMs,
  });

  return {
    operationKey,
    requestXml: xmlBody,
    response,
    parsed: {
      returnValue: extractXmlTagValue(response.body, "return_value"),
    },
  };
};

export const buildQuantityBySkuMap = (parsedItems = [], locationCode) => {
  const wantedLocation = normalizeLocationKey(locationCode);
  const quantityBySku = {};
  const preferredHit = {};

  for (const row of parsedItems) {
    const key = normalizeSkuKey(row?.itemNo);
    if (!key) continue;

    const qty = Number(row?.quantity);
    const safeQty = Number.isFinite(qty) ? qty : 0;
    const rowLocation = normalizeLocationKey(row?.locationCode);
    const locationMatches =
      !wantedLocation || !rowLocation || rowLocation === wantedLocation;

    if (locationMatches) {
      quantityBySku[key] = safeQty;
      preferredHit[key] = true;
      continue;
    }

    if (!preferredHit[key] && quantityBySku[key] === undefined) {
      quantityBySku[key] = safeQty;
    }
  }

  return quantityBySku;
};

const mapLimit = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const run = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  };

  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    run(),
  );
  await Promise.all(runners);
  return results;
};

/**
 * Satu panggilan SOAP untuk satu SKU (format sama seperti Postman).
 * Batch multi-SKU di GetInventoryByLocationMultiple CSI tidak andal —
 * qty bisa tertukar/salah (CRJ3302S single=0, batch=1/8).
 */
const fetchNavStockForOneSku = async ({
  outletId,
  sku,
  locationCode,
  operationKey,
}) => {
  const result = await executeNavSoap({
    outletId,
    operationKey,
    payload: {
      items: [{ itemNo: sku, locationCode, quantity: 0 }],
      locationCode,
    },
  });

  let parsedItems = parseInventoryPerLocationList(result.response?.body);
  if (!parsedItems.length && result.parsed?.returnValue) {
    parsedItems = parseInventoryPerLocationList(result.parsed.returnValue);
  }

  const quantityBySku = buildQuantityBySkuMap(parsedItems, locationCode);
  const key = normalizeSkuKey(sku);
  const hasQty = Object.prototype.hasOwnProperty.call(quantityBySku, key);

  return {
    sku,
    key,
    quantity: hasQty ? quantityBySku[key] : null,
    parsedItems,
    result,
  };
};

export const checkInventoryByOutlet = async ({
  outletId,
  skus = [],
  operationKey = NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
  concurrency = 8,
}) => {
  const locationCode = await getOutletLocationCode(outletId);
  const requestedSkus = [
    ...new Set(skus.map((s) => String(s).trim()).filter(Boolean)),
  ];

  if (requestedSkus.length === 0) {
    return {
      operationKey,
      items: [],
      quantityBySku: {},
      requestedSkus: [],
    };
  }

  // Selalu 1 SKU / request — selaras Postman; batch multi-line di NAV CSI corrupt qty
  const rows = await mapLimit(requestedSkus, concurrency, (sku) =>
    fetchNavStockForOneSku({
      outletId,
      sku,
      locationCode,
      operationKey,
    }),
  );

  const quantityBySku = {};
  const parsedItems = [];
  let lastResult = null;

  for (const row of rows) {
    lastResult = row.result;
    parsedItems.push(...(row.parsedItems || []));
    if (row.quantity !== null) {
      quantityBySku[row.key] = row.quantity;
    }
  }

  if (process.env.NODE_ENV === "development") {
    const sample = requestedSkus.slice(0, 5).map((sku) => {
      const key = normalizeSkuKey(sku);
      return { sku, navQty: quantityBySku[key] };
    });
  }

  const requestedKeys = requestedSkus.map(normalizeSkuKey);
  const matched = requestedKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(quantityBySku, key),
  );

  if (requestedSkus.length > 0 && matched.length === 0) {
    const err = new Error(
      `NAV ${operationKey}: response tidak memuat SKU yang diminta (parsed=${parsedItems.length})`,
    );
    err.code = "NAV_SKU_MISMATCH";
    throw err;
  }

  return {
    ...(lastResult || {}),
    operationKey,
    items: parsedItems,
    quantityBySku,
    requestedSkus,
  };
};

/**
 * Overlay NAV qty onto the current page of Mongo inventory docs.
 * Stateless: stok = NAV. Jangan fallback ke qty Mongo (bisa stale, mis. 8
 * padahal Postman/NAV bilang 0) — SKU absen di response NAV = 0.
 */
export const enrichInventoriesWithNavStock = async (
  outletId,
  inventories = [],
  {
    operationKey = NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
  } = {},
) => {
  const list = (inventories || []).map((inv) =>
    typeof inv?.toObject === "function" ? inv.toObject() : { ...inv },
  );
  const skus = list.map((inv) => inv.sku).filter(Boolean);

  if (!outletId || skus.length === 0) {
    return {
      inventories: list.map((inv) => ({
        ...inv,
        quantityLocal: inv.quantity,
        quantity: 0,
        stockSource: "local",
      })),
      stockSource: "local",
      navError: null,
    };
  }

  // GetStatelessInventory invalid di NAV CSI — taruh paling belakang
  const tryOps = [
    operationKey,
    NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY,
  ].filter((op, idx, arr) => op && arr.indexOf(op) === idx);

  let lastError = null;
  for (const op of tryOps) {
    try {
      const result = await checkInventoryByOutlet({
        outletId,
        skus,
        operationKey: op,
      });
      const enriched = list.map((inv) => {
        const key = normalizeSkuKey(inv.sku);
        const hasNav = Object.prototype.hasOwnProperty.call(
          result.quantityBySku,
          key,
        );
        // NAV sukses: qty dari map (termasuk 0). SKU tidak dikembalikan NAV = 0,
        // BUKAN quantity Mongo — itu yang bikin UI nunjukin 8 sementara Postman 0.
        return {
          ...inv,
          quantityLocal: inv.quantity,
          quantity: hasNav ? result.quantityBySku[key] : 0,
          stockSource: hasNav ? "nav" : "nav-missing",
        };
      });

      if (process.env.NODE_ENV === "development") {
        const sample = enriched.slice(0, 5).map((inv) => {
          const key = normalizeSkuKey(inv.sku);
          return {
            sku: inv.sku,
            navQty: inv.quantity,
            mongoQty: inv.quantityLocal,
            stockSource: inv.stockSource,
            rawNav: result.quantityBySku[key],
          };
        });
      }

      return {
        inventories: enriched,
        stockSource: "nav",
        navError: null,
        quantityBySku: result.quantityBySku,
        operationKey: op,
      };
    } catch (error) {
      lastError = error;
    }
  }

  // Soft-fail: jangan tampilkan qty Mongo seolah live NAV
  return {
    inventories: list.map((inv) => ({
      ...inv,
      quantityLocal: inv.quantity,
      quantity: 0,
      stockSource: "local",
    })),
    stockSource: "local",
    navError: lastError?.message || "NAV stock gagal",
  };
};

export default {
  getSoapConfigByOutlet,
  getOutletLocationCode,
  executeNavSoap,
  checkInventoryByOutlet,
  enrichInventoriesWithNavStock,
  buildQuantityBySkuMap,
};
