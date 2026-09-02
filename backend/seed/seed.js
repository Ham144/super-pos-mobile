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
import { createDefaultSoapSeed } from "../utils/soapNav/templates.js";

const SUPERADMIN_USERNAME = "superadmin";
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;
const RESET_SUPERADMIN_PASSWORD = process.argv.includes(
  "--reset-superadmin-password",
);

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

const seedOutlet = async (brands, superadmin) => {
  const brandIds = Object.values(brands).map((brand) => brand._id);
  const favoriteSkus = sampleProducts.map((product) => product.sku);

  const outlet = await Outlet.findOneAndUpdate(
    { kodeOutlet: "01" },
    {
      $setOnInsert: {
        kodeOutlet: "01",
        namaOutlet: "Demo Offline Outlet",
        description: "Outlet default boleh dihapus",
        namaPerusahaan: "PT Outlet Demo",
        periodeSettlement: 1,
        jamSettlement: "00:00",
        jumlahInvoice: 0,
        pendapatan: 0,
        mode: "offline",
      },
      $addToSet: {
        kasirList: superadmin._id,
        brandIds: { $each: brandIds },
        favoritedInventoryIds: { $each: favoriteSkus },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return outlet;
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

const seedSoapNav = async (outlet) => {
  const endpoint = process.env.NAV_SOAP_ENDPOINT;
  const usernameNTLM = process.env.SOAP_USERNAME_NTLM_SEED;
  const passwordNTLM = process.env.SOAP_PASSWORD_NTLM_SEED;

  if (!endpoint || !usernameNTLM || !passwordNTLM) {
    return null;
  }

  const soapSeed = createDefaultSoapSeed({
    endpoint,
    usernameNTLM,
    passwordNTLM,
    noSeries: "SO-RTL",
  });

  return Soap.findOneAndUpdate(
    { outlet: outlet._id },
    {
      $set: { outlet: outlet._id, ...soapSeed },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI belum diatur di file .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const brands = await seedBrands();
  await seedInventory();
  const superadmin = await seedSuperadmin();
  const outlet = await seedOutlet(brands, superadmin);
  await seedPaymentMethods();
  const SPGs = await seedSpg();
  outlet.spgList = SPGs.map((e) => e._id);
  if (outlet.spgList?.length > 1) {
    console.log("Spg Outlet berhasil di inisailiasi");
  }

  const systemConfig = await seedSystemConfigFromEnv();
  const soapConfig = await seedSoapNav(outlet);

  console.log("Seed berhasil dijalankan.");
  console.log(`- Superadmin: ${superadmin.username}`);
  console.log(`- Outlet: ${outlet.namaOutlet} (${outlet.kodeOutlet})`);
  console.log(`- SKU contoh: ${sampleProducts.length}`);
  console.log("- Metode pembayaran: Tunai, Transfer, QRIS");
  console.log(
    `- Konfigurasi sistem dari .env: ${systemConfig ? "disimpan" : "dilewati"}`,
  );
  console.log(
    `- Konfigurasi SOAP NAV dari .env: ${soapConfig ? "disimpan" : "dilewati"}`,
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
