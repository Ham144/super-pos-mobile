const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "constant.js");
const source = fs.readFileSync(file, "utf8");
const next = source.replace(
  /^export const environment = "development";/m,
  'export const environment = "production";',
);

if (!/^export const environment = "production";/m.test(next)) {
  console.error('src/constant.js: baris `export const environment = "production";` tidak ditemukan');
  process.exit(1);
}

fs.writeFileSync(file, next);
console.log('src/constant.js -> environment = "production"');
