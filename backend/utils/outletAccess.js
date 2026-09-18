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

/**
 * Pastikan user punya currentOutlet yang valid di kasirList.
 * Kalau belum assign ke outlet mana pun, pasang ke outlet default
 * (prefer mode offline, else outlet pertama) supaya authorize tidak OUTLET_REQUIRED.
 */
export const ensureUserOutletAccess = async (user) => {
  if (!user?._id) return user;

  await repairCurrentOutletIfNeeded(user);
  if (user.currentOutlet && (await hasOutletAccess(user._id, user.currentOutlet))) {
    return user;
  }

  const defaultOutlet =
    (await Outlet.findOne({ mode: "offline" }).select("_id kasirList")) ||
    (await Outlet.findOne().select("_id kasirList"));

  if (!defaultOutlet) {
    return user;
  }

  const alreadyMember = defaultOutlet.kasirList?.some(
    (id) => String(id) === String(user._id),
  );
  if (!alreadyMember) {
    defaultOutlet.kasirList = defaultOutlet.kasirList || [];
    defaultOutlet.kasirList.push(user._id);
    await defaultOutlet.save();
  }

  user.currentOutlet = defaultOutlet._id;
  await user.save();
  return user;
};
