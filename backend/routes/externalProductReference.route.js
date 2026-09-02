import { Router } from "express";
import {
  getExternalProductConfigByOutlet,
  saveExternalProductConfigByOutlet,
  syncExternalProductByOutlet,
} from "../controllers/externalProductReference.controller.js";

const router = Router();

router.get("/outlet/:outletId", getExternalProductConfigByOutlet);
router.put("/outlet/:outletId", saveExternalProductConfigByOutlet);
router.post("/outlet/:outletId/sync", syncExternalProductByOutlet);

export default router;
