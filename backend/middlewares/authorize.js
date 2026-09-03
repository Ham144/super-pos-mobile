import UserRefrensi from "../models/User.model.js";
import { noAuthOriginalUrl } from "./authenticate.js";
import { hasOutletAccess } from "../utils/outletAccess.js";

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
    console.log("authorization skipped : ", req?.originalUrl);
    return next();
  }

  try {
    let userDB;
    if (req?.userId) {
      userDB = await UserRefrensi.findById(req?.userId);
    }
    if (!userDB) {
      return res.status(403).json({
        message: "Anda Tidak ditemukan di Database, coba login ulang",
      });
    }
    req.userDB = userDB;

    if (userDB.currentOutlet && !skipOutletAccessCheck(req.originalUrl)) {
      const allowed = await hasOutletAccess(userDB._id, userDB.currentOutlet);
      if (!allowed) {
        return res.status(403).json({
          message: "Anda tidak memiliki akses ke outlet ini",
          code: "OUTLET_ACCESS_REVOKED",
        });
      }
    }

    const normalizedRequestUrl = normalizeUrl(req.originalUrl);
    console.error(
      "endpoint array yang ditolak: ",
      userDB.blockedAccess.map(normalizeUrl),
    );
    console.warn("endpoint yang diperiksa: ", normalizedRequestUrl);

    const isBlocked = userDB.blockedAccess.some((blockedPath) =>
      normalizedRequestUrl.startsWith(normalizeUrl(blockedPath)),
    );

    if (isBlocked) {
      console.error("authorized endpoint ditolak : ", req.originalUrl);
      return res
        .status(403)
        .json({ message: "Maaf, Anda tidak memiliki akses Fitur ini" });
    }

    console.log("authorized endpoint success : ", req.originalUrl);
    next();
  } catch (error) {
    console.log("authorized endpoint failed : ", req.originalUrl);
    return res
      .status(500)
      .json({ message: "authorized endpoint failed ", error });
  }
};

export default authorize;
