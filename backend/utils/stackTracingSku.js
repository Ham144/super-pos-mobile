// utils/traceStack.js
import mongoose from "mongoose";
import StackTraceSku from "../models/StackTraceSku.model.js";

/**
 * Melacak perubahan pada SKU (inventory)
 */
export async function stackTracingSku({
  itemId,
  userId,
  stackDescription,
  category,
  prevQuantity,
  receivedQuantityTrace, // quantity terbaru (bukan delta)
  invoice,
} = {}) {
  try {
    if (prevQuantity != 0 && prevQuantity == receivedQuantityTrace) {
      return;
    }
    if (!itemId || !userId || !stackDescription) {
      console.warn(
        "⚠️ stackTracingSku butuh itemId, userId, dan stackDescription",
      );
      return;
    }

    const lastEditBy = String(userId);
    if (!mongoose.Types.ObjectId.isValid(lastEditBy)) {
      console.warn("⚠️ stackTracingSku: userId bukan ObjectId valid, skip");
      return;
    }

    await StackTraceSku.create({
      itemId: String(itemId),
      lastEditBy,
      stackDescription,
      category,
      prevQuantity,
      receivedQuantityTrace,
      invoice,
    });
  } catch (err) {
    console.error("❌ Gagal mencatat stack tracing SKU:", err);
  }
}
