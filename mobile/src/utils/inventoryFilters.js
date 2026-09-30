export const filterVisibleInventories = (items, removedSkus) => {
  const removed = new Set(Array.isArray(removedSkus) ? removedSkus : []);
  return (items || []).filter((item) => {
    if (!item?.sku) return false;
    if (removed.has(item.sku)) return false;
    if (item.isDisabled === true) return false;
    return true;
  });
};

export const loadRemovedInventorySkus = async (AsyncStorage) => {
  const raw = await AsyncStorage.getItem("removedInventorySkus");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
