import { Router } from "express";
import BrandRefrensi from "../models/brand.model.js";
import Outlet from "../models/Outlet.model.js";

const router = Router();

router.get("/getAllBrands", async (req, res) => {
  try {
    const brands = await BrandRefrensi.find({});
    return res.json({ message: "Berhasil mengambil brandList", data: brands });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mendapatkan data brand", error: error });
  }
});

router.get("/getBrandByOutletId/:outletId", async (req, res) => {
  try {
    const { outletId } = req.params;
    const outlet = await Outlet.findById(outletId);
    const brands = await BrandRefrensi.find({
      _id: { $in: outlet.brandIds },
    });
    return res.json({ message: "Berhasil mengambil brandList", data: brands });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "gagal mendapatkan data brand", error: error });
  }
});

export default router;
