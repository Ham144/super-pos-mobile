import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, required: false, default: null },
    phoneIsVerified: Boolean,
    name: { type: String, required: true },
    alamat: { type: String, required: false },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;