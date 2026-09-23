import { extractXmlTagValue, decodeXmlEntities } from "../soapNav/callSoap.js";

const extractNestedTag = (block, tagName) => {
  const regex = new RegExp(
    `<(?:\\w+:)?${tagName}[^>]*>([^<]*)</(?:\\w+:)?${tagName}>`,
    "i",
  );
  const match = block.match(regex);
  return match?.[1]?.trim() ?? null;
};

/**
 * Parse SalesShipmentLines rows from NAV GetSalesShipmentLines response.
 */
export const parseSalesShipmentLines = (xmlOrEncoded) => {
  if (!xmlOrEncoded) return [];

  let xml = String(xmlOrEncoded);
  if (xml.includes("&lt;") || xml.includes("&gt;")) {
    xml = decodeXmlEntities(xml);
  }

  const findBlocks = (source) =>
    source.match(
      /<(?:\w+:)?SalesShipmentLines\b[\s\S]*?<\/(?:\w+:)?SalesShipmentLines>/gi,
    );

  let blocks = findBlocks(xml);
  if (!blocks?.length) {
    const returnValue = extractXmlTagValue(xml, "return_value");
    if (returnValue) {
      blocks = findBlocks(
        returnValue.includes("&lt;")
          ? decodeXmlEntities(returnValue)
          : returnValue,
      );
    }
  }
  if (!blocks?.length) return [];

  return blocks
    .map((block) => {
      const documentNo = extractNestedTag(block, "DocumentNo");
      const lineNoRaw = extractNestedTag(block, "LineNo");
      const itemNo =
        extractNestedTag(block, "No") || extractNestedTag(block, "ItemNo");
      const qtyRaw = extractNestedTag(block, "Qty");
      const location = extractNestedTag(block, "Location");
      const uom = extractNestedTag(block, "UOM");
      const catatan = extractNestedTag(block, "Catatan");
      const type = extractNestedTag(block, "Type");

      if (!itemNo && !lineNoRaw) return null;

      const lineNo = Number(String(lineNoRaw ?? "0").replace(/,/g, ""));
      const qty = Number(String(qtyRaw ?? "0").replace(/,/g, ""));

      return {
        documentNo: documentNo?.trim() || null,
        lineNo: Number.isFinite(lineNo) ? lineNo : 0,
        itemNo: itemNo?.trim() || null,
        qty: Number.isFinite(qty) ? qty : 0,
        location: location?.trim() || null,
        uom: uom?.trim() || null,
        catatan: catatan?.trim() || null,
        type: type?.trim() || null,
      };
    })
    .filter(Boolean);
};
