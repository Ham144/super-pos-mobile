import Soap from "../../models/Soap.model.js";
import Outlet from "../../models/Outlet.model.js";
import {
  defaultSoapAction,
  NAV_SOAP_OPERATIONS,
  requireSoapDefault,
} from "./constants.js";
import { buildSoapXml } from "./buildXml.js";
import { callSoapNav, extractXmlTagValue } from "./callSoap.js";

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
    requireSoapDefault(soapConfig.defaults?.noSeries, "noSeries");
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

export const checkInventoryByOutlet = async ({
  outletId,
  skus = [],
  operationKey = "GetInventoryByLocationMultiple",
}) => {
  const locationCode = await getOutletLocationCode(outletId);

  const items = skus.map((sku) => ({
    itemNo: sku,
    locationCode,
    quantity: 0,
  }));

  return executeNavSoap({
    outletId,
    operationKey,
    payload: { items, locationCode },
  });
};

export default {
  getSoapConfigByOutlet,
  getOutletLocationCode,
  executeNavSoap,
  checkInventoryByOutlet,
};
