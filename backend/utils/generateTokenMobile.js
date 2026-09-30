import jwt from "jsonwebtoken";
const generateTokenMobile = async (userId) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET_MOBILE, {
      expiresIn: "90d", // Expires in 3 months
    });
    return token;
  } catch (error) {
    return null;
  }
};

export default generateTokenMobile;
