import mongoose from "mongoose";
import Customer from "../models/Customer.model.js";

const isObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === String(value);

/**
 * Resolve mobile bill.customer (object/string) → Customer ObjectId.
 * Invoice.customer is ObjectId ref — jangan simpan nama string.
 */
export const findOrCreateCustomer = async (rawCustomer) => {
  if (!rawCustomer) return null;

  if (typeof rawCustomer === "string") {
    const s = rawCustomer.trim();
    if (!s) return null;
    if (isObjectId(s)) return s;
    return findOrCreateCustomer({ name: s });
  }

  if (typeof rawCustomer === "object") {
    if (rawCustomer._id && isObjectId(rawCustomer._id)) {
      return String(rawCustomer._id);
    }

    const name = String(rawCustomer.name || "").trim();
    const phone = rawCustomer.phone
      ? String(rawCustomer.phone).trim()
      : "";
    const alamat = rawCustomer.alamat
      ? String(rawCustomer.alamat).trim()
      : "";

    if (!name && !phone) return null;

    if (phone) {
      const doc = await Customer.findOneAndUpdate(
        { phone },
        {
          $set: {
            ...(name ? { name } : {}),
            ...(alamat ? { alamat } : {}),
          },
          $setOnInsert: {
            phone,
            name: name || phone,
          },
        },
        { upsert: true, new: true },
      ).lean();
      return doc?._id ? String(doc._id) : null;
    }

    // Walk-in / default cash (no phone): reuse by exact name
    let doc = await Customer.findOne({
      name,
      $or: [{ phone: null }, { phone: "" }, { phone: { $exists: false } }],
    }).lean();

    if (doc) {
      if (alamat && doc.alamat !== alamat) {
        await Customer.updateOne({ _id: doc._id }, { $set: { alamat } });
      }
      return String(doc._id);
    }

    doc = await Customer.create({
      name,
      phone: null,
      ...(alamat ? { alamat } : {}),
    });
    return String(doc._id);
  }

  return null;
};
