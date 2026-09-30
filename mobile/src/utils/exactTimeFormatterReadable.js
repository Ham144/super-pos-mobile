export default function exactTimeFormatterReadable(tanggalBayar) {
  const tanggalBayarDate = new Date(tanggalBayar);
  const tanggalBayarStr = `${("0" + tanggalBayarDate.getDate()).slice(-2)} ${
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ][tanggalBayarDate.getMonth()]
  } ${tanggalBayarDate.getFullYear()} ${(
    "0" + tanggalBayarDate.getHours()
  ).slice(-2)}:${("0" + tanggalBayarDate.getMinutes()).slice(-2)}:${(
    "0" + tanggalBayarDate.getSeconds()
  ).slice(-2)}`;
  return tanggalBayarStr;
}
