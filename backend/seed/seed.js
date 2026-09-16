import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.model.js";
import Outlet from "../models/Outlet.model.js";
import Brand from "../models/brand.model.js";
import Inventory from "../models/InventoryRefrensi.model.js";
import PaymentMethod from "../models/PaymentMethod.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import SpgRefrensi from "../models/SpgRefrensi.model.js";
import Soap from "../models/Soap.model.js";
import ExternalProductReference from "../models/ExternalProductRefrence.js";
import { createDefaultSoapSeed } from "../utils/soapNav/templates.js";

const SUPERADMIN_USERNAME = "superadmin";
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;
const COMPANY_NAME = "PT. Catur Sukses International";
const RESET_SUPERADMIN_PASSWORD = process.argv.includes(
  "--reset-superadmin-password",
);

const NAV_STATELESS_LOCATIONS = [
  { kodeOutlet: "BKS_JUAL", namaOutlet: "Jual Bekasi" },
  { kodeOutlet: "BNDG_JUAL", namaOutlet: "Jual Bandung" },
  { kodeOutlet: "CJRH_JUAL", namaOutlet: "Jual Cijerah" },
  { kodeOutlet: "CKP_JUAL", namaOutlet: "Jual Cikampek" },
  { kodeOutlet: "CPDH_JUAL", namaOutlet: "Jual Cipondoh" },
  { kodeOutlet: "GLD_F_JUAL", namaOutlet: "Jual Glodok F" },
  { kodeOutlet: "GLD_JUAL", namaOutlet: "Jual Glodok A" },
  { kodeOutlet: "HRC_JUAL", namaOutlet: "Jual Harco" },
  { kodeOutlet: "KSBI_JUAL", namaOutlet: "Jual KSBI" },
  { kodeOutlet: "MNG2_JUAL", namaOutlet: "Jual Mangga2" },
  { kodeOutlet: "OFFST_JUAL", namaOutlet: "Offical Store Jual" },
  { kodeOutlet: "ONG_JUAL", namaOutlet: "Jual Ong" },
  { kodeOutlet: "PKJ_JUAL", namaOutlet: "PKJ_JUAL" },
  { kodeOutlet: "PLUIT_JUAL", namaOutlet: "Jual Pluit" },
  { kodeOutlet: "PMRN_JUAL", namaOutlet: "PMRN_JUAL" },
  { kodeOutlet: "PRMT_JUAL", namaOutlet: "Jual Permata" },
  { kodeOutlet: "SNTL_JUAL", namaOutlet: "Jual Sentul" },
  { kodeOutlet: "SRNG_JUAL", namaOutlet: "Jual Serang" },
];

const OFFLINE_OUTLET = {
  kodeOutlet: "01",
  namaOutlet: "Demo Offline Outlet",
  description: "Outlet default boleh dihapus",
};

const sampleProducts = [
  {
    sku: "DEMO-001",
    barcodeItem: "899000000001",
    description: "Produk Demo Satu",
    brand: "CSI Demo",
    RpHargaDasar: "10000",
    quantity: 100,
  },
  {
    sku: "DEMO-002",
    barcodeItem: "899000000002",
    description: "Produk Demo Dua",
    brand: "CSI Demo",
    RpHargaDasar: "15000",
    quantity: 100,
  },
  {
    sku: "DEMO-003",
    barcodeItem: "899000000003",
    description: "Produk Demo Tiga",
    brand: "CSI Elektronik",
    RpHargaDasar: "25000",
    quantity: 50,
  },
  {
    sku: "DEMO-004",
    barcodeItem: "899000000004",
    description: "Produk Demo Empat",
    brand: "CSI Elektronik",
    RpHargaDasar: "50000",
    quantity: 25,
  },
];

