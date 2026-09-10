import { Router } from "express";
import LdapClient from "ldapjs-client";
import generateTokenJWT, { setAuthCookie } from "../utils/generateTokenJWT.js";
import generateTokenMobile from "../utils/generateTokenMobile.js";
import UserRefrensi from "../models/User.model.js";
import Outlet from "../models/Outlet.model.js";
import { repairCurrentOutletIfNeeded } from "../utils/outletAccess.js";
import bcrypt from "bcryptjs";
import authorize from "../middlewares/authorize.js";
import { getActiveDirectoryConfig } from "../utils/systemConfig.js";

const router = Router();

//login web
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ message: "username diperlukan" });
  }
  if (!password) {
    return res.status(400).json({ message: "password diperlukan" });
  }

  try {
    const userDB = await UserRefrensi.findOne({ username });
    if (!userDB) {
      return res.status(400).json({ message: "username atau password salah" });
    }

    const isPasswordMatch = bcrypt.compareSync(password, userDB.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "username atau password salah" });
    }
    await repairCurrentOutletIfNeeded(userDB);

    const sanitizedUser = {
      _id: userDB._id,
      username: userDB.username,
    };

    const token = await generateTokenJWT(userDB._id);
    setAuthCookie(res, token);

    return res.json({
      message: "Selamat datang kembali",
      data: sanitizedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal login, silakan coba lagi.",
      error: error.message,
    });
  }
});

