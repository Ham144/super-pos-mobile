import { Router } from "express";
import Soap from "../models/Soap.model.js";
import {
  checkInventoryByOutlet,
  executeNavSoap,
  getSoapConfigByOutlet,
} from "../utils/soapNav/client.js";
import { NAV_SOAP_OPERATIONS } from "../utils/soapNav/constants.js";

const router = Router();

const sanitizeSoapConfig = (config) => {
  if (!config) return null;

  const { passwordNTLM, ...safeConfig } = config;
  return {
    ...safeConfig,
    hasPassword: Boolean(passwordNTLM),
  };
};

router.get("/outlet/:outletId", async (req, res) => {
  try {
    const config = await getSoapConfigByOutlet(req.params.outletId);
    if (!config) {
      return res.status(404).json({
        message: "Konfigurasi SOAP NAV belum ada untuk outlet ini",
      });
    }

    return res.json({
      message: "sukses",
      data: sanitizeSoapConfig(config),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/outlet/:outletId", async (req, res) => {
  try {
    const { outletId } = req.params;
    const {
      endpoint,
      usernameNTLM,
      passwordNTLM,
      timeoutMs,
      defaults,
      operations,
      noSeries,
    } = req.body;

    if (!endpoint || !usernameNTLM) {
      return res.status(400).json({
        message: "endpoint dan usernameNTLM wajib diisi",
      });
    }

    const existing = await Soap.findOne({ outlet: outletId });
    const resolvedDefaults = {
      noSeries: defaults?.noSeries || noSeries || "",
      sellToCustNo: defaults?.sellToCustNo || "",
      sellToCustName: defaults?.sellToCustName || "",
    };

    const updatePayload = {
      outlet: outletId,
      endpoint,
      usernameNTLM,
      timeoutMs,
      noSeries: resolvedDefaults.noSeries,
      defaults: resolvedDefaults,
      operations,
    };

    if (passwordNTLM) {
      updatePayload.passwordNTLM = passwordNTLM;
    } else if (!existing) {
      return res.status(400).json({
        message: "passwordNTLM wajib diisi saat membuat konfigurasi baru",
      });
    }

    const saved = await Soap.findOneAndUpdate(
      { outlet: outletId },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      message: "Konfigurasi SOAP NAV berhasil disimpan",
      data: sanitizeSoapConfig(saved),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/outlet/:outletId/inventory-check", async (req, res) => {
  try {
    const { skus = [], operationKey } = req.body;
    if (!Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ message: "skus wajib berupa array" });
    }

    const result = await checkInventoryByOutlet({
      outletId: req.params.outletId,
      skus,
      operationKey:
        operationKey ||
        NAV_SOAP_OPERATIONS.GET_INVENTORY_BY_LOCATION_MULTIPLE,
    });

    return res.json({
      message: "sukses",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/outlet/:outletId/execute", async (req, res) => {
  try {
    const { operationKey, payload = {} } = req.body;
    if (!operationKey) {
      return res.status(400).json({ message: "operationKey wajib diisi" });
    }

    const result = await executeNavSoap({
      outletId: req.params.outletId,
      operationKey,
      payload,
    });

    return res.json({
      message: "sukses",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
