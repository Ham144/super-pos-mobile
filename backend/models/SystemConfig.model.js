import mongoose from "mongoose";

// global settings untuk semua outlet
const systemConfigSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "global",
    },
    EMAIL_HOST: {
      type: String,
      default: "",
    },
    EMAIL_PORT: {
      type: Number,
      default: 587,
    },
    EMAIL_SECURE: {
      type: Boolean,
      default: false,
    },
    EMAIL_USER: {
      type: String,
      default: "",
    },
    EMAIL_PASS: {
      type: String,
      default: "",
    },
    EMAIL_SERVICE: {
      type: String,
      default: "",
    },
    PASS_DOWNLOAD_APK: {
      type: String,
      default: "",
    },
    //Active Directory
    AD_HOST: {
      type: String,
      default: "",
    },
    AD_PORT: {
      type: Number,
      default: 389,
    },
    AD_DOMAIN: {
      type: String,
      default: "",
    },
    AD_BASE_DN: {
      type: String,
      default: "",
    },
    // whatsapp global (Fonnte token)
    WHATSAPP_API_KEY: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

export default SystemConfig;