const generateUniqueKodeKasir = async (username) => {
  let baseCode = username.substring(0, 2).toUpperCase();

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let kodeKasir = "";
  let attempts = 0;

  while (!isUnique && attempts < 50) {
    const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
    kodeKasir = baseCode + randomChar;

    const existingUser = await UserRefrensi.findOne({ kodeKasir });
    if (!existingUser) {
      isUnique = true;
    } else {
      attempts++;
      if (attempts > 20) {
        baseCode =
          username.substring(0, 1).toUpperCase() +
          chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
  }

  if (!isUnique) {
    while (!isUnique) {
      kodeKasir = "";
      for (let i = 0; i < 3; i++) {
        kodeKasir += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingUser = await UserRefrensi.findOne({ kodeKasir });
      if (!existingUser) {
        isUnique = true;
      }
    }
  }

  return kodeKasir;
};

const getDomainFqdn = (baseDn) =>
  String(baseDn || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.toUpperCase().startsWith("DC="))
    .map((part) => part.slice(3))
    .join(".");

const buildLdapUrl = (adConfig) => {
  const useSsl =
    Number(adConfig.AD_PORT) === 636 || process.env.AD_USE_SSL === "true";
  const protocol = useSsl ? "ldaps" : "ldap";
  return `${protocol}://${adConfig.AD_HOST}:${adConfig.AD_PORT}`;
};

const buildBindCandidates = (username, adConfig) => {
  const candidates = [`${adConfig.AD_DOMAIN}\\${username}`];
  const fqdn =
    process.env.AD_UPN_SUFFIX?.trim() || getDomainFqdn(adConfig.AD_BASE_DN);

  if (fqdn) {
    candidates.push(`${username}@${fqdn}`);
  }

  return [...new Set(candidates)];
};

const isLdapReferralError = (error) =>
  error?.name === "ReferralError" || error?.code === 10;

const isInvalidCredentialsError = (error) =>
  error?.name === "InvalidCredentialsError" || error?.code === 49;

const tryLdapBind = async (client, candidates, password) => {
  let lastError;

  for (const bindDn of candidates) {
    try {
      await client.bind(bindDn, password);
      return bindDn;
    } catch (error) {
      lastError = error;
      if (isInvalidCredentialsError(error) || isLdapReferralError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("InvalidCredentialsError");
};

const searchLdapUser = async (client, username, baseDN) =>
  client.search(baseDN, {
    scope: "sub",
    filter: `(sAMAccountName=${escapeLdapFilter(username)})`,
    attributes: [
      "physicalDeliveryOfficeName",
      "displayName",
      "mail",
      "telephoneNumber",
      "sAMAccountName",
    ],
  });

const mapLdapAuthError = (error) => {
  if (isInvalidCredentialsError(error)) {
    const ldapError = new Error("Username atau password LDAP salah.");
    ldapError.statusCode = 400;
    ldapError.details = error?.name || "InvalidCredentialsError";
    return ldapError;
  }

  if (isLdapReferralError(error)) {
    const ldapError = new Error(
      "LDAP ReferralError: server AD mengarahkan ke DC lain. Pastikan AD_HOST menunjuk langsung ke Domain Controller.",
    );
    ldapError.statusCode = 400;
    ldapError.details = error?.name || "ReferralError";
    return ldapError;
  }

  const ldapError = new Error(
    "Gagal menghubungkan kredensial user ke LDAP, mungkin kesalahan username/password atau konfigurasi AD.",
  );
  ldapError.statusCode = 400;
  ldapError.details = error?.message || error?.name || String(error);
  return ldapError;
};

const escapeLdapFilter = (value = "") =>
  String(value).replace(/[\*\(\)\\0]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\00";
      case "(":
        return "\\28";
      case ")":
        return "\\29";
      case "*":
        return "\\2a";
      case "\\":
        return "\\5c";
      default:
        return char;
    }
  });

const getLdapAttribute = (entry, attributeName) => {
  if (!entry) return null;

  if (entry[attributeName] !== undefined) {
    return entry[attributeName];
  }

  if (entry.attributes?.[attributeName] !== undefined) {
    return entry.attributes[attributeName];
  }

  const rawValue = entry.raw?.[attributeName];
  if (Array.isArray(rawValue)) {
    return rawValue[0]?.toString?.() ?? rawValue[0] ?? null;
  }

  return rawValue?.toString?.() ?? rawValue ?? null;
};

const authenticateLdapCredentials = async (usernameRaw, password) => {
  if (!usernameRaw || !password) {
    const error = new Error("perlu username dan password");
    error.statusCode = 400;
    throw error;
  }

  const username = String(usernameRaw).trim();
  let adConfig;

  try {
    adConfig = await getActiveDirectoryConfig();
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  let client;
  try {
    client = new LdapClient({
      url: buildLdapUrl(adConfig),
      timeout: 15000,
    });

    const bindCandidates = buildBindCandidates(username, adConfig);
    const bindDn = await tryLdapBind(client, bindCandidates, password);

    try {
      const result = await searchLdapUser(
        client,
        username,
        adConfig.AD_BASE_DN,
      );
      const userLDAP = result?.[0];

      if (userLDAP) {
        const resolvedUsername =
          getLdapAttribute(userLDAP, "sAMAccountName") || username;
        return String(resolvedUsername).trim();
      }
    } catch (searchError) {
      if (!isLdapReferralError(searchError)) {
        console.warn(
          "LDAP search gagal setelah bind sukses:",
          searchError?.name || searchError,
        );
      }
    }

    console.log("LDAP bind sukses, search dilewati:", bindDn);
    return username;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    console.error("LDAP auth error:", error?.name || error);
    throw mapLdapAuthError(error);
  } finally {
    if (client) {
      await client.unbind().catch(() => {});
      await client.destroy().catch(() => {});
    }
  }
};

const getOrCreateLdapUser = async (username) => {
  let userDB = await UserRefrensi.findOne({ username });

  if (!userDB) {
    const kodeKasir = await generateUniqueKodeKasir(username);
    if (!kodeKasir) {
      const error = new Error("Gagal membuat kode kasir");
      error.statusCode = 400;
      throw error;
    }

    userDB = new UserRefrensi({
      username,
      authMethod: "ldap",
      kodeKasir,
    });
    await userDB.save();
    return userDB;
  }

  if (userDB.authMethod !== "ldap") {
    const error = new Error(
      "Username sudah terdaftar dengan metode login App, bukan LDAP.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!userDB.kodeKasir) {
    const kodeKasir = await generateUniqueKodeKasir(username);
    if (!kodeKasir) {
      const error = new Error("Gagal membuat kode kasir");
      error.statusCode = 400;
      throw error;
    }

    userDB.kodeKasir = kodeKasir;
    await userDB.save();
  }

  return userDB;
};

router.post("/ldap", async (req, res) => {
  const { username: usernameRaw, password } = req.body;

  try {
    const username = await authenticateLdapCredentials(usernameRaw, password);
    const userDB = await getOrCreateLdapUser(username);

    await repairCurrentOutletIfNeeded(userDB);

    const sanitizedUser = {
      _id: userDB._id,
      username: userDB.username,
    };

    const token = await generateTokenJWT(userDB._id);
    setAuthCookie(res, token);

    return res.json({
      message: "Selamat datang kembali",
      data: sanitizedUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Gagal login, silakan coba lagi.",
      error: error.details || error.message,
    });
  }
});

router.post("/ldapMobile", async (req, res) => {
  const { username: usernameRaw, password } = req.body;

  try {
    const username = await authenticateLdapCredentials(usernameRaw, password);
    const userDB = await getOrCreateLdapUser(username);

    if (userDB?.isDisabled === true) {
      return res.status(403).json({ message: "Akun anda telah dinonaktifkan" });
    }

    await repairCurrentOutletIfNeeded(userDB);

    const sanitized = {
      _id: userDB._id,
      username: userDB.username,
    };
    const token = await generateTokenMobile(userDB._id);
    if (!token) {
      return res
        .status(400)
        .json({ message: "Terjadi kesalahan sementara, coba lagi" });
    }

    return res.json({ message: "sukses", data: { token, data: sanitized } });
  } catch (error) {
    console.log(error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Gagal login, silakan coba lagi.",
      error: error.details || error.message,
    });
  }
});

// Update the createNewUser endpoint
router.post("/createNewUser", async (req, res) => {
  const {
    username,
    password,
    targetHargaPenjualan,
    targetQuantityPenjualan,
    roleName,
    blockedAccess,
    kodeKasir: customKodeKasir,
    outletId,
  } = req.body;

  // Validasi field wajib
  if (!username) {
    return res.status(400).json({ message: "Username diperlukan" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password diperlukan" });
  }
  if (!roleName) {
    return res.status(400).json({ message: "Role name diperlukan" });
  }

  try {
    // Periksa kodeKasir custom jika disediakan
    let kodeKasir;
    if (customKodeKasir && customKodeKasir.length > 0) {
      // Validasi format kodeKasir (harus 3 karakter)
      if (customKodeKasir.length !== 3) {
        return res.status(400).json({ message: "Kode kasir harus 3 karakter" });
      }

      // Periksa apakah kodeKasir sudah digunakan
      const existingKasir = await UserRefrensi.findOne({
        kodeKasir: customKodeKasir,
      });
      if (existingKasir) {
        return res.status(400).json({
          message: "Kode kasir sudah digunakan, silakan gunakan kode lain",
        });
      }

      kodeKasir = customKodeKasir;
    } else {
      // Generate kodeKasir otomatis jika tidak disediakan
      kodeKasir = await generateUniqueKodeKasir(username);
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Buat user baru
    const newUser = new UserRefrensi();
    newUser.username = username;
    newUser.password = hashedPassword;
    newUser.roleName = roleName;
    newUser.kodeKasir = kodeKasir;
    newUser.currentOutlet = outletId;

    // Field opsional
    if (targetHargaPenjualan !== undefined) {
      newUser.targetHargaPenjualan = Number(targetHargaPenjualan) || 0;
    }
    if (targetQuantityPenjualan !== undefined) {
      newUser.targetQuantityPenjualan = Number(targetQuantityPenjualan) || 0;
    }
    if (blockedAccess && Array.isArray(blockedAccess)) {
      newUser.blockedAccess = blockedAccess;
    }

    // Simpan user baru terlebih dahulu
    await newUser.save();

    // Jika terdapat outletId, maka tambahkan user ini ke outlet tersebut
    if (outletId && outletId.trim() !== "") {
      try {
        const outletDB = await Outlet.findById(outletId);
        if (outletDB) {
          // Pastikan user belum ada di kasirList outlet
          if (!outletDB.kasirList.includes(newUser._id)) {
            outletDB.kasirList.push(newUser._id);
            await outletDB.save();
          }
        } else {
          console.error(`Outlet dengan ID ${outletId} tidak ditemukan`);
        }
      } catch (error) {
        console.error("Error saat menambahkan user ke outlet:", error);
        // Jangan return error di sini, lanjutkan respons sukses untuk pembuatan user
      }
    }

    return res.json({
      message: "Telah berhasil inisialisasi user data",
      kodeKasir: kodeKasir,
      userId: newUser._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Username sudah digunakan",
        errors: error,
      });
    }
    return res.status(400).json({ message: error.message });
  }
});

router.put("/updateUser", async (req, res) => {
  const {
    _id,
    password,
    email,
    telepon,
    targetHargaPenjualan,
    targetQuantityPenjualan,
    roleName,
    blockedAccess,
    kodeKasir,
    currentOutlet,
  } = req.body;

  // Validasi field wajib
  if (!_id) {
    return res.status(400).json({ message: "ID user diperlukan" });
  }
  if (!roleName) {
    return res.status(400).json({ message: "Role name diperlukan" });
  }

  try {
    // Cari user berdasarkan ID
    const user = await UserRefrensi.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Validasi kodeKasir jika diubah
    if (kodeKasir && kodeKasir !== user.kodeKasir) {
      // Validasi format (harus 3 karakter)
      if (kodeKasir.length !== 3) {
        return res.status(400).json({ message: "Kode kasir harus 3 karakter" });
      }

      // Periksa apakah kodeKasir sudah digunakan oleh user lain
      const existingKasir = await UserRefrensi.findOne({
        kodeKasir,
        _id: { $ne: _id }, // Exclude current user
      });

      if (existingKasir) {
        return res.status(400).json({
          message: "Kode kasir sudah digunakan, silakan gunakan kode lain",
        });
      }

      // Update kodeKasir jika valid
      user.kodeKasir = kodeKasir;
    }

    // Update field wajib
    user.email = email;
    user.roleName = roleName;

    // Update field opsional
    if (password && password !== "") {
      const hashedPassword = bcrypt.hashSync(password, 10);
      user.password = hashedPassword;
    }
    if (telepon !== undefined) {
      user.telepon = telepon || ""; // Jika kosong, set ke string kosong
    }
    if (targetHargaPenjualan !== undefined) {
      user.targetHargaPenjualan = Number(targetHargaPenjualan) || 0;
    }
    if (targetQuantityPenjualan !== undefined) {
      user.targetQuantityPenjualan = Number(targetQuantityPenjualan) || 0;
    }

    if (blockedAccess && Array.isArray(blockedAccess)) {
      user.blockedAccess = blockedAccess;
    }

    if (currentOutlet !== undefined) {
      const outlet =
        typeof currentOutlet === "object" && currentOutlet
          ? currentOutlet._id
          : currentOutlet;

      if (!outlet) {
        return res.status(400).json({
          message: "currentOutlet wajib diisi",
        });
      }

      const allowed = await Outlet.exists({
        _id: outlet,
        kasirList: _id,
      });
      if (!allowed) {
        return res.status(400).json({
          message:
            "Outlet tidak valid atau user belum di-assign ke outlet tersebut",
        });
      }
      user.currentOutlet = outlet;
    }

    // Simpan perubahan
    await user.save();
    return res.json({ message: "User berhasil diperbarui" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Username atau email sudah digunakan",
        errors: error,
      });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.get("/getUserInfo", async (req, res) => {
  try {
    if (req.userId) {
      const userDB = await UserRefrensi.findById(req.userId)
        .select(
          "_id username blockedAccess roleName totalHargaPenjualan totalQuantityPenjualan targetHargaPenjualan targetQuantityPenjualan kodeKasir currentOutlet",
        )
        .populate("currentOutlet", "_id kodeOutlet namaOutlet mode");
      if (!userDB) {
        return res.status(404).json({ message: "akun tidak ditemukan" });
      }
      if (userDB?.isDisabled == true) {
        return res
          .status(403)
          .json({ message: "Akun anda telah dinonaktifkan" });
      } else {
        return res.json({ userInfo: userDB, outlet: userDB.currentOutlet });
      }
    } else {
      return res.status(401).json({ message: "Tidak ditemukan data" });
    }
  } catch (error) {
    return res.status(401).json({ message: "Tidak ditemukan data" });
  }
});

router.get("/getUserInfoComplete", async (req, res) => {
  try {
    const userDB = await UserRefrensi.findById(req.userId).select("-password");
    return res.json({ message: "sukses", data: userDB });
  } catch (error) {
    return res.status(400).json({ message: "gagal mendapatkan data" });
  }
});

router.get("/getAllAccount", authorize, async (req, res) => {
  try {
    const userDBs = await UserRefrensi.find().select(
      "-password -otp -otpExpiredAt",
    );
    return res.json({ message: "suzzess", data: userDBs });
  } catch (error) {
    return res.status(500).json({ message: JSON.stringify(error) });
  }
});

router.post("/loginMobile", authorize, async (req, res) => {
  const { username, password } = req.body;
  const userDB = await UserRefrensi.findOne({ username });
  if (!userDB) {
    return res.status(400).json({ message: "username atau password salah" });
  }
  const isPasswordMatch = bcrypt.compareSync(password, userDB.password);
  if (!isPasswordMatch) {
    return res.status(400).json({ message: "username atau password salah" });
  }

  await repairCurrentOutletIfNeeded(userDB);

  const sanitized = {
    _id: userDB._id,
    username: userDB.username,
  };
  const token = await generateTokenMobile(userDB._id);
  if (!token) {
    return res
      .status(400)
      .json({ message: "Terjadi kesalahan sementara, coba lagi" });
  }
  return res.json({ message: "sukses", data: { token, data: sanitized } });
});

router.get("/getUserById/:id", async (req, res) => {
  const { id } = req.params;
  const userDB = await UserRefrensi.findById(id).select(
    "username otp otpExpiredAt email telepon roleName kodeKasir",
  );
  if (!userDB) {
    return res.status(404).json({ message: "akun tidak ditemukan" });
  }
  return res.json({ message: "sukses", data: userDB });
});

//web
router.delete("/logout", async (req, res) => {
  res.clearCookie("token");
  return res.json({ message: "Berhasil logout" });
});

export default router;
