import EscPosEncoder from "esc-pos-encoder";
import { Router } from "express";

const router = Router();

//gunain di mobile
router.get("/printSettlementMobile", async (req, res) => {
  const encoder = new EscPosEncoder();

  const result = encoder
    .initialize()
    .text("=== Settlement Report ===")
    .newline()
    .text("Kasir: Budi")
    .newline()
    .text("Tanggal: 2025-04-23")
    .newline()
    .text("Cash: Rp100.000")
    .newline()
    .text("QRIS: Rp200.000")
    .newline()
    .text("Total: Rp300.000")
    .newline()
    .cut()
    .encode();

  const base64String = Buffer.from(result).toString("base64");
});

export default router;
