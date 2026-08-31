import { Router } from "express";
import Pelanggan from "../models/Pelanggan.model.js";

const router = Router();

router.get("/getAllCustomer", async (req, res) => {
  try {
    const customers = await Pelanggan.find({});
    return res.json({
      message: "Berhasil mengambil customerList",
      data: customers,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mendapatkan data customer", error: error });
  }
});

router.put("/editCustomer/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      message: "tidak dapat memperbarui customer, field tidak lengkap",
    });
  }
  try {
    await Pelanggan.findByIdAndUpdate(id, {
      $set: {
        name: req.body.name,
        telepon: req.body.telepon,
        targetHargaPenjualan: req.body.targetHargaPenjualan
          ? parseFloat(req.body.targetHargaPenjualan)
          : undefined,
        targetQuantityPenjualan: req.body.targetQuantityPenjualan
          ? parseInt(req.body.targetQuantityPenjualan)
          : undefined,
      },
    });
    return res.json({ message: "berhasil memperbarui customer" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal edit customer", error: error });
  }
});

router.delete("/deleteCustomer/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "tidak dapat menghapus customer" });
  }
  try {
    await Pelanggan.findByIdAndDelete(id);
    return res.json({ message: "berhasil menghapus customer" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal menghapus customer", error: error });
  }
});

export default router;
