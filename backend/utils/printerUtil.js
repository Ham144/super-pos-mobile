import {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
  BreakLine,
} from "node-thermal-printer";

// Helper function to format currency in Indonesian Rupiah
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const testPrintToThermalPrinter = async ({ ip, port, printerModel }) => {
  // Initialize the printer
  let printerModelInstance;
  const printerModelUpperCase = printerModel?.toUpperCase() || "";
  switch (printerModelUpperCase) {
    case "DARUMA":
      printerModelInstance = PrinterTypes.DARUMA;
      break;
    case "EPSON":
      printerModelInstance = PrinterTypes.EPSON;
      break;
    case "STAR":
      printerModelInstance = PrinterTypes.STAR;
      break;
    case "TANCA":
      printerModelInstance = PrinterTypes.TANCA;
      break;
    default:
      printerModelInstance = PrinterTypes.EPSON;
      break;
  }

  let printer = new ThermalPrinter({
    type: printerModelInstance,
    interface: `tcp://${ip}:${port}`, // Connect to your printer's IP and port
    characterSet: CharacterSet.PC852_LATIN2, // You can change character sets if needed
    breakLine: BreakLine.WORD, // Break line after words
    options: {
      timeout: 5000, // Connection timeout for network printers
    },
  });

  // Format the items into a string
  let textToPrint = "Test Berhasil";
  let isConnected = await printer.isPrinterConnected();
  if (isConnected) {
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.println(textToPrint);
    printer.cut(); // Cut the paper after printing
    await printer.execute(); // Execute all commands to the printer
    console.log("Print completed!");
    return true;
  } else {
    console.error("printer tidak terhubung.");
    return false;
  }
};

