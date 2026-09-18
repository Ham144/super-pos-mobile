import axios from "axios";
import { getEffectiveSystemConfig } from "./systemConfig.js";

/**
 * Normalize to Fonnte target format: digits only with country code (62...).
 * Accepts: 0812..., +62812..., 62812..., 812...
 */
export const normalizeFonntePhone = (raw) => {
  if (raw === undefined || raw === null) return "";

  let digits = String(raw).trim().replace(/[^\d]/g, "");
  if (!digits) return "";

  // 08xxxxxxxxxx → 628xxxxxxxxxx
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }
  // 8xxxxxxxxxx (missing country / trunk) → 628xxxxxxxxxx
  else if (digits.startsWith("8") && !digits.startsWith("62")) {
    digits = `62${digits}`;
  }

  return digits;
};

export const sendWhatsappByFonnte = async (
  phoneNumber,
  message,
  tokenOverride,
) => {
  let fonnteToken = tokenOverride;
  if (!fonnteToken) {
    const systemConfig = await getEffectiveSystemConfig();
    fonnteToken = systemConfig.WHATSAPP_API_KEY;
  }
  if (!fonnteToken) {
    throw new Error(
      "Fonnte token is not set up yet. Go to /whatsapp_config",
    );
  }

  const phone = normalizeFonntePhone(phoneNumber);
  if (!phone || phone.length < 10) {
    const error = new Error(
      `Nomor WhatsApp tidak valid ("${phoneNumber}"). Gunakan format 08… / 628…`,
    );
    error.code = "INVALID_PHONE";
    throw error;
  }

  if (!message || !String(message).trim()) {
    const error = new Error("Pesan WhatsApp tidak boleh kosong");
    error.code = "EMPTY_MESSAGE";
    throw error;
  }

  const response = await axios.post(
    "https://api.fonnte.com/send",
    {
      target: phone,
      phone,
      message: String(message).trim(),
    },
    {
      headers: {
        Authorization: fonnteToken,
      },
    },
  );

  const data = response.data || {};

  // Fonnte often returns HTTP 200 with status:false (e.g. reason: "no target")
  if (data.status === false || data.status === "false") {
    const error = new Error(
      data.reason || data.message || "Fonnte menolak pengiriman WhatsApp",
    );
    error.code = "FONNTE_REJECTED";
    error.fonnte = data;
    throw error;
  }

  return data;
};