const seedBrands = async () => {
  const productsByBrand = sampleProducts.reduce((result, product) => {
    result[product.brand] ??= [];
    result[product.brand].push(product.sku);
    return result;
  }, {});

  const brands = {};
  for (const [name, skuList] of Object.entries(productsByBrand)) {
    const brand = await Brand.findOneAndUpdate(
      { name },
      {
        $set: { name },
        $addToSet: { skuList: { $each: skuList } },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    brands[name] = brand;
  }

  return brands;
};

const seedInventory = async () => {
  for (const product of sampleProducts) {
    await Inventory.findOneAndUpdate(
      { sku: product.sku },
      {
        $setOnInsert: {
          _id: product.sku,
          sku: product.sku,
          quantity: product.quantity,
          RpHargaDasar: mongoose.Types.Decimal128.fromString(
            product.RpHargaDasar,
          ),
          terjual: 0,
        },
        $set: {
          barcodeItem: product.barcodeItem,
          description: product.description,
          brand: product.brand,
          isDisabled: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
};

const seedSuperadmin = async () => {
  const passwordHash = bcrypt.hashSync(SUPERADMIN_PASSWORD, 10);
  const existingUser = await User.findOne({ username: SUPERADMIN_USERNAME });

  if (existingUser) {
    const updates = {
      roleName: "SUPER ADMIN",
      blockedAccess: [],
      isDisabled: false,
    };

    if (RESET_SUPERADMIN_PASSWORD) {
      updates.password = passwordHash;
    }

    await User.updateOne({ _id: existingUser._id }, { $set: updates });
    return User.findById(existingUser._id);
  }

  const availableCodes = ["SUP", "SA1", "SA2", "SA3"];
  let kodeKasir = null;
  for (const candidate of availableCodes) {
    if (!(await User.exists({ kodeKasir: candidate }))) {
      kodeKasir = candidate;
      break;
    }
  }

  if (!kodeKasir) {
    throw new Error(
      "Tidak dapat menentukan kodeKasir unik untuk akun superadmin.",
    );
  }

  return User.create({
    username: SUPERADMIN_USERNAME,
    password: passwordHash,
    roleName: "SUPER ADMIN",
    blockedAccess: [],
    kodeKasir,
    isDisabled: false,
  });
};

const upsertOutletBase = async ({
  kodeOutlet,
  namaOutlet,
  mode,
  description,
  superadmin,
  extraAddToSet = {},
}) => {
  return Outlet.findOneAndUpdate(
    { kodeOutlet },
    {
      $set: {
        namaOutlet,
        namaPerusahaan: COMPANY_NAME,
        mode,
        ...(description ? { description } : {}),
      },
      $setOnInsert: {
        kodeOutlet,
        periodeSettlement: 1,
        jamSettlement: "00:00",
        jumlahInvoice: 0,
        pendapatan: 0,
        ...(description
          ? {}
          : { description: `Outlet NAV ${kodeOutlet}` }),
      },
      $addToSet: {
        kasirList: superadmin._id,
        ...extraAddToSet,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const seedOutlets = async (brands, superadmin) => {
  const brandIds = Object.values(brands).map((brand) => brand._id);
  const favoriteSkus = sampleProducts.map((product) => product.sku);
  const outlets = [];

  for (const location of NAV_STATELESS_LOCATIONS) {
    const outlet = await upsertOutletBase({
      kodeOutlet: location.kodeOutlet,
      namaOutlet: location.namaOutlet,
      mode: "stateless",
      superadmin,
    });
    outlets.push(outlet);
  }

  const offlineOutlet = await upsertOutletBase({
    kodeOutlet: OFFLINE_OUTLET.kodeOutlet,
    namaOutlet: OFFLINE_OUTLET.namaOutlet,
    mode: "offline",
    description: OFFLINE_OUTLET.description,
    superadmin,
    extraAddToSet: {
      brandIds: { $each: brandIds },
      favoritedInventoryIds: { $each: favoriteSkus },
    },
  });
  outlets.push(offlineOutlet);

  return outlets;
};

const seedSpg = async () => {
  const spgs = [{ name: "luna" }, { name: "Tera" }, { name: "Sol" }];
  let registered = [];
  for (const s of spgs) {
    const registerd = await SpgRefrensi.findOneAndUpdate(
      { name: s.name },
      { $setOnInsert: { name: s.name } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    registered.push(registerd);
  }
  return registered;
};

const seedPaymentMethods = async () => {
  const paymentMethods = [
    { method: "Tunai", discount: 0, additional_fee: 0, status: true },
    { method: "Transfer", discount: 0, additional_fee: 0, status: true },
    { method: "QRIS", discount: 0, additional_fee: 0, status: true },
    {
      method: "Midtrans",
      discount: 0,
      additional_fee: 0,
      status: true,
      gatewayProvider: "midtrans",
      isSystem: true,
      systemKey: "midtrans_default",
    },
  ];

  for (const paymentMethod of paymentMethods) {
    const filter = { method: paymentMethod.method };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    if (paymentMethod.gatewayProvider) {
      const { gatewayProvider, isSystem, systemKey, ...baseFields } =
        paymentMethod;
      await PaymentMethod.findOneAndUpdate(
        filter,
        {
          $setOnInsert: baseFields,
          $set: { gatewayProvider, isSystem, systemKey },
        },
        options,
      );
    } else {
      await PaymentMethod.findOneAndUpdate(
        filter,
        { $setOnInsert: paymentMethod },
        options,
      );
    }
  }
};

const seedSystemConfigFromEnv = async () => {
  const config = {};

  if (process.env.EMAIL_HOST) config.EMAIL_HOST = process.env.EMAIL_HOST;
  if (process.env.EMAIL_PORT)
    config.EMAIL_PORT = Number(process.env.EMAIL_PORT);
  if (process.env.EMAIL_SECURE) {
    config.EMAIL_SECURE = ["true", "1"].includes(
      process.env.EMAIL_SECURE.toLowerCase(),
    );
  }
  if (process.env.EMAIL_USER) config.EMAIL_USER = process.env.EMAIL_USER;
  if (process.env.EMAIL_PASS) config.EMAIL_PASS = process.env.EMAIL_PASS;
  if (process.env.EMAIL_SERVICE) {
    config.EMAIL_SERVICE = process.env.EMAIL_SERVICE;
  }
  if (process.env.AD_HOST) config.AD_HOST = process.env.AD_HOST;
  if (process.env.AD_PORT) config.AD_PORT = Number(process.env.AD_PORT);
  if (process.env.AD_DOMAIN) config.AD_DOMAIN = process.env.AD_DOMAIN;
  if (process.env.AD_BASE_DN) config.AD_BASE_DN = process.env.AD_BASE_DN;
  if (process.env.PASS_DOWNLOAD_APK) {
    config.PASS_DOWNLOAD_APK = process.env.PASS_DOWNLOAD_APK;
  }

  if (Object.keys(config).length === 0) return null;

  const adConfig = {};
  if (config.AD_HOST) adConfig.AD_HOST = config.AD_HOST;
  if (config.AD_PORT) adConfig.AD_PORT = config.AD_PORT;
  if (config.AD_DOMAIN) adConfig.AD_DOMAIN = config.AD_DOMAIN;
  if (config.AD_BASE_DN) adConfig.AD_BASE_DN = config.AD_BASE_DN;

  const { AD_HOST, AD_PORT, AD_DOMAIN, AD_BASE_DN, ...otherConfig } = config;

  return SystemConfig.findOneAndUpdate(
    { _id: "global" },
    {
      $setOnInsert: otherConfig,
      ...(Object.keys(adConfig).length > 0 ? { $set: adConfig } : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const seedSoapNavForOutlets = async (outlets) => {
  const endpoint = process.env.NAV_SOAP_ENDPOINT;
  const usernameNTLM = process.env.SOAP_USERNAME_NTLM_SEED;
  const passwordNTLM = process.env.SOAP_PASSWORD_NTLM_SEED;

  if (!endpoint || !usernameNTLM || !passwordNTLM) {
    return 0;
  }

  const soapSeed = createDefaultSoapSeed({
    endpoint,
    usernameNTLM,
    passwordNTLM,
    noSeries: "SO-RTL",
  });

  const statelessOutlets = outlets.filter((outlet) => outlet.mode === "stateless");
  let seeded = 0;

  for (const outlet of statelessOutlets) {
    await Soap.findOneAndUpdate(
      { outlet: outlet._id },
      {
        $set: { outlet: outlet._id, ...soapSeed },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    seeded += 1;
  }

  return seeded;
};

const seedExternalProductReferences = async (outlets) => {
  const rawUrl = process.env.PRODUCT_REFERENCE_ENDPOINT;
  const xApiKey = process.env.PRODUCT_REFERENCE_X_API_KEY || "";

  if (!rawUrl) {
    return 0;
  }

  // Simpan base URL tanpa query — searchKey/skip/limit dikontrol saat sync
  let url = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    parsed.search = "";
    url = parsed.toString();
  } catch (_) {
    url = rawUrl.split("?")[0];
  }

  let seeded = 0;

  for (const outlet of outlets) {
    const epr = await ExternalProductReference.findOneAndUpdate(
      { outlet: outlet._id },
      {
        $set: {
          outlet: outlet._id,
          url,
          searchKey: "",
          x_api_key: xApiKey,
          method: "GET",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await Outlet.updateOne(
      { _id: outlet._id },
      { $set: { ExternalProductReference: epr._id } },
    );
    seeded += 1;
  }

  return seeded;
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI belum diatur di file .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const brands = await seedBrands();
  await seedInventory();
  const superadmin = await seedSuperadmin();
  const outlets = await seedOutlets(brands, superadmin);
  await seedPaymentMethods();

  const offlineOutlet = outlets.find((outlet) => outlet.mode === "offline");
  const SPGs = await seedSpg();
  if (offlineOutlet) {
    offlineOutlet.spgList = SPGs.map((e) => e._id);
    await offlineOutlet.save();
    if (offlineOutlet.spgList?.length > 1) {
      console.log("Spg Outlet berhasil di inisialisasi");
    }
  }

  const systemConfig = await seedSystemConfigFromEnv();
  const soapSeededCount = await seedSoapNavForOutlets(outlets);
  const eprSeededCount = await seedExternalProductReferences(outlets);

  const statelessCount = outlets.filter((o) => o.mode === "stateless").length;
  const offlineCount = outlets.filter((o) => o.mode === "offline").length;

  console.log("Seed berhasil dijalankan.");
  console.log(`- Superadmin: ${superadmin.username}`);
  console.log(
    `- Outlet: ${statelessCount} stateless, ${offlineCount} offline`,
  );
  console.log(`- SKU contoh: ${sampleProducts.length}`);
  console.log("- Metode pembayaran: Tunai, Transfer, QRIS");
  console.log(
    `- Konfigurasi sistem dari .env: ${systemConfig ? "disimpan" : "dilewati"}`,
  );
  console.log(
    `- Konfigurasi SOAP NAV: ${soapSeededCount > 0 ? `${soapSeededCount} outlet` : "dilewati"}`,
  );
  console.log(
    `- ExternalProductReference: ${eprSeededCount > 0 ? `${eprSeededCount} outlet` : "dilewati"}`,
  );

  if (RESET_SUPERADMIN_PASSWORD) {
    console.log("- Password superadmin di-reset sesuai konfigurasi seed.");
  } else if (
    superadmin.createdAt?.getTime() === superadmin.updatedAt?.getTime()
  ) {
    console.log(
      "- Password default superadmin hanya dicetak di dokumentasi seed, bukan di log.",
    );
  }
};

try {
  await seed();
} catch (error) {
  console.error("Seed gagal:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
