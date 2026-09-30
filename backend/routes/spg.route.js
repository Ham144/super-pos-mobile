import { Router } from "express";
import SpgRefrensi from "../models/SpgRefrensi.model.js";
import Outlet from "../models/Outlet.model.js";

const router = Router();

const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

router.post("/register", async (req, res) => {
  const { name, targetHargaPenjualan, targetQuantityPenjualan } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Nama spg harus diisi" });
  }
  
  try {
    await SpgRefrensi.create({
      name: name.trim(),
      targetHargaPenjualan: parseNumber(targetHargaPenjualan, 0),
      targetQuantityPenjualan: parseNumber(targetQuantityPenjualan, 0),
    });

    return res.json({ message: "Berhasil membuat spg baru" });
  } catch (error) {
    return res.status(400).json({ message: "gagal membuat spg", error });
  }
});

router.put("/edit", async (req, res) => {
  const { id, name, targetHargaPenjualan, targetQuantityPenjualan } = req.body;

  if (!id) {
    return res.status(400).json({ message: "diperlukan id spg" });
  }

  if (!name?.trim()) {
    return res.status(400).json({ message: "Nama spg harus diisi" });
  }

  try {
    const updated = await SpgRefrensi.findByIdAndUpdate(
      id,
      {
        $set: {
          name: name.trim(),
          targetHargaPenjualan: parseNumber(targetHargaPenjualan, 0),
          targetQuantityPenjualan: parseNumber(targetQuantityPenjualan, 0),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "spg tidak ditemukan" });
    }

    return res.json({ message: "berhasil memperbarui spg", data: updated });
  } catch (error) {
    return res.status(400).json({ message: "gagal memperbarui spg", error });
  }
});

router.get("/spgList", async (req, res) => {
  try {
    const response = await SpgRefrensi.find().sort({ name: 1 });
    return res.json({ message: "berhasil mendapatkan spg", data: response });
  } catch (error) {
    return res.status(400).json({ message: "gagal mendapatkan spg", error });
  }
});

router.get("/spgList/mobile", async (req, res) => {
  try {
    const userId = req.user.userId;
    const myOutlet = await Outlet.findOne({
      kasirList: {
        $in: [userId],
      },
    }).select("spgList");

    if (!myOutlet) {
      return res
        .status(400)
        .json({ message: "outlet tidak ditemukan untuk akun anda" });
    }

    const response = await SpgRefrensi.find({
      _id: { $in: myOutlet.spgList },
      isDisabled: false,
    }).sort({ name: 1 });

    return res.json({ message: "berhasil mendapatkan spg", data: response });
  } catch (error) {
    return res.status(400).json({ message: "gagal mendapatkan spg", error });
  }
});

router.delete("/disable/:spgId", async (req, res) => {
  const { spgId } = req.params;

  if (!spgId) {
    return res.status(400).json({ message: "diperlukan spgId" });
  }

  const spgDB = await SpgRefrensi.findById(spgId);
  if (!spgDB) {
    return res.status(400).json({ message: "spg tidak ditemukan" });
  }

  try {
    const akanDisable = !spgDB.isDisabled;

    await SpgRefrensi.findByIdAndUpdate(spgId, {
      isDisabled: akanDisable,
    });

    if (akanDisable) {
      await Outlet.updateMany(
        { spgList: spgId },
        { $pull: { spgList: spgId } },
      );
    }

    return res.json({
      message: akanDisable
        ? "berhasil menonaktifkan spg"
        : "berhasil mengaktifkan spg",
    });
  } catch (error) {
    return res.status(400).json({ message: "gagal mengubah status spg", error });
  }
});

router.post("/getSpgById", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "diperlukan id spg" });
  }

  try {
    const spg = await SpgRefrensi.findById(id);
    return res.json({ message: "berhasil mendapatkan spg", data: spg });
  } catch (error) {
    return res.status(400).json({ message: "gagal mendapatkan spg", error });
  }
});

export default router;
