import { Router } from "express";
import StackTraceSku from "../models/StackTraceSku.model.js";

const router = Router();

router.get("/getAllStackTraceSku", async (req, res) => {
  const { from, to, limit, page, skip, sku, category } = req.query;

  let query = {};
  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0); // Atur ke awal hari (00:00:00.000)
    query.createdAt = { $gte: fromDate };
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999); // Atur ke akhir hari (23:59:59.999)
    query.createdAt = { ...query.createdAt, $lte: toDate };
  }

  if (sku) {
    query.itemId = { $regex: sku, $options: "i" };
  }

  if (category && category !== "all") {
    query.category = category;
  }

  try {
    const sortedData = await StackTraceSku.find(query)
      .populate("lastEditBy", "username")
      .populate("invoice", "_id kodeInvoice total salesPerson")
      .limit(Number(limit) || 100)
      .sort({ createdAt: -1 })
      .skip(Number(skip) || 0);
    return res.json({
      message: "Berhasil mengambil data stack trace",
      data: sortedData,
    });
  } catch (error) {
    console.error("Error fetching stack trace data:", error); // Log error untuk debugging
    return res.status(500).json({ message: "Internal server error" });
  }
});
export default router;