//cetak bill customer dan COPY struct (done, do not change)
export const printToThermalPrinterCetakBillCustomer = async ({
  ip,
  port,
  printerModel,
  diskons,
  promos,
  futureVouchers,
  subtotal,
  total,
  currentBill,
  _id,
  customerName,
  spg,
  salesPerson,
  paymentMethod,
  time,
  customerEmail,
  kodeInvoice,
}) => {
  // return true;
  // Initialize the printer
  console.log("Initialize the printer");
  let printerModelInstance;
  const printerModelUpperCase = printerModel?.toUpperCase() || "";
  switch (printerModelUpperCase) {
    case "DARUMA":
      printerModelInstance = PrinterTypes.DARUMA;
      break;
    case "EPSON":
      printerModelInstance = PrinterTypes.EPSON;
      break;
    case "STAR":
      printerModelInstance = PrinterTypes.STAR;
      break;
    case "TANCA":
      printerModelInstance = PrinterTypes.TANCA;
      break;
    default:
      printerModelInstance = PrinterTypes.EPSON;
      break;
  }
  let printer = new ThermalPrinter({
    type: printerModelInstance,
    interface: `tcp://${ip}:${port}`,
    characterSet: CharacterSet.PC852_LATIN2,
    breakLine: BreakLine.WORD,
    options: {
      timeout: 5000,
    },
  });
  printer.clear();

  // Check if the printer is connected
  let isConnected = await printer.isPrinterConnected();

  // Proceed with printing if connected
  if (isConnected) {
    const maxLength = printer.getWidth(); // Tentukan panjang maksimal untuk satu baris (misalnya 40 karakter)

    // Header (tidak diubah)
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.println("INVOICE BILL");
    printer.setTextSize(0, 0);
    printer.println("-".repeat(maxLength));
    printer.println("THIS IS A COPY");
    printer.println("-".repeat(maxLength));
    printer.alignLeft();
    printer.newLine();

    // Detail Customer (tidak diubah)
    printer.setTextSize(0, 0);
    printer.leftRight("WAKTU", time || "-");
    printer.leftRight("NAMA PEMBELI", customerName || "-");
    printer.leftRight("KASIR", salesPerson || "-");
    printer.leftRight("SPG", spg?.name || "-");
    printer.leftRight("KATEGORI PEMBAYARAN", paymentMethod || "-");
    printer.alignCenter();
    printer.println("-".repeat(maxLength));
    printer.alignLeft();

    // Main Item Header (tidak diubah)
    printer.setTextSize(1, 1);
    printer.alignCenter();
    printer.println("DAFTAR ITEM");
    printer.newLine();
    printer.setTextSize(0, 0);
    printer.alignLeft();

    // Helper function to format columns with proper spacing
    const formatColumns = (left, middle, right, paperWidth = 45) => {
      // Convert all inputs to strings and trim them
      left = String(left).trim();
      middle = String(middle).trim();
      right = String(right).trim();

      // Calculate the ideal width for each column
      const leftWidth = Math.floor(paperWidth * 0.4); // 50% for description
      const middleWidth = Math.floor(paperWidth * 0.2);
      const rightWidth = Math.floor(paperWidth * 0.4); // Remaining for price

      // Truncate and pad each column
      left =
        left.length > leftWidth
          ? left.substring(0, leftWidth - 3) + "..."
          : left.padEnd(leftWidth);
      middle = middle.padStart(middleWidth);
      right = right.padStart(rightWidth);

      return `${left}${middle}${right}`;
    };

    // Iterasi setiap item dengan detail terkait (diskon, promo, voucher)
    for (const item of currentBill) {
      // Format main item line
      const left = item?.description;
      const middle = `${item?.quantity}x`;
      const right = formatCurrency(item?.totalRp / item?.quantity);
      printer.println(formatColumns(left, middle, right));

      // Handle discounts
      const relatedDiskons =
        diskons?.filter((d) => d.description === item.description) || [];
      if (relatedDiskons.length) {
        for (const diskon of relatedDiskons) {
          const potongan = diskon?.diskonInfo.RpPotonganHarga
            ? formatCurrency(diskon.diskonInfo.RpPotonganHarga)
            : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
          printer.println(formatColumns("    Potongan", "", potongan));
        }
      }

      // Handle promos
      const relatedPromos =
        promos?.filter((p) => p.description === item.description) || [];
      if (relatedPromos.length) {
        for (const promo of relatedPromos) {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          printer.println(formatColumns("    Bonus", "", bonus));
        }
      }

      // Handle future vouchers
      const relatedVouchers =
        futureVouchers?.filter((v) => v.description === item.description) || [];
      if (relatedVouchers.length) {
        for (const voucher of relatedVouchers) {
          const potongan =
            voucher.voucherInfo.tipe === "fixed"
              ? `Rp ${voucher.voucherInfo.potongan.$numberDecimal}`
              : `${voucher.voucherInfo.potongan * 100}%`;
          printer.println(formatColumns("    Potongan", "", potongan));

          const tanggal = new Date(
            voucher.voucherInfo.berlakuHingga
          ).toLocaleDateString();
          printer.println(formatColumns("    Berlaku hingga", "", tanggal));
        }
      }

      printer.newLine(); // Space between items
    }

    // Footer (Subtotal, Total, dll.)
    printer.alignCenter();
    printer.println("-".repeat(maxLength));
    printer.alignLeft();
    printer.leftRight("Subtotal", formatCurrency(subtotal));
    printer.leftRight("Total", formatCurrency(total));
    printer.alignCenter();
    printer.newLine();
    printer.println("-".repeat(maxLength));
    printer.println("Silahkan membayar di kasir!");
    printer.println("Terimakasih atas pembelian!");
    printer.println("-".repeat(maxLength));
    printer.println("url: jualelektronik.com");
    printer.println("ig: jualelektronik");
    printer.println("-".repeat(maxLength));
    printer.cut();

    // Send the print job to the printer
    try {
      await printer.execute();
      console.log("Invoice printed successfully!");
      return true;
    } catch (error) {
      console.error("Error printing invoice: ", error);
      return false;
    }
  } else {
    return false;
  }
};

