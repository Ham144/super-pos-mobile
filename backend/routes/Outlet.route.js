import { Router } from "express";
import Outlet from "../models/Outlet.model.js";
import sharp from "sharp";
import { findInventoryBySku } from "../utils/validatePoSkus.js";
import UserRefrensi from "../models/User.model.js";
import generateTokenJWT, { setAuthCookie } from "../utils/generateTokenJWT.js";
import { hasOutletAccess } from "../utils/outletAccess.js";

const router = Router();

// Helper function to process logo
const processLogo = async (logoBase64) => {
  if (!logoBase64) return null;

  try {
    // Remove data URL prefix if exists
    const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Process image with sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(300, 100, {
        // 300px width (sesuai lebar kertas thermal 80mm)
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png({
        quality: 100, // Kualitas maksimal untuk logo
        compressionLevel: 9, // Kompresi maksimal untuk ukuran file
      })
      .toBuffer();

    // Convert back to base64
    return `data:image/png;base64,${processedBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Error processing logo:", error);
    return null;
  }
};

router.post("/registerOutlet", async (req, res) => {
  const {
    kodeOutlet,
    namaOutlet,
    description,
    logo,
    namaPerusahaan,
    alamat,
    npwp,
    brandIds,
    periodeSettlement,
    jamSettlement,
    mode,
  } = req.body;

  if (!kodeOutlet?.trim()) {
    return res.status(400).json({ message: "kode outlet diperlukan" });
  }
  if (!namaOutlet?.trim()) {
    return res.status(400).json({ message: "namaOutlet is required" });
  }

  try {
    const normalizedKode = kodeOutlet.trim();
    const isExisted = await Outlet.exists({
      $or: [{ kodeOutlet: normalizedKode }, { namaOutlet: namaOutlet.trim() }],
    });
    if (isExisted) {
      return res
        .status(400)
        .json({ message: "kode outlet atau nama outlet sudah digunakan" });
    }

    const processedLogo = await processLogo(logo);
    const outlet = await Outlet.create({
      kodeOutlet: normalizedKode,
      namaOutlet: namaOutlet.trim(),
      description: description || "",
      logo: processedLogo,
      namaPerusahaan,
      alamat,
      npwp,
      brandIds: brandIds || [],
      periodeSettlement: periodeSettlement || 1,
      jamSettlement: jamSettlement || "00:00",
      mode: mode || undefined,
    });

    return res.json({ message: "berhasil", data: outlet });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "gagal register outlet" });
  }
});

//detail outlet list
router.get("/getAllOutlet", async (req, res) => {
  try {
    const data = await Outlet.find({});
    return res.json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "gagal mendapatkan outlet list" });
  }
});

//simple outlet list
router.get("/simple-outlet-list", async (req, res) => {
  try {
    const data = await Outlet.find({
      kasirList: { $in: [req.userId] },
    }).select("kodeOutlet namaOutlet mode");
    return res.json({ message: "berhasil", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "gagal mendapatkan outlet list" });
  }
});

router.put("/edit", async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(500).json({ message: "no _id" });
    }

    // Get current outlet data
    const currentOutlet = await Outlet.findById(_id);
    if (!currentOutlet) {
      return res.status(404).json({ message: "Outlet not found" });
    }

    // Process logo if exists and different from current
    const processedLogo =
      req.body.logo !== currentOutlet.logo
        ? await processLogo(req.body.logo)
        : currentOutlet.logo;

    const updateFields = {
      namaOutlet: req.body.namaOutlet,
      kodeOutlet: req.body.kodeOutlet,
      description: req.body.description,
      logo: processedLogo,
      namaPerusahaan: req?.body?.namaPerusahaan,
      alamat: req?.body?.alamat,
      npwp: req?.body?.npwp,
      brandIds: req?.body?.brandIds,
      periodeSettlement: req?.body?.periodeSettlement,
      jamSettlement: req?.body?.jamSettlement,
      mode: req?.body?.mode || null,
    };

    if (req.body.kasirList !== undefined) {
      updateFields.kasirList = req.body.kasirList.filter(
        (item) => item !== "" && item !== undefined && item != null,
      );
    }

    await Outlet.findByIdAndUpdate(_id, { $set: updateFields });

    return res.json({ message: "success" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "failed" });
  }
});

router.delete("/delete/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    if (!_id) {
      return res.status(500).json({ message: "no _id" });
    }

    // Simply delete the outlet without updating any users
    await Outlet.findByIdAndDelete(_id);

    return res.json({ message: "success" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "failed" });
  }
});

//getoutletbyuserid
router.get("/getOutlet/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(500).json({
      message: "gagal mendapatkan outlet, karena user id tidak diberikan",
    });
  }
  try {
    const user = await UserRefrensi.findById(userId).select("currentOutlet");
    let outletDB = null;
    if (user?.currentOutlet) {
      outletDB = await Outlet.findById(user.currentOutlet).select("-logo");
    }
    if (!outletDB) {
      outletDB = await Outlet.findOne({ kasirList: userId }).select("-logo");
    }
    if (!outletDB) {
      return res
        .status(404)
        .json({ message: "akun ini belum terhubung ke outlet manapun" });
    }
    return res.json({ data: outletDB });
  } catch (error) {
    return res.status(500).json({ message: "Terjadi kesalahan" });
  }
});

//menerima satu user id bukan array
router.post("/assignUserToOutlet", async (req, res) => {
  const { userId, outletId } = req.body;
  if (!userId || !outletId) {
    return res.status(400).json({ message: "userId dan outletId diperlukan" });
  }
  
  try {
    if (outletId) {
      const outletToUpdate = await Outlet.findById(outletId);
      if (!outletToUpdate) {
        return res.status(404).json({ message: "Outlet not found" });
      }
      console.log("test", outletToUpdate);

      const alreadyAssigned = outletToUpdate.kasirList.some(
        (id) => id.toString() === userId.toString(),
      );
      if (!alreadyAssigned) {
        outletToUpdate.kasirList.push(userId);
        await outletToUpdate.save();
      }
    } else {
      const outlets = await Outlet.find({ kasirList: userId });
      for (const outlet of outlets) {
        outlet.kasirList = outlet.kasirList.filter(
          (id) => id.toString() !== userId.toString(),
        );
        await outlet.save();
      }
    }

    return res.json({ message: "User outlet assignment updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


router.post("/linkBrandToOutlet", async (req, res) => {
  const { outletId, brandId } = req.body;
  if (!outletId || !brandId) {
    return res
      .status(400)
      .json({ message: "Outlet ID and Brand ID are required" });
  }

  try {
    const outletDB = await Outlet.findById(outletId);
    if (!outletDB) {
      return res.status(404).json({ message: "Outlet not found" });
    }

    // Cek apakah brandId sudah ada di array
    const brandExists = outletDB.brandIds.includes(brandId);

    if (brandExists) {
      // Hapus brandId dari array
      const newBrandIds = outletDB?.brandIds?.filter(
        (id) => id.toString() !== brandId,
      );
      outletDB.brandIds = newBrandIds;
      // await outletDB.save();
      return res.json({
        message: "Brand berhasil dihapus",
        data: newBrandIds,
      });
    } else {
      // Tambah brandId ke array
      outletDB.brandIds.push(brandId);
    }

    // Simpan perubahan
    // await outletDB.save();

    // Kirim response dengan data terbaru
    return res.json({
      message: brandExists
        ? "Brand berhasil dihapus"
        : "Brand berhasil ditambahkan",
      data: outletDB.brandIds,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "gagal menugaskan user ke outlet" });
  }
});

//menerima array spgId
router.post("/assignSpgToOutlet", async (req, res) => {
  const { spgIds, outletId } = req.body;

  try {
    // If a new outlet is specified, add the user to that outlet's kasirList
    if (outletId) {
      const outletToUpdate = await Outlet.findById(outletId);
      if (!outletToUpdate) {
        return res.status(404).json({ message: "Outlet not found" });
      }

      //unique spgIds
      const uniqueSpgIds = [...new Set(spgIds)];
      outletToUpdate.spgList = uniqueSpgIds;
      await outletToUpdate.save();
    }

    return res.json({ message: "Berhasil menambahkan spg ke outlet" });
  } catch (error) {
    console.error("Error assigning spg to outlet:", error);
    return res.status(500).json({ message: "Gagal menambahkan spg ke outlet" });
  }
});

// sku yang tampil gambar di mobile — cukup terdaftar di inventory, thumbnail opsional
router.post("/assignFavoritedInventoryToOutlet", async (req, res) => {
  const { outletId, skus } = req.body;

  if (!outletId) {
    return res.status(400).json({ message: "outletId diperlukan" });
  }

  try {
    const outletToUpdate = await Outlet.findById(outletId);
    if (!outletToUpdate) {
      return res.status(404).json({ message: "Outlet tidak ditemukan" });
    }

    const uniqueSkus = [
      ...new Set((skus || []).map((s) => s?.trim()).filter(Boolean)),
    ];

    const canonicalSkus = [];
    const missingSkus = [];

    for (const rawSku of uniqueSkus) {
      const inventory = await findInventoryBySku(rawSku);
      if (inventory) {
        canonicalSkus.push(inventory.sku);
      } else {
        missingSkus.push(rawSku);
      }
    }

    if (missingSkus.length) {
      return res.status(400).json({
        message: `SKU tidak terdaftar: ${missingSkus.join(", ")}`,
        missingSkus,
      });
    }

    outletToUpdate.favoritedInventoryIds = canonicalSkus;
    await outletToUpdate.save();

    return res.json({
      message: "Berhasil menyimpan SKU tampil gambar",
      data: {
        skus: canonicalSkus,
        favoritedInventoryIds: outletToUpdate.favoritedInventoryIds,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal menyimpan SKU tampil gambar",
      error: error.message,
    });
  }
});

router.get("/favoritedInventorySkus/:outletId", async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.outletId);
    if (!outlet) {
      return res.status(404).json({ message: "Outlet tidak ditemukan" });
    }

    return res.json({
      message: "berhasil",
      data: { skus: outlet.favoritedInventoryIds || [] },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mendapatkan SKU favorit",
      error: error.message,
    });
  }
});

router.get("/switch-outlet/:outletId", async (req, res) => {
  const { outletId } = req.params;
  const outlet = await Outlet.findById(outletId);
  if (!outlet) {
    return res.status(404).json({ message: "Outlet tidak ditemukan" });
  }

  const allowed = await hasOutletAccess(req.userId, outletId);
  if (!allowed) {
    return res.status(403).json({
      message: "Anda tidak memiliki akses ke outlet ini",
      code: "OUTLET_ACCESS_REVOKED",
    });
  }

  await UserRefrensi.findByIdAndUpdate(req.userId, {
    $set: {
      currentOutlet: outletId,
    },
  });

  const token = await generateTokenJWT(req.userId);
  if (!token) {
    return res
      .status(400)
      .json({ message: "Terjadi kesalahan sementara, coba lagi" });
  }
  setAuthCookie(res, token);

  return res.json({
    message: "berhasil switch outlet",
    currentOutlet: {
      _id: outlet._id,
      kodeOutlet: outlet.kodeOutlet,
      namaOutlet: outlet.namaOutlet,
    },
  });
});

export default router;
