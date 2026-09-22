import {
  NAV_CODEUNIT_NS,
  NAV_XMLPORTS,
  NAV_SOAP_OPERATIONS,
  requireSoapDefault,
} from "./constants.js";

const escapeXml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/** NAV Code[20] — DocumentNo / ExtDoc tidak boleh > 20. */
export const toNavDocumentNo = (value, maxLen = 20) => {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (compact.length <= maxLen) return compact;
  return compact.slice(-maxLen);
};

const wrapEnvelope = (bodyContent) =>
  `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/"><Body>${bodyContent}</Body></Envelope>`;

const xmlField = (tag, value) =>
  `<${tag}>${escapeXml(value ?? "")}</${tag}>`;

const buildSalesLineXml = (line) =>
  [
    "<SalesLine>",
    xmlField("DocumentNo", line.documentNo),
    xmlField("LineNo", line.lineNo),
    xmlField("ItemNo", line.itemNo),
    xmlField("Qty", line.qty),
    xmlField("UnitPrice", line.unitPrice),
    xmlField("LineDiscountAmount", line.lineDiscountAmount),
    xmlField("PromoCode", line.promoCode),
    xmlField("UoM", line.uom),
    xmlField("Catatan", line.catatan),
    "</SalesLine>",
  ].join("");

const buildInventoryLineXml = (item) =>
  [
    `<InventoryPerLocation xmlns="${NAV_XMLPORTS.inventoryPerLocation}">`,
    xmlField("ItemNo", item.itemNo),
    xmlField("LocationCode", item.locationCode),
    xmlField("Quantity", item.quantity ?? 0),
    "</InventoryPerLocation>",
  ].join("");

export const buildSalesOrderAutoPostingShipXml = ({
  header,
  lines = [],
}) => {
  const salesHeaderFields = [
    xmlField("DocumentNo", header.documentNo),
    xmlField("SellToCustNo", header.sellToCustNo),
    xmlField("ShiptToCode", header.shiptToCode),
    xmlField("OrderDate", header.orderDate),
    xmlField("LocationCode", header.locationCode),
    xmlField("Dim1", header.dim1),
    xmlField("CustomerPriceGrp", header.customerPriceGrp),
    xmlField("SalespersonCode", header.salespersonCode),
    xmlField("SellToContact", header.sellToContact),
    xmlField("NoSeries", header.noSeries),
    xmlField("ExtDoc", header.extDoc),
  ].join("");

  const salesLines = lines.map(buildSalesLineXml).join("");

  const body = [
    `<SalesOrderAutoPostingShip xmlns="${NAV_CODEUNIT_NS}">`,
    "<xML_SalesAuto>",
    `<SalesHeader xmlns="${NAV_XMLPORTS.salesHeader}">`,
    salesHeaderFields,
    salesLines,
    "</SalesHeader>",
    "</xML_SalesAuto>",
    "</SalesOrderAutoPostingShip>",
  ].join("");

  return wrapEnvelope(body);
};

export const buildGetSalesShipmentLinesXml = ({ codDocNumber }) => {
  const body = [
    `<GetSalesShipmentLines xmlns="${NAV_CODEUNIT_NS}">`,
    "<xML_SSL>",
    `<SalesShipmentLines xmlns="${NAV_XMLPORTS.salesShipmentLines}">`,
    xmlField("DocumentNo", ""),
    xmlField("LineNo", ""),
    xmlField("Type", ""),
    xmlField("No", ""),
    xmlField("Location", ""),
    xmlField("Qty", ""),
    xmlField("UOM", ""),
    xmlField("Catatan", ""),
    "</SalesShipmentLines>",
    "</xML_SSL>",
    xmlField("cod_DocNumber", codDocNumber),
    "</GetSalesShipmentLines>",
  ].join("");

  return wrapEnvelope(body);
};

export const buildWsUndoShipmentXml = ({ docNo, lineNo }) => {
  const body = [
    `<WsUndoShipment xmlns="${NAV_CODEUNIT_NS}">`,
    xmlField("docNo", docNo),
    xmlField("lineNo", lineNo),
    "</WsUndoShipment>",
  ].join("");

  return wrapEnvelope(body);
};

export const buildWsPostInvoiceSOXml = ({ docNo }) => {
  const body = [
    `<WsPostInvoiceSO xmlns="${NAV_CODEUNIT_NS}">`,
    xmlField("docNo", docNo),
    "</WsPostInvoiceSO>",
  ].join("");

  return wrapEnvelope(body);
};

