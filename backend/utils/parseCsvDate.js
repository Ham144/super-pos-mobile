// parse tanggal dari cell CSV — ISO & format Excel Indonesia (DD/MM/YYYY)
export function parseCsvDate(raw) {
  if (raw === undefined || raw === null || raw === "") return null;

  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
