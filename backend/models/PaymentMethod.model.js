import { Schema, model } from "mongoose";

const paymentMethodSchema = new Schema({
  method: {
    type: String,
    required: true,
  },
  discount: Number,
  status: {
    type: Boolean,
    default: true,
  },
  additional_fee: Number,
  // Set explicitly from the CMS for payment methods handled by a gateway.
  gatewayProvider: {
    type: String,
    enum: ["midtrans", null],
    default: null,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  systemKey: {
    type: String,
    unique: true,
    sparse: true,
  },
});

const PaymentMethod = model("PaymentMethod", paymentMethodSchema);

export default PaymentMethod;