export const buildGetInventoryByLocationMultipleXml = ({
  items = [],
  locationCode,
  operationName = NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
}) => {
  const inventoryLines = items.map((item) =>
    buildInventoryLineXml({
      itemNo: item.itemNo ?? item.sku,
      locationCode: item.locationCode ?? locationCode,
      quantity: item.quantity ?? 0,
    }),
  );

  const op =
    operationName || NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE;

  const body = [
    `<${op} xmlns="${NAV_CODEUNIT_NS}">`,
    "<xml_WSInventory>",
    inventoryLines.join(""),
    "</xml_WSInventory>",
    `</${op}>`,
  ].join("");

  return wrapEnvelope(body);
};

export const buildSoapXml = (operationKey, payload = {}) => {
  switch (operationKey) {
    case NAV_SOAP_OPERATIONS.SALES_ORDER_AUTO_POSTING_SHIP:
      return buildSalesOrderAutoPostingShipXml(payload);
    case NAV_SOAP_OPERATIONS.GET_SALES_SHIPMENT_LINES:
      return buildGetSalesShipmentLinesXml(payload);
    case NAV_SOAP_OPERATIONS.WS_UNDO_SHIPMENT:
      return buildWsUndoShipmentXml(payload);
    case NAV_SOAP_OPERATIONS.WS_POST_INVOICE_SO:
      return buildWsPostInvoiceSOXml(payload);
    case NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE:
    case NAV_SOAP_OPERATIONS.GET_STATELESS_INVENTORY:
      return buildGetInventoryByLocationMultipleXml({
        ...payload,
        operationName: operationKey,
      });
    default:
      throw new Error(`Operasi SOAP NAV tidak dikenal: ${operationKey}`);
  }
};

/**
 * Map invoice POS → payload SalesOrderAutoPostingShip.
 *
 * Wajib: DocumentNo, SellToCustNo, NoSeries, ExtDoc + line ItemNo/Qty/UnitPrice/LineNo
 * Opsional (diisi bila ada): OrderDate, LocationCode, SalespersonCode, SellToContact,
 *   LineDiscountAmount, Catatan; sisanya boleh kosong.
 */
export const mapInvoiceToSalesOrderPayload = (
  invoice,
  defaults = {},
  locationCode,
) => {
  const sellToCustNo = requireSoapDefault(
    defaults.sellToCustNo,
    "sellToCustNo",
  );
  const noSeries = requireSoapDefault(defaults.noSeries, "noSeries");
  const resolvedLocationCode = String(locationCode || "").trim();

  const documentNo = toNavDocumentNo(
    invoice.documentNo || invoice.navDocumentNo || invoice._id,
  );
  const lineStep = 1000;

  const toNum = (v) => {
    if (v == null || v === "") return 0;
    if (typeof v === "object" && v.$numberDecimal != null) {
      return Number(v.$numberDecimal);
    }
    return Number(v);
  };

  const lines = (invoice.currentBill || []).map((item, index) => {
    const relatedDiskon = (invoice.diskon || []).find(
      (diskon) =>
        diskon.sku === item.sku || diskon.description === item.description,
    );
    const rpPotongan = relatedDiskon?.diskonInfo?.RpPotonganHarga;
    const lineDiscountAmount =
      rpPotongan != null && rpPotongan !== "" && toNum(rpPotongan) !== 0
        ? toNum(rpPotongan)
        : "";

    const qty = toNum(item.quantity) || 0;
    const unitPrice =
      toNum(item.RpHargaDasar) ||
      (qty ? toNum(item.totalRp) / qty : toNum(item.totalRp));

    return {
      documentNo,
      lineNo: (index + 1) * lineStep,
      itemNo: String(item.sku || "").trim(),
      qty,
      unitPrice,
      lineDiscountAmount,
      promoCode: "",
      uom: "",
      catatan: item.catatan || "",
    };
  });

  const salespersonRaw =
    typeof invoice.spg === "object"
      ? invoice.spg?.name || invoice.spg?.kode || invoice.salesPerson
      : invoice.spg || invoice.salesPerson || "";

  const sellToContact =
    invoice.customer?.name || defaults.sellToCustName || "";

  return {
    header: {
      documentNo,
      sellToCustNo,
      shiptToCode: "",
      orderDate: invoice.createdAt
        ? new Date(invoice.createdAt).toISOString().slice(0, 10)
        : "",
      locationCode: resolvedLocationCode,
      dim1: "",
      customerPriceGrp: "",
      salespersonCode: toNavDocumentNo(salespersonRaw),
      sellToContact,
      noSeries,
      extDoc: toNavDocumentNo(invoice.kodeInvoice || invoice._id),
    },
    lines,
  };
};

export { escapeXml, wrapEnvelope };
