import { Router } from "express";
import multer from "multer";
import fs from "fs";
import {
  disableSingleInventoriToggle,
  toggleDisableInventory,
  getAllinventories,
  registerSingleInventori,
  updateBulkPrices,
  updateSingleInventori,
  getInventoryById,
  getAllinventoriesMobile,
  importInventoryCsv,
} from "../controllers/inventory.controller.js";

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

//manual
router.post("/registerSingleInventori", registerSingleInventori);
router.delete("/disableSingleInventoriToggle", disableSingleInventoriToggle);
router.post("/toggleDisableInventory/:id", toggleDisableInventory);
router.put("/updateSingleInventori", updateSingleInventori);

router.get("/getAllinventories", getAllinventories);
router.post("/updateBulkPrices", updateBulkPrices);
router.post("/importInventoryCsv", upload.single("file"), importInventoryCsv);
router.get("/getInventoryById", getInventoryById);
router.get("/getInventoryById/*", getInventoryById);
router.get("/getAllinventoriesMobile", getAllinventoriesMobile);

export default router;
