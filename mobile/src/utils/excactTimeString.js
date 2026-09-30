export default function excactTimeString() {
  return `${new Date().getDate().toString().padStart(2, "0")} ${
    [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ][new Date().getMonth()]
  } ${new Date().getFullYear()} ${new Date()
    .getHours()
    .toString()
    .padStart(2, "0")}:${new Date()
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${new Date().getSeconds().toString().padStart(2, "0")}`;
}
