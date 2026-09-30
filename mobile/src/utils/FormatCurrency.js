// Format currency
export const formatCurrency = (amount) => {
  return `Rp ${Math.round(amount).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};
