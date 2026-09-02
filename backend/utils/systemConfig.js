import nodemailer from "nodemailer";
import SystemConfig from "../models/SystemConfig.model.js";

const CONFIG_ID = "global";

const fallbackEnvConfig = () => ({
  EMAIL_HOST: process.env.EMAIL_HOST || "",
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === "true",
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || "",
  PASS_DOWNLOAD_APK: process.env.PASS_DOWNLOAD_APK || "",
  AD_HOST: process.env.AD_HOST || "",
  AD_PORT: Number(process.env.AD_PORT) || 389,
  AD_DOMAIN: process.env.AD_DOMAIN || "",
  AD_BASE_DN: process.env.AD_BASE_DN || "",
});

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value === "true" || value === "1" || value === 1;
};

const toPort = (value, fallback = 587) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const preferValue = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value;
};

const sanitizeConfig = (config = {}, fallback = fallbackEnvConfig()) => ({
  EMAIL_HOST: preferValue(config.EMAIL_HOST, fallback.EMAIL_HOST),
  EMAIL_PORT: toPort(config.EMAIL_PORT, fallback.EMAIL_PORT),
  EMAIL_SECURE: toBoolean(config.EMAIL_SECURE, fallback.EMAIL_SECURE),
  EMAIL_USER: preferValue(config.EMAIL_USER, fallback.EMAIL_USER),
  EMAIL_PASS: preferValue(config.EMAIL_PASS, fallback.EMAIL_PASS),
  EMAIL_SERVICE: preferValue(config.EMAIL_SERVICE, fallback.EMAIL_SERVICE),
  PASS_DOWNLOAD_APK: preferValue(
    config.PASS_DOWNLOAD_APK,
    fallback.PASS_DOWNLOAD_APK
  ),
});

export const getSystemConfigDoc = async () => {
  return SystemConfig.findById(CONFIG_ID).lean();
};

export const getEffectiveSystemConfig = async () => {
  const fallback = fallbackEnvConfig();
  const doc = await getSystemConfigDoc();
  return {
    ...sanitizeConfig(doc || {}, fallback),
    AD_HOST: preferValue(doc?.AD_HOST, fallback.AD_HOST),
    AD_PORT: toPort(doc?.AD_PORT, fallback.AD_PORT),
    AD_DOMAIN: preferValue(doc?.AD_DOMAIN, fallback.AD_DOMAIN),
    AD_BASE_DN: preferValue(doc?.AD_BASE_DN, fallback.AD_BASE_DN),
  };
};

export const getActiveDirectoryConfig = async () => {
  const config = await getEffectiveSystemConfig();

  if (!config.AD_HOST || !config.AD_DOMAIN || !config.AD_BASE_DN) {
    throw new Error("Konfigurasi Active Directory belum lengkap");
  }

  return {
    AD_HOST: config.AD_HOST,
    AD_PORT: config.AD_PORT || 389,
    AD_DOMAIN: config.AD_DOMAIN,
    AD_BASE_DN: config.AD_BASE_DN,
  };
};

export const getPublicSystemConfig = async () => {
  const config = await getEffectiveSystemConfig();

  return {
    host: config.EMAIL_HOST,
    port: String(config.EMAIL_PORT),
    secure: config.EMAIL_SECURE,
    service: config.EMAIL_SERVICE,
    user: config.EMAIL_USER,
    passDownloadApk: "",
    hasEmailPass: Boolean(config.EMAIL_PASS),
    hasDownloadApkPass: Boolean(config.PASS_DOWNLOAD_APK),
  };
};