//bayar (done, do not change)
export const printToThermalPrinterCetakKwitansi = async ({
  ip,
  port,
  printerModel,
  diskons,
  promos,
  futureVouchers,
  subtotal,
  total,
  currentBill,
  _id,
  customerName,
  spg,
  salesPerson,
  paymentMethod,
  time,
  customerEmail,
  kodeInvoice,
}) => {
  if (!kodeInvoice) {
    console.log("kode invoice tidak diberikan, sehingga gagal mencetak logo");
    return false;
  }
  // Initialize the printer
  console.log("Initialize the printer");
  let printerModelInstance;
  const printerModelUpperCase = printerModel?.toUpperCase() || "";
  switch (printerModelUpperCase) {
    case "DARUMA":
      printerModelInstance = PrinterTypes.DARUMA;
      break;
    case "EPSON":
      printerModelInstance = PrinterTypes.EPSON;
      break;
    case "STAR":
      printerModelInstance = PrinterTypes.STAR;
      break;
    case "TANCA":
      printerModelInstance = PrinterTypes.TANCA;
      break;
    default:
      printerModelInstance = PrinterTypes.EPSON;
      break;
  }
  let printer = new ThermalPrinter({
    type: printerModelInstance,
    interface: `tcp://${ip}:${port}`,
    characterSet: CharacterSet.PC852_LATIN2,
    breakLine: BreakLine.WORD,
    options: {
      timeout: 5000,
    },
  });
  printer.clear();

  // Check if the printer is connected
  let isConnected = await printer.isPrinterConnected();

  // Proceed with printing if connected
  if (isConnected) {
    const maxLength = printer.getWidth(); // Tentukan panjang maksimal untuk satu baris (misalnya 40 karakter)

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.println("Bukti Pembayaran");
    printer.setTextSize(0, 0);
    printer.println("-".repeat(maxLength));
    printer.println("LUNAS");
    printer.println("-".repeat(maxLength));
    printer.alignLeft();
    printer.newLine();

    // Detail Customer (tidak diubah)
    printer.setTextSize(0, 0);
    printer.leftRight("Time", time || "-");
    printer.leftRight("Customer Name", customerName || "-");
    printer.leftRight("Kasir", salesPerson || "-");
    printer.leftRight("spg ", spg?.name || "-");
    printer.leftRight("Payment Method", paymentMethod || "-");
    printer.alignCenter();
    printer.println("-".repeat(maxLength));
    printer.alignLeft();

    // Main Item Header (tidak diubah)
    printer.setTextSize(1, 1);
    printer.alignCenter();
    printer.println("DAFTAR ITEM");
    printer.newLine();
    printer.setTextSize(0, 0);
    printer.alignLeft();

    // Helper function to format columns with proper spacing
    const formatColumns = (left, middle, right, paperWidth = 45) => {
      // Convert all inputs to strings and trim them
      left = String(left).trim();
      middle = String(middle).trim();
      right = String(right).trim();

      // Calculate the ideal width for each column
      const leftWidth = Math.floor(paperWidth * 0.5); // 50% for description
      const middleWidth = Math.floor(paperWidth * 0.2); // 20% for quantity
      const rightWidth = paperWidth - leftWidth - middleWidth; // Remaining for price

      // Truncate and pad each column
      left =
        left.length > leftWidth
          ? left.substring(0, leftWidth - 3) + "..."
          : left.padEnd(leftWidth);
      middle = middle.padStart(middleWidth);
      right = right.padStart(rightWidth);

      return `${left}${middle}${right}`;
    };

    // Iterasi setiap item dengan detail terkait (diskon, promo, voucher)
    for (const item of currentBill) {
      // Format main item line
      const left = item.description;
      const middle = `${item.quantity}x`;
      const right = formatCurrency(item.totalRp / item.quantity);
      printer.println(formatColumns(left, middle, right));

      // Handle discounts
      const relatedDiskons =
        diskons?.filter((d) => d.description === item.description) || [];
      if (relatedDiskons.length) {
        for (const diskon of relatedDiskons) {
          const potongan = diskon?.diskonInfo.RpPotonganHarga
            ? formatCurrency(diskon.diskonInfo.RpPotonganHarga)
            : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
          printer.println(formatColumns("    Potongan", "", potongan));
        }
      }

      // Handle promos
      const relatedPromos =
        promos?.filter((p) => p.description === item.description) || [];
      if (relatedPromos.length) {
        for (const promo of relatedPromos) {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          printer.println(formatColumns("    Bonus", "", bonus));
        }
      }

      // Handle future vouchers
      const relatedVouchers =
        futureVouchers?.filter((v) => v.description === item.description) || [];
      if (relatedVouchers.length) {
        for (const voucher of relatedVouchers) {
          const potongan =
            voucher.voucherInfo.tipe === "fixed"
              ? `Rp ${voucher.voucherInfo.potongan.$numberDecimal}`
              : `${voucher.voucherInfo.potongan * 100}%`;
          printer.println(formatColumns("    Potongan", "", potongan));

          const tanggal = new Date(
            voucher.voucherInfo.berlakuHingga
          ).toLocaleDateString();
          printer.println(formatColumns("    Berlaku hingga", "", tanggal));
        }
      }

      printer.newLine(); // Space between items
    }

    // Footer (Subtotal, Total, dll.)
    printer.alignCenter();
    printer.println("-".repeat(maxLength));
    printer.alignLeft();
    printer.leftRight("Subtotal", formatCurrency(subtotal));
    printer.leftRight("Total", formatCurrency(total));
    printer.alignCenter();
    printer.newLine();
    printer.println("-".repeat(maxLength));
    printer.println("Silahkan membayar di kasir!");
    printer.println("Terimakasih atas pembelian!");
    printer.println("-".repeat(maxLength));
    printer.println("url: jualelektronik.com");
    printer.println("ig: jualelektronik");
    printer.println("-".repeat(maxLength));
    printer.cut();

    // Send the print job to the printer
    try {
      await printer.execute();
      console.log("Invoice printed successfully!");
      return true;
    } catch (error) {
      console.error("Error printing invoice: ", error);
      return false;
    }
  } else {
    return false;
  }
};

