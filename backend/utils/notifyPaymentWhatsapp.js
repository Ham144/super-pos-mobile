import { sendWhatsappByFonnte } from "./whatsappSender.js";
import Customer from "../models/Customer.model.js";


/**
 * Kirim WA langsung saat lunas. Gagal / no internet → diabaikan (tanpa cron/retry).
 * `invoice.customer` boleh ObjectId, populated doc, atau { name, phone } dari mobile.
 */
export const notifyPaymentWhatsappIfPossible = async (invoice) => {
  try {
    let name = "";
    let phone = null;
    let customerId = null;
    const cust = invoice?.customer;

    if (cust && typeof cust === "object" && (cust.phone || cust.name)) {
      name = cust.name || "";
      phone = cust.phone || null;
      customerId = cust._id || null;
    } else if (cust) {
      const doc = await Customer.findById(cust).select("name phone").lean();
      name = doc?.name || "";
      phone = doc?.phone || null;
      customerId = doc?._id || null;
    }

    if (!phone && invoice?.customerPhone) {
      phone = invoice.customerPhone;
      name = name || invoice.customerName || "";
    }

    if (!phone) return { sent: false, reason: "no_phone" };

    const message = `Halo *${name || "Pelanggan"}*, pembayaran invoice *${invoice.kodeInvoice}* berhasil. Total: Rp ${Number(invoice.total || 0).toLocaleString("id-ID")}. Terima kasih.`;
    const wa = await sendWhatsappByFonnte(phone, message);
    if ((wa?.status === true || wa?.status === "true") && customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $set: { phoneIsVerified: true },
      });
    }
    return { sent: Boolean(wa?.status === true || wa?.status === "true") };
  } catch (error) {
    console.error("WA pembayaran gagal:", error?.message || error);
    return { sent: false, reason: "error", error };
  }
};