export const saveSystemConfig = async (payload = {}) => {
  const fallback = fallbackEnvConfig();
  const current = await getSystemConfigDoc();
  const merged = sanitizeConfig(
    {
      EMAIL_HOST: preferValue(payload.EMAIL_HOST, preferValue(current?.EMAIL_HOST, fallback.EMAIL_HOST)),
      EMAIL_PORT: preferValue(payload.EMAIL_PORT, preferValue(current?.EMAIL_PORT, fallback.EMAIL_PORT)),
      EMAIL_SECURE:
        payload.EMAIL_SECURE === undefined || payload.EMAIL_SECURE === ""
          ? preferValue(current?.EMAIL_SECURE, fallback.EMAIL_SECURE)
          : payload.EMAIL_SECURE,
      EMAIL_USER: preferValue(payload.EMAIL_USER, preferValue(current?.EMAIL_USER, fallback.EMAIL_USER)),
      EMAIL_PASS:
        payload.EMAIL_PASS === undefined || payload.EMAIL_PASS === ""
          ? preferValue(current?.EMAIL_PASS, fallback.EMAIL_PASS)
          : payload.EMAIL_PASS,
      EMAIL_SERVICE: preferValue(
        payload.EMAIL_SERVICE,
        preferValue(current?.EMAIL_SERVICE, fallback.EMAIL_SERVICE)
      ),
      PASS_DOWNLOAD_APK:
        payload.PASS_DOWNLOAD_APK === undefined ||
        payload.PASS_DOWNLOAD_APK === ""
          ? preferValue(current?.PASS_DOWNLOAD_APK, fallback.PASS_DOWNLOAD_APK)
          : payload.PASS_DOWNLOAD_APK,
    },
    fallback
  );

  const adFields = {};
  if (payload.AD_HOST !== undefined) {
    adFields.AD_HOST = preferValue(payload.AD_HOST, fallback.AD_HOST);
  }
  if (payload.AD_PORT !== undefined) {
    adFields.AD_PORT = toPort(payload.AD_PORT, fallback.AD_PORT);
  }
  if (payload.AD_DOMAIN !== undefined) {
    adFields.AD_DOMAIN = preferValue(payload.AD_DOMAIN, fallback.AD_DOMAIN);
  }
  if (payload.AD_BASE_DN !== undefined) {
    adFields.AD_BASE_DN = preferValue(payload.AD_BASE_DN, fallback.AD_BASE_DN);
  }

  return SystemConfig.findByIdAndUpdate(
    CONFIG_ID,
    {
      _id: CONFIG_ID,
      ...merged,
      ...adFields,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
};

export const getPublicAdConfig = async () => {
  const config = await getEffectiveSystemConfig();
  return {
    AD_HOST: config.AD_HOST || "",
    AD_PORT: config.AD_PORT || 389,
    AD_DOMAIN: config.AD_DOMAIN || "",
    AD_BASE_DN: config.AD_BASE_DN || "",
  };
};

export const saveAdConfig = async (payload = {}) => {
  return saveSystemConfig({
    AD_HOST: payload.AD_HOST,
    AD_PORT: payload.AD_PORT,
    AD_DOMAIN: payload.AD_DOMAIN,
    AD_BASE_DN: payload.AD_BASE_DN,
  });
};

export const deleteSystemConfig = async () => {
  await SystemConfig.deleteOne({ _id: CONFIG_ID });
  return getPublicSystemConfig();
};

export const buildCurrentSmtpOptions = async (overrides = {}) => {
  const config = await getEffectiveSystemConfig();
  const host = preferValue(overrides.host, config.EMAIL_HOST);
  const port = toPort(overrides.port, config.EMAIL_PORT);
  const secure = toBoolean(overrides.secure, config.EMAIL_SECURE);
  const user = preferValue(overrides.user, config.EMAIL_USER);
  const pass = preferValue(overrides.pass, config.EMAIL_PASS);
  const service = preferValue(overrides.service, config.EMAIL_SERVICE);

  if (!host || !user || !pass) {
    throw new Error(
      "Konfigurasi SMTP belum lengkap. Isi EMAIL_HOST, EMAIL_USER, dan EMAIL_PASS."
    );
  }

  const transportOptions = {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: "SSLv3",
    },
    debug: true,
  };

  if (service) {
    transportOptions.service = service;
  }

  return transportOptions;
};

export const createCurrentSmtpTransporter = async (overrides = {}) => {
  const transportOptions = await buildCurrentSmtpOptions(overrides);
  return nodemailer.createTransport(transportOptions);
};
