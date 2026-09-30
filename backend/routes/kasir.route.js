import { Router } from "express";
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import Outlet from "../models/Outlet.model.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const isFoundUser = await User.findOne({
      $and: [{ email: req.body.email }, { username: req.body.username }],
    });
    if (isFoundUser) {
      return res
        .status(500)
        .json({ message: "nama dengan email yang sama sudah ada" });
    }
    const {
      email,
      username,
      password,
      telepon,
      targetHargaPenjualan,
      targetQuantityPenjualan,
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      roleName: "KASIR",
      password: hashedPassword,
      email: email,
      telepon: telepon,
      totalHargaPenjualan: 0,
      totalQuantityPenjualan: 0,
      targetHargaPenjualan,
      targetQuantityPenjualan,
    });
    return res.json({ message: "berhasil register kasir" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "gagal register kasir" });
  }
});

router.get("/getAllKasir", async (req, res) => {
  try {
    const kasir = await User.find({ roleName: "KASIR" }).select(["-password"]);
    return res.json({ message: "berhasil mendapatkan kasir", data: kasir });
  } catch (error) {
    return res.status(400).json({ message: "gagal mendapatkan kasir", error });
  }
});

router.put("/update", async (req, res) => {
  const {
    _id,
    email,
    outlet,
    password,
    telepon,
    targetHargaPenjualan,
    targetQuantityPenjualan,
  } = req.body;
  try {
    let newHashedPassword;
    if (password && password != "") {
      newHashedPassword = await bcrypt.hash(password, 10);
    }

    const userDB = await User.findOne({ _id });
    userDB.email = email;
    userDB.telepon = telepon;
    userDB.targetHargaPenjualan = targetHargaPenjualan;
    userDB.outlet = outlet ? outlet : userDB.outlet;
    userDB.targetQuantityPenjualan = targetQuantityPenjualan;
    if (newHashedPassword) {
      userDB.password = newHashedPassword;
    }
    await userDB.save();
    return res.json({ message: "berhasil mengupdate data kasir" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "gagal mengupdate data kasir" });
  }
});

router.delete(`/deleteKasir/:userId`, async (req, res) => {
  const { userId } = req.params;
  try {
    const userDB = await User.findById(userId);
    if (!userDB) {
      return res.status(404).json({ message: "akun tidak ditemukan" });
    }

    // Remove the user from any outlet's kasirList
    await Outlet.updateMany(
      { kasirList: userId },
      { $pull: { kasirList: userId } },
    );

    await User.findByIdAndDelete(userId);
    return res.json({ message: "Berhasil menghapus" });
  } catch (error) {
    return res.status(400).json({ message: "gagal menghapus kasir" });
  }
});

export default router;
