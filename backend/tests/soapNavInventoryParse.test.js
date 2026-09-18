import test from "node:test";
import assert from "node:assert/strict";
import {
  parseInventoryPerLocationList,
  resolveNavStockQuantity,
} from "../utils/soapNav/callSoap.js";
import { buildQuantityBySkuMap } from "../utils/soapNav/client.js";

test("resolveNavStockQuantity prefers Inventory when Quantity is echoed 0", () => {
  const block = `
    <InventoryPerLocation>
      <ItemNo>VD18Z4T7</ItemNo>
      <LocationCode>CSI01</LocationCode>
      <Quantity>0</Quantity>
      <Inventory>15</Inventory>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 15);
});

test("resolveNavStockQuantity uses non-zero Quantity when present", () => {
  const block = `
    <InventoryPerLocation>
      <ItemNo>VD18Z4T7</ItemNo>
      <Quantity>9</Quantity>
      <Inventory>15</Inventory>
    </InventoryPerLocation>
  `;
  assert.equal(resolveNavStockQuantity(block), 9);
});

test("parseInventoryPerLocationList does not treat echoed Quantity 0 as final stock", () => {
  const xml = `
    <return_value>
      <InventoryPerLocation>
        <ItemNo>VD18Z4T7</ItemNo>
        <LocationCode>CSI01</LocationCode>
        <Quantity>0</Quantity>
        <Inventory>42</Inventory>
      </InventoryPerLocation>
    </return_value>
  `;
  const rows = parseInventoryPerLocationList(xml);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].itemNo, "VD18Z4T7");
  assert.equal(rows[0].quantity, 42);
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
