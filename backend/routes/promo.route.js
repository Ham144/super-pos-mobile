import { Router } from "express";
import multer from "multer";
import fs from "fs";
import {
  registerPromo,
  getAllPromo,
  updatePromo,
  getAllPromoByProduct,
  deletePromo,
  importPromoCsv,
} from "../controllers/promo.controller.js";

const router = Router();

const uploadPath = "./uploads";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) => cb(null, file.originalname),
  }),
});

router.post("/registerPromo", registerPromo);
router.get("/getAllPromo", getAllPromo);
router.put("/updatePromo", updatePromo);
router.get("/getAllPromoByProduct", getAllPromoByProduct);
router.get("/getAllPromoByProduct/*", getAllPromoByProduct);
router.delete("/deletePromo/:id", deletePromo);
router.post("/importPromoCsv", upload.single("file"), importPromoCsv);

export default router;
