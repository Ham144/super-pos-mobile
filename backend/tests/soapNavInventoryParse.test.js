import test from "node:test";
import assert from "node:assert/strict";
import {
  parseInventoryPerLocationList,
  resolveNavStockQuantity,
} from "../utils/soapNav/callSoap.js";
import { buildQuantityBySkuMap } from "../utils/soapNav/client.js";

test("resolveNavStockQuantity uses Quantity even when 0 (Postman / x50033)", () => {
  const block = `
    <InventoryPerLocation xmlns="urn:microsoft-dynamics-nav/xmlports/x50033">
      <ItemNo>CRJ3302S</ItemNo>
      <LocationCode>MNG2_JUAL</LocationCode>
      <Quantity>0</Quantity>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 0);
});

test("resolveNavStockQuantity prefers Quantity over Inventory sibling", () => {
  const block = `
    <InventoryPerLocation>
      <ItemNo>CRJ3302S</ItemNo>
      <LocationCode>MNG2_JUAL</LocationCode>
      <Quantity>0</Quantity>
      <Inventory>8</Inventory>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 0);
});

test("resolveNavStockQuantity falls back to Inventory if Quantity absent", () => {
  const block = `
    <InventoryPerLocation>
      <ItemNo>VD18Z4T7</ItemNo>
      <LocationCode>CSI01</LocationCode>
      <Inventory>15</Inventory>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 15);
});

test("resolveNavStockQuantity uses non-zero Quantity", () => {
  const block = `
    <InventoryPerLocation>
      <ItemNo>VD18Z4T7</ItemNo>
      <Quantity>9</Quantity>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 9);
});

test("parseInventoryPerLocationList matches Postman GetInventoryByLocationMultiple result", () => {
  const xml = `
    <Soap:Envelope xmlns:Soap="http://schemas.xmlsoap.org/soap/envelope/">
      <Soap:Body>
        <GetInventoryByLocationMultiple_Result xmlns="urn:microsoft-dynamics-schemas/codeunit/WSNav">
          <xml_WSInventory>
            <InventoryPerLocation xmlns="urn:microsoft-dynamics-nav/xmlports/x50033">
              <ItemNo>CRJ3302S</ItemNo>
              <LocationCode>MNG2_JUAL</LocationCode>
              <Quantity>0</Quantity>
            </InventoryPerLocation>
          </xml_WSInventory>
        </GetInventoryByLocationMultiple_Result>
      </Soap:Body>
    </Soap:Envelope>
  `;
  const rows = parseInventoryPerLocationList(xml);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].itemNo, "CRJ3302S");
  assert.equal(rows[0].quantity, 0);
});

test("buildQuantityBySkuMap is case-insensitive and prefers location", () => {
  const map = buildQuantityBySkuMap(
    [
      { itemNo: "vd18z4t7", locationCode: "OTHER", quantity: 1 },
      { itemNo: "VD18Z4T7", locationCode: "CSI01", quantity: 42 },
    ],
    "csi01",
  );
  assert.equal(map.VD18Z4T7, 42);
});
