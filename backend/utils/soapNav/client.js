import Soap from "../../models/Soap.model.js";
import Outlet from "../../models/Outlet.model.js";
import InventoryRefrensi from "../../models/InventoryRefrensi.model.js";
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

/**
 * NAV GetInventoryByLocationMultiple pada environment CSI mengembalikan
 * Quantity=0 jika jumlah baris request terlalu sedikit (≤5). Batch lebih besar akurat.
 * Pad dengan SKU lain di outlet yang sama (filler diabaikan saat overlay).
 */
const MIN_NAV_INVENTORY_LINES = 20;

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

export const padSkusForNavBatch = async (outletId, skus = []) => {
  const unique = [
    ...new Set(skus.map((s) => String(s).trim()).filter(Boolean)),
  ];
  if (unique.length >= MIN_NAV_INVENTORY_LINES) return unique;

  const need = MIN_NAV_INVENTORY_LINES - unique.length;
  const fillers = await InventoryRefrensi.find({
    outlet: outletId,
    sku: { $nin: unique },
  })
    .select("sku")
    .limit(need)
    .lean();

  for (const row of fillers) {
    if (row?.sku) unique.push(String(row.sku).trim());
  }

  return unique;
};

export const checkInventoryByOutlet = async ({
  outletId,
  skus = [],
  operationKey = NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
  padBatch = true,
}) => {
  const locationCode = await getOutletLocationCode(outletId);
  const requestedSkus = [
    ...new Set(skus.map((s) => String(s).trim()).filter(Boolean)),
  ];
  const uniqueSkus = padBatch
    ? await padSkusForNavBatch(outletId, requestedSkus)
    : requestedSkus;

  const items = uniqueSkus.map((sku) => ({
    itemNo: sku,
    locationCode,
    quantity: 0,
  }));

  const result = await executeNavSoap({
    outletId,
    operationKey,
    payload: { items, locationCode },
  });

  let parsedItems = parseInventoryPerLocationList(result.response?.body);
  if (!parsedItems.length && result.parsed?.returnValue) {
    parsedItems = parseInventoryPerLocationList(result.parsed.returnValue);
  }

  const quantityBySku = buildQuantityBySkuMap(parsedItems, locationCode);

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

  const filteredMap = {};
  for (const key of requestedKeys) {
    if (Object.prototype.hasOwnProperty.call(quantityBySku, key)) {
      filteredMap[key] = quantityBySku[key];
    }
  }

  return {
    ...result,
    items: parsedItems,
    quantityBySku: filteredMap,
    requestedSkus,
    batchedSkus: uniqueSkus,
  };
};

/**
 * Overlay NAV qty onto the current page of Mongo inventory docs.
 * Used for outlet.mode === "stateless". Soft-fails to Mongo qty.
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
      inventories: list.map((inv) => ({ ...inv, stockSource: "local" })),
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
        padBatch: true,
      });
      const enriched = list.map((inv) => {
        const key = normalizeSkuKey(inv.sku);
        const hasNav = Object.prototype.hasOwnProperty.call(
          result.quantityBySku,
          key,
        );
        return {
          ...inv,
          quantityLocal: inv.quantity,
          quantity: hasNav ? result.quantityBySku[key] : inv.quantity,
          stockSource: hasNav ? "nav" : "local",
        };
      });

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

  return {
    inventories: list.map((inv) => ({
      ...inv,
      quantityLocal: inv.quantity,
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
  padSkusForNavBatch,
};