//helper (done, do not change)
export const printHelperNote = async ({
  ip,
  port,
  printerModel,
  items,
  catatans,
  time,
}) => {
  let printerModelInstance;
  const printerModelUpperCase = printerModel?.toUpperCase() || "";
  switch (printerModelUpperCase) {
    case "DARUMA":
      printerModelInstance = PrinterTypes.DARUMA;
      break;
    case "EPSON":
      printerModelInstance = PrinterTypes.EPSON;
      break;
    case "STAR":
      printerModelInstance = PrinterTypes.STAR;
      break;
    case "TANCA":
      printerModelInstance = PrinterTypes.TANCA;
      break;
    default:
      printerModelInstance = PrinterTypes.EPSON;
      break;
  }

  let printer = new ThermalPrinter({
    type: printerModelInstance,
    interface: `tcp://${ip}:${port}`,
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    lineCharacter: "=",
    breakLine: BreakLine.WORD,
    options: {
      timeout: 5000,
    },
  });

  // Check if the printer is connected
  let isConnected = await printer.isPrinterConnected();

  if (isConnected) {
    printer.setTextSize(1, 1);
    printer.alignCenter();
    printer.println("Helper Note");
    printer.newLine();
    printer.setTextSize(0, 0);
    printer.println("--------------------");
    printer.println(time || "-");
    printer.println("--------------------");
    printer.newLine();

    printer.alignLeft();

    const maxLength = printer.getWidth();
    items.forEach((item) => {
      const description = item?.description || "";
      const quantity = item?.quantity || 0;

      const availableLength = maxLength - 4;
      let formattedDescription =
        description.length > availableLength
          ? description.substring(0, availableLength)
          : description.padEnd(availableLength);

      let formattedLine =
        formattedDescription + quantity.toString().padStart(4, " ");
      printer.println(formattedLine);
    });
    printer.newLine();

    printer.setTextSize(0, 0);
    printer.alignLeft();

    printer.newLine();
    if (catatans?.length > 0) {
      printer.println("Catatan:");
      catatans?.forEach((cat) => {
        printer.println(`${cat.sku}`);
        printer.println(`   ${cat.catatan}`);
      });
    } else {
      printer.println("Catatan:");
      printer.println("--");
    }
    
    printer.cut();
    printer.execute();
    return true;
  } else {
    console.error("Printer is not connected.");
    return false;
  }
};

//pengingat : Jangan ngoding printer di sini, karena printer tidak ip public, tidak akan tersambung
