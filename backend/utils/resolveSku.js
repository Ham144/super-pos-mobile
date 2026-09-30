// Ambil SKU dari query/body/params — aman untuk karakter seperti K-HD4812/30
export const resolveSkuFromReq = (req) => {
  const raw =
    req.query?.sku ||
    req.query?.skuId ||
    req.body?.sku ||
    req.params?.sku ||
    req.params?.skuId ||
    req.params?.[0] ||
    "";

  if (!raw) return "";

  try {
    return decodeURIComponent(String(raw).trim());
  } catch {
    return String(raw).trim();
  }
};
