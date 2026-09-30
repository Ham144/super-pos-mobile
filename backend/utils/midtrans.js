import midtransClient from "midtrans-client";
import crypto from "crypto";
import { getEffectiveSystemConfig } from "./systemConfig.js";

let cachedKeys = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

const loadMidtransKeys = async () => {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_MS) return cachedKeys;
  const config = await getEffectiveSystemConfig();
  cachedKeys = {
    serverKey: config.PAYMENT_MIDTRANS_SERVER_KEY || "",
    clientKey: config.PAYMENT_MIDTRANS_CLIENT_KEY || "",
    isProductionOverride: config.MIDTRANS_IS_PRODUCTION,
  };
  cachedAt = now;
  return cachedKeys;
};

/** Invalidate after admin save/clear Midtrans config. */
export const clearMidtransKeyCache = () => {
  cachedKeys = null;
  cachedAt = 0;
};

const getServerKeySyncFallback = () =>
  process.env.PAYMENT_MIDTRANS_SERVER_KEY || "";

const resolveServerKey = async () => {
  try {
    const keys = await loadMidtransKeys();
    if (keys.serverKey) return keys.serverKey;
  } catch (_) {
    /* fall through to env */
  }
  const envKey = getServerKeySyncFallback();
  if (!envKey) {
    throw new Error("PAYMENT_MIDTRANS_SERVER_KEY belum dikonfigurasi");
  }
  return envKey;
};

// Key sandbox Midtrans berawalan "SB-" dan hanya valid di endpoint sandbox,
// jadi environment mengikuti key, bukan NODE_ENV. MIDTRANS_IS_PRODUCTION untuk memaksa.
export const isMidtransProduction = async () => {
  try {
    const keys = await loadMidtransKeys();
    if (keys.isProductionOverride === true) return true;
    // Explicit false in DB only if server key also set in DB — else follow key prefix / env
    const overrideEnv = process.env.MIDTRANS_IS_PRODUCTION;
    if (overrideEnv === "true") return true;
    if (overrideEnv === "false") return false;
    const serverKey = keys.serverKey || getServerKeySyncFallback();
    return !String(serverKey).startsWith("SB-");
  } catch {
    const override = process.env.MIDTRANS_IS_PRODUCTION;
    if (override === "true") return true;
    if (override === "false") return false;
    return !getServerKeySyncFallback().startsWith("SB-");
  }
};

/** Sync helper for labels — prefer env/cache; may be briefly stale. */
export const isMidtransProductionSync = () => {
  if (cachedKeys?.isProductionOverride === true) return true;
  const override = process.env.MIDTRANS_IS_PRODUCTION;
  if (override === "true") return true;
  if (override === "false") return false;
  const key = cachedKeys?.serverKey || getServerKeySyncFallback();
  return key ? !key.startsWith("SB-") : false;
};

const getClientConfig = async () => {
  const keys = await loadMidtransKeys();
  const serverKey = keys.serverKey || getServerKeySyncFallback();
  if (!serverKey) {
    throw new Error("PAYMENT_MIDTRANS_SERVER_KEY belum dikonfigurasi");
  }
  return {
    isProduction: await isMidtransProduction(),
    serverKey,
    clientKey:
      keys.clientKey ||
      process.env.PAYMENT_MIDTRANS_CLIENT_KEY ||
      "unused-by-server",
  };
};

const getSnapClient = async () =>
  new midtransClient.Snap(await getClientConfig());
const getCoreApiClient = async () =>
  new midtransClient.CoreApi(await getClientConfig());

export const createPaymentTransaction = async ({
  orderId,
  grossAmount,
  customerDetails,
}) => {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    ...(customerDetails?.email ? { customer_details: customerDetails } : {}),
  };

  return (await getSnapClient()).createTransaction(parameter);
};

export const getMidtransTransactionStatus = async (orderId) =>
  (await getCoreApiClient()).transaction.status(orderId);

export const verifyMidtransNotificationSignature = async (notification) => {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  const serverKey = await resolveServerKey();
  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(String(signature_key), "hex");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

export const isMidtransPaymentSuccessful = (notification) =>
  String(notification.status_code) === "200" &&
  ["settlement", "capture"].includes(notification.transaction_status) &&
  (!notification.fraud_status || notification.fraud_status === "accept");
