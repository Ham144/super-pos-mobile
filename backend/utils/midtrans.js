import midtransClient from "midtrans-client";
import crypto from "crypto";

const getServerKey = () => {
  const serverKey = process.env.PAYMENT_MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error("PAYMENT_MIDTRANS_SERVER_KEY belum dikonfigurasi");
  }
  return serverKey;
};

const getClientConfig = () => ({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: getServerKey(),
  clientKey: process.env.PAYMENT_MIDTRANS_CLIENT_KEY || "unused-by-server",
});

const getSnapClient = () => new midtransClient.Snap(getClientConfig());
const getCoreApiClient = () => new midtransClient.CoreApi(getClientConfig());

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

  return getSnapClient().createTransaction(parameter);
};

export const getMidtransTransactionStatus = (orderId) =>
  getCoreApiClient().transaction.status(orderId);

export const verifyMidtransNotificationSignature = (notification) => {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }
  
  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${getServerKey()}`)
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
