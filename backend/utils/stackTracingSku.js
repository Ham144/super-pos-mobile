// utils/traceStack.js
import StackTraceSku from "../models/StackTraceSku.model.js";

/**
 * Melacak perubahan pada SKU (inventory)
 * @param {String} itemId - ID dari inventory (_id / sku)
 * @param {String} userId - ID user yang melakukan perubahan
 * @param {String} stackDescription - Catatan unik, nama fungsi/fitur
 * @param {'increase'|'decrease'|'spawn'|'other'} category
 * @param {Number} prevQuantity - quantity sebelum perubahan
 * @param {Number} receivedQuantityTrace - perubahan (bisa + atau -)
 * @param {String} invoice - invoice._id //bill._id saat invoice ini di sync
 */
export async function stackTracingSku(
  {itemId,
  userId,
  stackDescription,
  category,
  prevQuantity,
  receivedQuantityTrace, //quantity terbarunya bukan perngurangan atau penambahannya
  invoice}
) {
  try {
    if (prevQuantity != 0 && prevQuantity == receivedQuantityTrace) {
      return;
    }
    if (!itemId || !userId || !stackDescription) {
      console.warn(
        "⚠️ stackTracingSku butuh itemId, userId, dan stackDescription"
      );
      return;
    }

    await StackTraceSku.create({
      itemId,
      lastEditBy: userId,
      stackDescription,
      category,
      prevQuantity,
      receivedQuantityTrace,
      invoice, //id
    });
  } catch (err) {
    console.error("❌ Gagal mencatat stack tracing SKU:", err);
  }
}
