import { Router } from "express";
import multer from "multer";
import fs from "fs";
import {
  deleteDiskon,
  deleteMultiDiskon,
  getAllDiskon,
  registerDiskon,
  registerMultiDiskon,
  updateDiskon,
  getAllDiskonByProduct,
} from "../controllers/diskon.controller.js";

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

//single
router.post("/registerDiskon", registerDiskon);
router.delete("/deleteDiskon/:id", deleteDiskon);
router.put("/updateDiskon", updateDiskon);
router.get("/getAllDiskon", getAllDiskon);
router.get("/getAllDiskonByProduct", getAllDiskonByProduct);
router.get("/getAllDiskonByProduct/*", getAllDiskonByProduct);

//multi (import csv)
router.post("/registerMultiDiskon", upload.single("file"), registerMultiDiskon);
router.delete("/registerMultiDiskon", deleteMultiDiskon);

export default router;
