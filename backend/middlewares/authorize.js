import UserRefrensi from "../models/User.model.js";
import { noAuthOriginalUrl } from "./authenticate.js";
import { hasOutletAccess } from "../utils/outletAccess.js";

const AUTH_USER_FIELDS =
  "_id username roleName blockedAccess currentOutlet isDisabled";

const normalizeUrl = (url) =>
  url.split("?")[0].replace(/\/$/, "").toLowerCase();

const skipOutletAccessCheck = (url) => {
  const path = normalizeUrl(url);
  return (
    path === "/api/v1/auth/logout" ||
    path === "/api/v1/outlet/simple-outlet-list" ||
    path.startsWith("/api/v1/outlet/switch-outlet/")
  );
};

const authorize = async (req, res, next) => {
  if (noAuthOriginalUrl?.includes(req?.originalUrl)) {
    return next();
  }

  try {
    if (!req?.userId) {
      return res.status(403).json({
        message: "Anda Tidak ditemukan di Database, coba login ulang",
      });
    }

    const userDB = await UserRefrensi.findById(req.userId).select(
      AUTH_USER_FIELDS,
    );
    if (!userDB) {
      return res.status(403).json({
        message: "Anda Tidak ditemukan di Database, coba login ulang",
      });
    }
    req.userDB = userDB;

    if (userDB.isDisabled) {
      return res.status(403).json({ message: "Akun anda telah dinonaktifkan" });
    }

    const allowWithoutOutlet = skipOutletAccessCheck(req.originalUrl);

    if (!userDB.currentOutlet && !allowWithoutOutlet) {
      return res.status(403).json({
        message: "Akun belum terhubung ke outlet, pilih outlet dulu",
        code: "OUTLET_REQUIRED",
      });
    }

    if (userDB.currentOutlet && !allowWithoutOutlet) {
      const allowed = await hasOutletAccess(userDB._id, userDB.currentOutlet);
      if (!allowed) {
        return res.status(403).json({
          message: "Anda tidak memiliki akses ke outlet ini",
          code: "OUTLET_ACCESS_REVOKED",
        });
      }
    }

    const normalizedRequestUrl = normalizeUrl(req.originalUrl);
    const isBlocked = (userDB.blockedAccess || []).some((blockedPath) =>
      normalizedRequestUrl.startsWith(normalizeUrl(blockedPath)),
    );

    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "Maaf, Anda tidak memiliki akses Fitur ini" });
    }

    next();
  } catch (error) {
    console.log("authorized endpoint failed : ", req.originalUrl);
    return res
      .status(500)
      .json({ message: "authorized endpoint failed ", error });
  }
};

export default authorize;
