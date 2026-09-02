import ExternalProductReference from "../models/ExternalProductRefrence.js";
import Outlet from "../models/Outlet.model.js";
import { syncExternalProductsForOutlet } from "../utils/externalProductSync.js";

const sanitizeConfig = (config) => {
  if (!config) return null;

  const { x_api_key, ...safeConfig } = config;
  return {
    ...safeConfig,
    hasApiKey: Boolean(x_api_key),
  };
};

export const getExternalProductConfigByOutlet = async (req, res) => {
  try {
    const config = await ExternalProductReference.findOne({
      outlet: req.params.outletId,
    }).lean();

    if (!config) {
      return res.status(404).json({
        message:
          "Referensi produk eksternal belum dikonfigurasi untuk outlet ini",
      });
    }

    return res.json({
      message: "sukses",
      data: sanitizeConfig(config),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const saveExternalProductConfigByOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;
    const { url, searchKey, pageLimit, x_api_key, method } = req.body;

    if (!url?.trim()) {
      return res.status(400).json({ message: "url wajib diisi" });
    }

    const outlet = await Outlet.findById(outletId).select("_id").lean();
    if (!outlet) {
      return res.status(404).json({ message: "Outlet tidak ditemukan" });
    }

    const existing = await ExternalProductReference.findOne({
      outlet: outletId,
    });

    const updatePayload = {
      outlet: outletId,
      url: url.trim(),
      searchKey: searchKey?.trim() || "",
      pageLimit: Number(pageLimit) || 5000,
      method: method || "GET",
    };

    if (x_api_key) {
      updatePayload.x_api_key = x_api_key;
    } else if (!existing) {
      updatePayload.x_api_key = "";
    }

    const saved = await ExternalProductReference.findOneAndUpdate(
      { outlet: outletId },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      message: "Referensi produk eksternal berhasil disimpan",
      data: sanitizeConfig(saved),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const syncExternalProductByOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;
    
    const [config, outlet] = await Promise.all([
      ExternalProductReference.findOne({ outlet: outletId }).lean(),
      Outlet.findById(outletId).select("kodeOutlet").lean(),
    ]);

    if (!config) {
      return res.status(404).json({
        message:
          "Referensi produk eksternal belum dikonfigurasi untuk outlet ini",
      });
    }

    if (!outlet) {
      return res.status(404).json({ message: "Outlet tidak ditemukan" });
    }

    const summary = await syncExternalProductsForOutlet({
      outletId,
      outletKode: outlet.kodeOutlet,
      config,
      userId: req.user?.userId,
    });

    await ExternalProductReference.updateOne(
      { outlet: outletId },
      {
        $set: {
          lastSyncedAt: summary.syncedAt,
          lastSyncSummary: {
            created: summary.created,
            updated: summary.updated,
            skipped: summary.skipped,
          },
        },
      },
    );

    return res.json({
      message: "Berhasil sinkronisasi referensi produk",
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
