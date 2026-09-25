import jwt from "jsonwebtoken";

// Browser menolak cookie `secure` yang di-set lewat http:// (mis. staging http://192.168.169.12:3003),
// jadi `secure` mengikuti protokol request, bukan NODE_ENV. COOKIE_SECURE=true/false untuk memaksa.
const isSecureRequest = (req) => {
  const forced = String(process.env.COOKIE_SECURE ?? "").trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  return Boolean(req?.secure) || forwardedProto === "https";
};

export const authCookieOptions = (req) => ({
  httpOnly: true,
  secure: isSecureRequest(req),
  sameSite: "lax",
  path: "/",
});

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    ...authCookieOptions(res.req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const generateTokenJWT = async (userId) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return token;
  } catch (error) {
    return null;
  }
};

export default generateTokenJWT;
