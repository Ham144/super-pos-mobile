import mongoose from "mongoose";
import { DEFAULT_BLOCKED_ACCESS_LDAP } from "../constants/accessControl.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      //sudah jadi FK
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    email: {
      type: String,
      default: "",
    },
    telepon: {
      type: String,
      default: "",
    },
    authMethod: {
      type: String,
      required: true,
      enum: ["app", "ldap"],
      default: "app",
    },
    otp: {
      type: Number,
    },
    otpExpiredAt: {
      type: Date,
    },
    skuTerjual: [
      {
        sku: String,
        totalQuantityPenjualan: Number,
      },
    ],
    totalHargaPenjualan: Number,
    totalQuantityPenjualan: Number, //total quantity item di akumulasi bukan invoice
    targetHargaPenjualan: Number,
    targetQuantityPenjualan: Number,
    isDisabled: {
      type: Boolean,
      default: false,
    },
    roleName: {
      type: String,
      required: true,
      default: "Kasir",
    },
    blockedAccess: {
      // deny-list: UI paths (/item_library) and/or API prefixes (/api/v1/...)
      type: [String],
      default: () => [...DEFAULT_BLOCKED_ACCESS_LDAP],
    },
    kodeKasir: {
      type: String,
      unique: true,
    }, //3 huruf random dari usernamenya exp: HM1 krn username yafizham
    // Optional until user is on an outlet.kasirList (LDAP first login).
    // authorize.js returns OUTLET_REQUIRED when missing / not in kasirList.
    currentOutlet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

const UserRefrensi = new mongoose.model("UserRefrensi", userSchema);

export default UserRefrensi;
