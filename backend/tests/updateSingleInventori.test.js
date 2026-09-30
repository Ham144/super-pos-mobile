import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mock Express req/res for updateSingleInventori without a live MongoDB.
 * We stub InventoryRefrensi on the module via dynamic import after injecting
 * a fake findOne through a tiny local double.
 */

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

test("updateSingleInventori persists quantity with mocked InventoryRefrensi", async (t) => {
  // Isolate by stubbing the model methods used by the controller.
  const InventoryRefrensi = (
    await import("../models/InventoryRefrensi.model.js")
  ).default;

  const saved = [];
  const doc = {
    _id: "inv1",
    sku: "QRH092",
    outlet: "outlet1",
    quantity: 0,
    description: "Quantum - QRH-92",
    RpHargaDasar: 101000,
    brand: "QUANTUM",
    barcodeItem: "",
    isDisabled: false,
    async save() {
      saved.push({ quantity: this.quantity, description: this.description });
      return this;
    },
  };

  const originalFindOne = InventoryRefrensi.findOne;
  InventoryRefrensi.findOne = async () => doc;
  t.after(() => {
    InventoryRefrensi.findOne = originalFindOne;
  });

  const { updateSingleInventori } = await import(
    "../controllers/inventory.controller.js"
  );

  const req = {
    body: {
      sku: "QRH092",
      quantity: 42,
      description: "Quantum - QRH-92",
      RpHargaDasar: 101000,
    },
    userDB: { currentOutlet: "outlet1", _id: "user1" },
    userId: "user1",
  };
  const res = createRes();

  await updateSingleInventori(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.message, "berhasil memperbarui");
  assert.equal(doc.quantity, 42);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].quantity, 42);
});

test("updateSingleInventori returns 404 when sku missing in outlet", async () => {
  const InventoryRefrensi = (
    await import("../models/InventoryRefrensi.model.js")
  ).default;
  const originalFindOne = InventoryRefrensi.findOne;
  InventoryRefrensi.findOne = async () => null;

  try {
    const { updateSingleInventori } = await import(
      "../controllers/inventory.controller.js"
    );
    const req = {
      body: { sku: "NOPE", quantity: 1 },
      userDB: { currentOutlet: "outlet1", _id: "user1" },
      userId: "user1",
    };
    const res = createRes();
    await updateSingleInventori(req, res);
    assert.equal(res.statusCode, 404);
  } finally {
    InventoryRefrensi.findOne = originalFindOne;
  }
});

test("updateSingleInventori returns 400 for negative quantity", async () => {
  const InventoryRefrensi = (
    await import("../models/InventoryRefrensi.model.js")
  ).default;
  const originalFindOne = InventoryRefrensi.findOne;
  InventoryRefrensi.findOne = async () => ({
    _id: "inv1",
    sku: "QRH092",
    quantity: 1,
    description: "x",
    async save() {
      return this;
    },
  });

  try {
    const { updateSingleInventori } = await import(
      "../controllers/inventory.controller.js"
    );
    const req = {
      body: { sku: "QRH092", quantity: -3 },
      userDB: { currentOutlet: "outlet1", _id: "user1" },
      userId: "user1",
    };
    const res = createRes();
    await updateSingleInventori(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body?.message || ""), /quantity/i);
  } finally {
    InventoryRefrensi.findOne = originalFindOne;
  }
});
