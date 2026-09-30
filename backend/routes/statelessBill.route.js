import { Router } from "express";
import {
  approveDiscountStateless,
  bayarStateless,
  cetakBillStateless,
  editLinesStateless,
  getPendingDiscountsStateless,
  voidStateless,
} from "../controllers/statelessBill.controller.js";

/**
 * Stateless outlet bill/stock flow.
 * Do NOT use syncMobileRoute here — that remains for mode=offline.
 */
const router = Router();

router.get("/pending-discounts", getPendingDiscountsStateless);
router.post("/cetak-bill", cetakBillStateless);
router.post("/approve-discount", approveDiscountStateless);
router.post("/edit-lines", editLinesStateless);
router.post("/bayar", bayarStateless);
router.post("/void", voidStateless);

export default router;
