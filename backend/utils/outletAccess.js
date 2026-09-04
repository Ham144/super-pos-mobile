import Outlet from "../models/Outlet.model.js";

export const hasOutletAccess = async (userId, outletId) => {
  if (!userId || !outletId) return false;
  return Boolean(
    await Outlet.exists({
      _id: outletId,
      kasirList: userId,
    }),
  );
};

export const repairCurrentOutletIfNeeded = async (user) => {
  if (!user) return user;
  
  const stillValid = await hasOutletAccess(user._id, user.currentOutlet);
  if (stillValid) return user;

  const fallback = await Outlet.findOne({ kasirList: user._id }).select("_id");
  if (!fallback) return user;

  user.currentOutlet = fallback._id;
  await user.save();
  return user;
};
