import httpntlm from "httpntlm";

const postSoapRequest = ({ url, username, password, body, soapAction }) =>
  new Promise((resolve, reject) => {
    httpntlm.post(
      {
        url,
        username,
        password,
        body,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
        },
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        const statusCode = response?.statusCode ?? 0;
        const responseBody = response?.body ?? "";

        if (statusCode >= 400) {
          const err = new Error(
            `SOAP NAV gagal (${statusCode}): ${responseBody.slice(0, 500)}`,
          );
          err.statusCode = statusCode;
          err.responseBody = responseBody;
          reject(err);
          return;
        }

        resolve({
          statusCode,
          body: responseBody,
        });
      },
    );
  });

export const callSoapNav = async ({
  endpoint,
  usernameNTLM,
  passwordNTLM,
  soapAction,
  xmlBody,
  timeoutMs = 30000,
}) => {
  if (!endpoint) throw new Error("SOAP endpoint belum dikonfigurasi");
  if (!usernameNTLM || !passwordNTLM) {
    throw new Error("Kredensial NTLM SOAP belum dikonfigurasi");
  }
  if (!soapAction) throw new Error("SOAPAction belum dikonfigurasi");
  if (!xmlBody) throw new Error("Body SOAP kosong");

  const requestPromise = postSoapRequest({
    url: endpoint,
    username: usernameNTLM,
    password: passwordNTLM,
    body: xmlBody,
    soapAction,
  });

  if (!timeoutMs || timeoutMs <= 0) {
    return requestPromise;
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`SOAP NAV timeout setelah ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([requestPromise, timeoutPromise]);
};

export const extractXmlTagValue = (xml, tagName) => {
  if (!xml || !tagName) return null;
  // Nested-aware: return_value sering berisi XML child, bukan text polos
  const regex = new RegExp(
    `<(?:\\w+:)?${tagName}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tagName}>`,
    "i",
  );
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
};

export const decodeXmlEntities = (value = "") =>
  String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const extractNestedTag = (block, tagName) => {
  const regex = new RegExp(
    `<(?:\\w+:)?${tagName}[^>]*>([^<]*)</(?:\\w+:)?${tagName}>`,
    "i",
  );
  const match = block.match(regex);
  return match?.[1]?.trim() ?? null;
};

const extractItemNo = (block) =>
  extractNestedTag(block, "ItemNo") ||
  extractNestedTag(block, "Item_No") ||
  extractNestedTag(block, "No");

const parseQtyNumber = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const quantity = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(quantity) ? quantity : null;
};

/**
 * XmlPort x50033 (InventoryPerLocation): stok live ada di tag Quantity.
 * Request kita kirim Quantity=0 sebagai placeholder; NAV mengisi ulang di response.
 * Jangan prefer tag Inventory — itu yang bikin CRJ3302S jadi 8 padahal Postman Quantity=0.
 */
export const resolveNavStockQuantity = (block) => {
  const fromQuantity = parseQtyNumber(extractNestedTag(block, "Quantity"));
  const fromInventory = parseQtyNumber(extractExactTag(block, "Inventory"));
  const fromQty = parseQtyNumber(extractNestedTag(block, "Qty"));

  if (fromQuantity !== null) return fromQuantity;
  if (fromInventory !== null) return fromInventory;
  if (fromQty !== null) return fromQty;
  return 0;
};

/** Exact tag match — jangan cocokkan prefix "Inventory" ke "InventoryPerLocation". */
const extractExactTag = (block, tagName) => {
  const regex = new RegExp(
    `<(?:\\w+:)?${tagName}(?![\\w:-])[^>]*>([^<]*)</(?:\\w+:)?${tagName}>`,
    "i",
  );
  const match = block.match(regex);
  return match?.[1]?.trim() ?? null;
};

/**
 * Parse InventoryPerLocation rows from NAV SOAP / XmlPort payload.
 * Accepts raw SOAP envelope or return_value (possibly entity-encoded).
 */
export const parseInventoryPerLocationList = (xmlOrEncoded) => {
  if (!xmlOrEncoded) return [];

  let xml = String(xmlOrEncoded);
  if (xml.includes("&lt;") || xml.includes("&gt;")) {
    xml = decodeXmlEntities(xml);
  }

  // Coba ekstrak return_value nested; kalau gagal tetap parse full envelope
  const returnValue = extractXmlTagValue(xml, "return_value");
  if (returnValue) {
    const decoded = returnValue.includes("&lt;")
      ? decodeXmlEntities(returnValue)
      : returnValue;
    if (
      /InventoryPerLocation/i.test(decoded) ||
      /ItemNo|Item_No/i.test(decoded)
    ) {
      xml = decoded;
    }
  }

  const blocks = xml.match(
    /<(?:\w+:)?InventoryPerLocation\b[\s\S]*?<\/(?:\w+:)?InventoryPerLocation>/gi,
  );
  if (!blocks?.length) return [];

  return blocks
    .map((block) => {
      const itemNo = extractItemNo(block);
      const locationCode = extractNestedTag(block, "LocationCode");
      if (!itemNo) return null;

      return {
        itemNo: itemNo.trim(),
        locationCode: locationCode?.trim() || null,
        quantity: resolveNavStockQuantity(block),
      };
    })
    .filter(Boolean);
};

export default callSoapNav;
