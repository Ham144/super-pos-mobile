import axios from "axios";
import { environment, getBaseUrl, getMobileAuthHeaders } from "../constant";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TcpSocket from "react-native-tcp-socket";
import printerFormatter from "../utils/printerFormatter";
import { formatCurrency } from "../utils/FormatCurrency.js";

export const printTest = async (config) => {
    return new Promise((resolve, reject) => {
      const { ipPrinter, portPrinter, tipePrinter } = config;
  
      const ESC_INIT = "\x1B\x40"; // Initialize printer
      const CUT_PAPER = "\x1D\x56\x41\x00"; // Full cut Mode A
      const ESC_ALIGN_CENTER = "\x1B\x61\x01"; // Align center
      const ESC_FONT_SIZE = "\x1D\x21\x11"; // Set font size
      const ESC_FEED = "\x1B\x64\x05"; // Feed 5 lines
      const ESC_STATUS = "\x1B\x76"; // Get printer status
  
      const sampleText =
        "TEST BERHASIL\n" +
        "Printer Model: " +
        tipePrinter +
        "\n" +
        "Printer berhasil terhubung";
  
      const message =
        ESC_INIT +
        ESC_ALIGN_CENTER +
        ESC_FONT_SIZE +
        sampleText +
        ESC_FEED +
        CUT_PAPER;
  
      let isDataSent = false;
      let isPrinterReady = false;
      let client = null;
  
      try {
        client = TcpSocket.createConnection(
          {
            port: portPrinter || 9100,
            host: ipPrinter,
            timeout: 10000, // 10 detik timeout
          },
          () => {
            // Cek status printer terlebih dahulu
            client.write(ESC_STATUS, "ascii");
  
            // Tunggu sebentar untuk memastikan printer siap
            setTimeout(() => {
              if (isPrinterReady && client) {
                client.write(message, "ascii", (err) => {
                  if (err) {
                    if (client) {
                      client.destroy();
                    }
                    reject({
                      status: "Failed",
                      message: `Gagal mengirim data ke printer: ${err.message}`,
                    });
                    return;
                  }
                  isDataSent = true;
  
                  // Tunggu sebentar untuk memastikan data terkirim
                  setTimeout(() => {
                    if (client) {
                      client.destroy();
                    }
                    if (isDataSent) {
                      resolve({
                        status: "Success",
                        message: "Printer berhasil mencetak!",
                      });
                    } else {
                      reject({
                        status: "Failed",
                        message: "Data tidak terkirim ke printer",
                      });
                    }
                  }, 1000);
                });
              } else {
                if (client) {
                  client.destroy();
                }
                reject({
                  status: "Failed",
                  message: "Printer tidak siap",
                });
              }
            }, 500);
          },
        );
  
        // Set connection timeout
        client.setTimeout(10000, () => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Koneksi ke printer timeout",
          });
        });
  
        client.on("error", (error) => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: `Gagal connect ke printer`,
          });
        });
  
        client.on("data", (data) => {
          // Cek status printer dari response
          const status = data[0];
          if (status === 0) {
            isPrinterReady = true;
          } else {
            if (client) {
              client.destroy();
            }
            reject({
              status: "Failed",
              message: "Printer dalam status error",
            });
          }
        });
  
        client.on("close", () => {
          if (!isDataSent) {
            reject({
              status: "Failed",
              message: "Koneksi printer terputus sebelum data terkirim",
            });
          }
        });
      } catch (error) {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Terjadi kesalahan: ${error.message}`,
        });
      }
    });
  };
  
  export const printCetakBillCustomer = async (
    config,
    bill,
    time,
    outlet,
    isFirstTime,
  ) => {
    const { ipPrinter, portPrinter } = config;
    const {
      diskons,
      promos,
      futureVouchers,
      subTotal,
      total,
      currentBill,
      spg,
      salesPerson,
      paymentMethod,
      customer,
      _id,
    } = bill;
  
    if (!bill) {
      throw new Error("terjadi kesalahan mencetak customer bill");
    }
  
    return new Promise((resolve, reject) => {
      // Setup printer configuration
      const ESC_INIT = printerFormatter.ESC_INIT;
      const CUT_PAPER = printerFormatter.CUT_PAPER;
      const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
      const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
      const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
      const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
      const ESC_STATUS = "\x1B\x76"; // Get printer status
      const totalWidth = printerFormatter.totalWidth;
  
      // Judul Besar di Tengah
      let message = ESC_INIT;
      message +=
        ESC_ALIGN_CENTER +
        ESC_FONT_SIZE_LARGE +
        "INVOICE BILL\n\n" +
        ESC_FONT_SIZE_NORMAL;
      if (!isFirstTime) {
        message += "-".repeat(45) + "\n";
        message += ESC_FONT_SIZE_NORMAL + "THIS IS A COPY\n";
      }
      message += "-".repeat(45) + "\n";
  
      // Format informasi dengan spasi dinamis
      const infoBill =
        `${printerFormatter.formatWithSpace("Ext doc", _id)}\n` +
        `${printerFormatter.formatWithSpace("Waktu Print", time)}\n` +
        `${printerFormatter.formatWithSpace("Nama Customer", customer?.name)}\n` +
        `${printerFormatter.formatWithSpace("Kasir", salesPerson)}\n` +
        `${printerFormatter.formatWithSpace("Spg", spg?.name)}\n` +
        `${printerFormatter.formatWithSpace("Payment Method", paymentMethod)}\n`;
  
      message += infoBill;
      message += "\n";
  
      // Judul Daftar Item di Tengah
      message += ESC_FONT_SIZE_NORMAL;
      message += "-".repeat(45) + "\n";
      message +=
        ESC_ALIGN_CENTER +
        ESC_FONT_SIZE_LARGE +
        "DAFTAR ITEM\n\n" +
        ESC_FONT_SIZE_NORMAL;
  
      // Menambahkan item ke pesan print
      message += ESC_ALIGN_LEFT;
      currentBill.forEach((item) => {
        const left = item?.sku;
        const middle = `x ${item?.quantity}`;
        const right = `Rp ${item.totalRp.toLocaleString("id-ID")}`;
  
        message += item?.description + "\n";
        message += printerFormatter.formatColumns(left, middle, right) + "\n";
  
        // Menambahkan diskon terkait
        const relatedDiskons =
          diskons?.filter((d) => d.description === item.description) || [];
        relatedDiskons.forEach((diskon) => {
          const potongan = diskon?.diskonInfo.RpPotonganHarga
            ? `${diskon.diskonInfo.RpPotonganHarga}`
            : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
          message +=
            printerFormatter.formatColumns(
              "\tPotongan Diskon",
              "",
              formatCurrency(potongan),
            ) + "\n";
        });
  
        // print promo particular
        const relatedPromos =
          promos?.filter((p) => p.description === item.description) || [];
        relatedPromos.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message +=
            printerFormatter.formatColumns("\tFree (PARTICULAR)", "", bonus) +
            "\n";
        });
  
        // Menambahkan future vouchers
        const relatedVouchers =
          futureVouchers?.filter((v) => v.description === item.description) || [];
        relatedVouchers.forEach((voucher) => {
          const potongan = voucher.voucherInfo.potongan;
          message +=
            printerFormatter.formatColumns(
              "\tVoucher (NEXT TIME)",
              "",
              `Rp ${potongan.toLocaleString("id-ID")}`,
            ) + "\n";
  
          const tanggal = new Date(
            voucher.voucherInfo.berlakuHingga,
          ).toLocaleDateString();
          message +=
            printerFormatter.formatColumns(
              "\tVoucher Berlaku hingga",
              "",
              tanggal,
            ) + "\n";
        });
      });
  
      // print promo simple_total
      message += ESC_ALIGN_CENTER;
      const simplePromos = promos?.filter((p) => p.promoInfo?.kategori) || [];
      if (simplePromos?.length) {
        message += "-".repeat(45) + "\n";
        message += "BONUS PROMO (keseluruhan)\n";
        simplePromos.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
        });
      }
  
      // Menambahkan subtotal dan total dengan spasi dinamis
      message += ESC_ALIGN_CENTER;
      message += "-".repeat(45) + "\n";
      message += ESC_ALIGN_LEFT;
  
      message += "\n";
      message += printerFormatter.formatColumns(
        "SUBTOTAL",
        "",
        `Rp ${subTotal.toLocaleString("id-ID")}`,
      );
      message += "\n";
      message += printerFormatter.formatColumns(
        "TOTAL",
        "",
        `Rp ${total.toLocaleString("id-ID")}`,
      );
      message += "\n";
  
      // Footer dengan terpusat
      message += ESC_ALIGN_CENTER;
      message += "-".repeat(totalWidth) + "\n";
      message += "Silahkan membayar di kasir\n";
      message += "-".repeat(totalWidth) + "\n";
  
      //footer
      message += ESC_ALIGN_LEFT;
      message += ESC_FONT_SIZE_NORMAL;
      message += "\n";
      if (outlet?.namaPerusahaan) {
        message += "Nama perusahaan: " + outlet?.namaPerusahaan || "";
        message += "\n";
        message += "NPWP: " + outlet?.npwp || "";
        message += "\n";
        message += "Alamat: " + "\n" + outlet?.alamat || "";
        message += "\n";
        message += "-".repeat(totalWidth);
      }
      message += "\n\n\n\n\n";
      message += CUT_PAPER;
  
      if (environment == "development") {
        console.log("PRINT CETAK BILL CUSTOMER HASIL : \n", message);
        resolve(true);
        return true;
      }
      let isDataSent = false;
      let isPrinterReady = false;
      let client = null;
  
      try {
        client = TcpSocket.createConnection(
          {
            port: portPrinter || 9100,
            host: ipPrinter,
            timeout: 10000, // 10 detik timeout
          },
          () => {
            // Cek status printer terlebih dahulu
            client.write(ESC_STATUS, "ascii");
  
            // Tunggu sebentar untuk memastikan printer siap
            setTimeout(() => {
              if (isPrinterReady && client) {
                client.write(message, "ascii", (err) => {
                  if (err) {
                    if (client) {
                      client.destroy();
                    }
                    reject({
                      status: "Failed",
                      message: `Gagal mengirim data ke printer: ${err.message}`,
                    });
                    return;
                  }
                  isDataSent = true;
  
                  // Tunggu sebentar untuk memastikan data terkirim
                  setTimeout(() => {
                    if (client) {
                      client.destroy();
                    }
                    if (isDataSent) {
                      resolve(true);
                    } else {
                      reject({
                        status: "Failed",
                        message: "Data tidak terkirim ke printer",
                      });
                    }
                  }, 1000);
                });
              } else {
                if (client) {
                  client.destroy();
                }
                reject({
                  status: "Failed",
                  message: "Printer tidak siap",
                });
              }
            }, 500);
          },
        );
  
        // Set connection timeout
        client.setTimeout(10000, () => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Koneksi ke printer timeout",
          });
        });
  
        client.on("error", (error) => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: `Gagal connect ke printer`,
          });
        });
  
        client.on("data", (data) => {
          // Cek status printer dari response
          const status = data[0];
          if (status === 0) {
            isPrinterReady = true;
          } else {
            if (client) {
              client.destroy();
            }
            reject({
              status: "Failed",
              message: "Printer dalam status error",
            });
          }
        });
  
        client.on("close", () => {
          if (!isDataSent) {
            reject({
              status: "Failed",
              message: "Koneksi printer terputus sebelum data terkirim",
            });
          }
        });
      } catch (error) {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Terjadi kesalahan: ${error.message}`,
        });
      }
    });
  };
  
  // Fungsi untuk mencetak kwitansi
  export const printCetakKwitansi = async (
    config,
    bill,
    time,
    outlet,
    isFirstTime,
  ) => {
    const { ipPrinter, portPrinter } = config;
    const {
      diskons,
      promos,
      futureVouchers,
      subTotal,
      total,
      currentBill,
      spg,
      salesPerson,
      paymentMethod,
      customer,
      nomorTransaksi,
      tanggalBayar,
      _id,
    } = bill;
  
    if (!bill) {
      throw new Error("terjadi kesalahan mencetak customer bill");
    }
  
    return new Promise((resolve, reject) => {
      // Setup printer configuration
      const ESC_INIT = "\x1B\x40";
      const CUT_PAPER = "\x1D\x56\x00";
      const ESC_ALIGN_CENTER = "\x1B\x61\x01";
      const ESC_ALIGN_LEFT = "\x1B\x61\x00";
      const ESC_FONT_SIZE_LARGE = "\x1D\x21\x11";
      const ESC_FONT_SIZE_NORMAL = "\x1D\x21\x00";
      const ESC_STATUS = "\x1B\x76"; // Get printer status
      const totalWidth = 46;
  
      // Judul Besar di Tengah
      let message = ESC_INIT;
      message +=
        ESC_ALIGN_CENTER +
        ESC_FONT_SIZE_LARGE +
        "BUKTI PEMBAYARAN\n\n" +
        ESC_FONT_SIZE_NORMAL;
      message += "-".repeat(45) + "\n";
      message += ESC_FONT_SIZE_NORMAL + "LUNAS\n";
      message += "-".repeat(45) + "\n";
  
      if (!isFirstTime) {
        message += ESC_FONT_SIZE_NORMAL + "THIS IS A COPY\n";
        message += "-".repeat(45) + "\n";
      }
  
      //converted tanggalBayar
      let tanggalBayarStr = "";
      if (tanggalBayar) {
        tanggalBayarStr = exactTimeFormatterReadable(tanggalBayar);
      }
      let infoBill = "";
      // Format informasi dengan spasi dinamis
      infoBill +=
        `${printerFormatter.formatWithSpace("Ext doc", _id)}\n` +
        `${printerFormatter.formatWithSpace(
          "Waktu Pembayaran",
          tanggalBayarStr || time,
        )}\n` +
        `${printerFormatter.formatWithSpace("Waktu Print", time)}\n` +
        `${printerFormatter.formatWithSpace(
          "Nama Customer",
          customer?.name || "",
        )}\n` +
        `${printerFormatter.formatWithSpace("Kasir", salesPerson)}\n` +
        `${printerFormatter.formatWithSpace("Spg", spg?.name || "")}\n` +
        `${printerFormatter.formatWithSpace(
          "Payment Method",
          paymentMethod || "",
        )}\n`;
  
      if (nomorTransaksi) {
        infoBill += `${printerFormatter.formatWithSpace(
          "Nomor Transaksi",
          nomorTransaksi,
        )}\n`;
      }
      message += infoBill;
      message += "\n";
  
      // Judul Daftar Item di Tengah
      message += ESC_FONT_SIZE_NORMAL;
      message += "-".repeat(45) + "\n";
      message +=
        ESC_ALIGN_CENTER +
        ESC_FONT_SIZE_LARGE +
        "DAFTAR ITEM\n\n" +
        ESC_FONT_SIZE_NORMAL;
  
      // Menambahkan item ke pesan print
      message += ESC_ALIGN_LEFT;
      currentBill.forEach((item) => {
        const left = item?.sku;
        const middle = `x ${item?.quantity}`;
        const right = `Rp ${item.totalRp.toLocaleString("id-ID")}`;
  
        message += item?.description + "\n";
        message += printerFormatter.formatColumns(left, middle, right) + "\n";
  
        // Menambahkan diskon terkait
        const relatedDiskons =
          diskons?.filter((d) => d.description === item.description) || [];
        relatedDiskons.forEach((diskon) => {
          const potongan = diskon?.diskonInfo.RpPotonganHarga
            ? `${diskon.diskonInfo.RpPotonganHarga}`
            : `${diskon.voucherInfo.potongan.$numberDecimal * 100}%`;
          message +=
            printerFormatter.formatColumns(
              "\tPotongan Diskon",
              "",
              formatCurrency(potongan),
            ) + "\n";
        });
  
        // Menambahkan promo terkait
        const relatedPromos =
          promos?.filter((p) => p.description === item.description) || [];
        relatedPromos.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
        });
  
        // Menambahkan future vouchers
        const relatedVouchers =
          futureVouchers?.filter((v) => v.description === item.description) || [];
        relatedVouchers.forEach((voucher) => {
          const potongan = voucher.voucherInfo.potongan;
          message +=
            printerFormatter.formatColumns(
              "\tVoucher (NEXT TIME)",
              "",
              `Rp ${potongan.toLocaleString("id-ID")}`,
            ) + "\n";
  
          const tanggal = new Date(
            voucher.voucherInfo.berlakuHingga,
          ).toLocaleDateString();
          message +=
            printerFormatter.formatColumns(
              "\tVoucher Berlaku hingga",
              "",
              tanggal,
            ) + "\n";
        });
      });
  
      // print promo simple_total
      message += ESC_ALIGN_CENTER;
      const simplePromos = promos?.filter((p) => p.promoInfo?.kategori) || [];
      if (simplePromos?.length) {
        message += "-".repeat(45) + "\n";
        message += "BONUS PROMO (keseluruhan)\n";
        simplePromos.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
        });
      }
  
      // Menambahkan subtotal dan total dengan spasi dinamis
      message += ESC_ALIGN_CENTER;
      message += "-".repeat(45) + "\n";
      message += ESC_ALIGN_LEFT;
  
      message += "\n";
      message += printerFormatter.formatColumns(
        "SUBTOTAL",
        "",
        `Rp ${subTotal.toLocaleString("id-ID")}`,
      );
      message += "\n";
      message += printerFormatter.formatColumns(
        "TOTAL",
        "",
        `Rp ${total.toLocaleString("id-ID")}`,
      );
      message += "\n";
  
      // Footer dengan terpusat
      message += ESC_ALIGN_CENTER;
      message += "-".repeat(totalWidth) + "\n";
      message += "Terimakasih atas pembelian!\n";
      message += "-".repeat(totalWidth) + "\n";
  
      //footer
      message += ESC_ALIGN_LEFT;
      message += ESC_FONT_SIZE_NORMAL;
      message += "\n";
      if (futureVouchers?.length > 0) {
        message +=
          "Catatan: future Voucher berlaku dipembelian selanjunya, 5 karakter kode voucher telah/akan dikirim ke email anda";
        message += "\n";
        message += "-".repeat(totalWidth) + "\n";
      }
      if (outlet?.namaPerusahaan) {
        message += "Nama perusahaan: " + outlet?.namaPerusahaan || "";
        message += "\n";
        message += "NPWP: " + outlet?.npwp || "";
        message += "\n";
        message += "Alamat: " + "\n" + outlet?.alamat || "";
        message += "\n";
        message += "-".repeat(totalWidth);
      }
      message += "\n\n\n\n\n";
      message += CUT_PAPER;
  
      //------------------END---------------------
  
      if (environment == "development") {
        console.log("PRINT CETAK KWITANSI HASIL : \n", message);
        resolve(true);
        return true;
      }
      let isDataSent = false;
      let isPrinterReady = false;
      let client = null;
  
      try {
        client = TcpSocket.createConnection(
          {
            port: portPrinter || 9100,
            host: ipPrinter,
            timeout: 10000, // 10 detik timeout
          },
          () => {
            // Cek status printer terlebih dahulu
            client.write(ESC_STATUS, "ascii");
  
            // Tunggu sebentar untuk memastikan printer siap
            setTimeout(() => {
              if (isPrinterReady && client) {
                client.write(message, "ascii", (err) => {
                  if (err) {
                    if (client) {
                      client.destroy();
                    }
                    reject({
                      status: "Failed",
                      message: `Gagal mengirim data ke printer: ${err.message}`,
                    });
                    return;
                  }
                  isDataSent = true;
  
                  // Tunggu sebentar untuk memastikan data terkirim
                  setTimeout(() => {
                    if (client) {
                      client.destroy();
                    }
                    if (isDataSent) {
                      resolve(true);
                    } else {
                      reject({
                        status: "Failed",
                        message: "Data tidak terkirim ke printer",
                      });
                    }
                  }, 1000);
                });
              } else {
                if (client) {
                  client.destroy();
                }
                reject({
                  status: "Failed",
                  message: "Printer tidak siap",
                });
              }
            }, 500);
          },
        );
  
        // Set connection timeout
        client.setTimeout(10000, () => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Koneksi ke printer timeout",
          });
        });
  
        client.on("error", () => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: `Gagal connect ke printer`,
          });
        });
  
        client.on("data", (data) => {
          // Cek status printer dari response
          const status = data[0];
          if (status === 0) {
            isPrinterReady = true;
          } else {
            if (client) {
              client.destroy();
            }
            reject({
              status: "Failed",
              message: "Printer dalam status error",
            });
          }
        });
  
        client.on("close", () => {
          if (!isDataSent) {
            reject({
              status: "Failed",
              message: "Koneksi printer terputus sebelum data terkirim",
            });
          }
        });
      } catch (error) {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Terjadi kesalahan: ${error.message}`,
        });
      }
    });
  };
  
  //untuk mencetak bill helper
  export const printCetakHelper = async (
    _id,
    config,
    items,
    promo,
    catatans,
    time,
  ) => {
    const { ipPrinter, portPrinter } = config;
  
    return new Promise((resolve, reject) => {
      // Setup printer configuration
      const ESC_INIT = printerFormatter.ESC_INIT;
      const CUT_PAPER = printerFormatter.CUT_PAPER;
      const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
      const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
      const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
      const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
      const ESC_STATUS = "\x1B\x76"; // Get printer status
      const totalWidth = printerFormatter.totalWidth;
  
      // Initialize message
      let message = ESC_INIT;
      message += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE;
      message += "STRUK PENGAMBILAN\n\n";
      message += ESC_FONT_SIZE_NORMAL;
      message += ESC_ALIGN_LEFT;
      message += `Ext Doc: ${_id}\n`;
      message += `Waktu Print: ${time}\n`;
      message += "-".repeat(totalWidth) + "\n";
  
      // Helper function to format item lines
      const formatColumns = (left, right, paperWidth = totalWidth) => {
        left = String(left).trim();
        right = String(right).trim();
  
        const leftWidth = Math.floor(paperWidth * 0.7);
        const rightWidth = Math.floor(paperWidth * 0.3);
  
        left =
          left.length > leftWidth
            ? left.substring(0, leftWidth - 1) + "..."
            : left.padEnd(leftWidth);
        right = right.padStart(rightWidth);
  
        return `${left}${right}`;
      };
  
      // Print items
      items.forEach((item) => {
        const sku = item?.sku || "";
        const quantity = item?.quantity || 0;
        message += formatColumns(sku, `x${quantity}`) + "\n";
      });
  
      message += "-".repeat(totalWidth) + "\n";
  
      const promosParticular = [];
      const promosTotal = [];
  
      promo.forEach((promo) => {
        if (promo?.promoInfo?.kategori) {
          promosTotal.push(promo);
        } else {
          promosParticular.push(promo);
        }
      });
  
      if (promosParticular?.length) {
        // print promo simple_total
        message += "-".repeat(45) + "\n";
        message += ESC_ALIGN_CENTER;
  
        message += "PROMO (particular)\n";
        promosParticular.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
        });
      }
  
      if (promosTotal?.length) {
        // print promo simple_total
        message += "-".repeat(45) + "\n";
        message += ESC_ALIGN_CENTER;
  
        message += "PROMO (keseluruhan)\n";
        promosTotal.forEach((promo) => {
          const bonus = `${promo.promoInfo.skuBarangBonus} ${promo.promoInfo?.quantityBonus}x`;
          message += printerFormatter.formatColumns("\tFree", "", bonus) + "\n";
        });
      }
  
      // Print catatan
      message += ESC_ALIGN_LEFT;
      message += "Catatan:\n";
      if (catatans && catatans?.length > 0) {
        catatans?.forEach((cat) => {
          message += `${cat.sku}\n`;
          message += `   ${cat.catatan}\n`;
        });
      } else {
        message += "--\n";
      }
  
      message += "\n\n\n\n\n";
      message += CUT_PAPER;
  
      if (environment == "development") {
        console.log("PRINT CETAK HELPER HASIL : \n", message);
        resolve(true);
        return true;
      }
  
      let isDataSent = false;
      let isPrinterReady = false;
      let client = null;
  
      try {
        client = TcpSocket.createConnection(
          {
            port: portPrinter || 9100,
            host: ipPrinter,
            timeout: 10000, // 10 detik timeout
          },
          () => {
            // Cek status printer terlebih dahulu
            client.write(ESC_STATUS, "ascii");
  
            // Tunggu sebentar untuk memastikan printer siap
            setTimeout(() => {
              if (isPrinterReady && client) {
                client.write(message, "ascii", (err) => {
                  if (err) {
                    if (client) {
                      client.destroy();
                    }
                    reject({
                      status: "Failed",
                      message: `Gagal mengirim data ke printer: ${err.message}`,
                    });
                    return;
                  }
                  isDataSent = true;
  
                  // Tunggu sebentar untuk memastikan data terkirim
                  setTimeout(() => {
                    if (client) {
                      client.destroy();
                    }
                    if (isDataSent) {
                      resolve(true);
                    } else {
                      reject({
                        status: "Failed",
                        message: "Data tidak terkirim ke printer",
                      });
                    }
                  }, 1000);
                });
              } else {
                if (client) {
                  client.destroy();
                }
                reject({
                  status: "Failed",
                  message: "Printer tidak siap",
                });
              }
            }, 500);
          },
        );
  
        // Set connection timeout
        client.setTimeout(10000, () => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: "Koneksi ke printer timeout",
          });
        });
  
        client.on("error", (error) => {
          if (client) {
            client.destroy();
          }
          reject({
            status: "Failed",
            message: `Gagal connect ke printer`,
          });
        });
  
        client.on("data", (data) => {
          // Cek status printer dari response
          const status = data[0];
          if (status === 0) {
            isPrinterReady = true;
          } else {
            if (client) {
              client.destroy();
            }
            reject({
              status: "Failed",
              message: "Printer dalam status error",
            });
          }
        });
  
        client.on("close", () => {
          if (!isDataSent) {
            reject({
              status: "Failed",
              message: "Koneksi printer terputus sebelum data terkirim",
            });
          }
        });
      } catch (error) {
        if (client) {
          client.destroy();
        }
        reject({
          status: "Failed",
          message: `Terjadi kesalahan: ${error.message}`,
        });
      }
    });
  };
  
  const getDefaultPrinterConfig = async () => {
    const normalizePrinterConfig = (config) => ({
      ...config,
      ipPrinter: config?.ipPrinter || "",
      tipePrinter: config?.tipePrinter || "",
      portPrinter: String(config?.portPrinter || config?.port || ""),
    });
  
    const raw = await AsyncStorage.getItem("printerConfigs");
    if (raw) {
      try {
        const multiConfig = JSON.parse(raw);
        const defaultConfig =
          multiConfig?.find((config) => config.isDefault) ||
          multiConfig?.[0] ||
          null;
  
        if (defaultConfig) {
          return normalizePrinterConfig(defaultConfig);
        }
      } catch (error) {
        console.log("Gagal membaca printer configs lokal", error);
      }
    }
  
    try {
      const printers = await getPrinterConfigs();
      if (!printers.length) {
        return null;
      }
  
      const normalizedPrinters = printers.map((printer) =>
        normalizePrinterConfig(printer),
      );
      const defaultIndex =
        normalizedPrinters.findIndex((printer) => printer.isDefault) >= 0
          ? normalizedPrinters.findIndex((printer) => printer.isDefault)
          : 0;
  
      const printersToStore = normalizedPrinters.map((printer, index) => ({
        ...printer,
        isDefault: index === defaultIndex,
      }));
  
      await AsyncStorage.setItem(
        "printerConfigs",
        JSON.stringify(printersToStore),
      );
  
      return printersToStore[defaultIndex];
    } catch (error) {
      console.log("Gagal mengambil printer configs dari server", error);
      return null;
    }
  };
  
  const sendRawPrintMessage = (config, message) => {
    const { ipPrinter, portPrinter } = config;
    const ESC_STATUS = "\x1B\x76";
  
    return new Promise((resolve, reject) => {
      let isDataSent = false;
      let isPrinterReady = false;
      let client = null;
      let settled = false;
  
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
  
      try {
        client = TcpSocket.createConnection(
          {
            port: portPrinter || 9100,
            host: ipPrinter,
            timeout: 10000,
          },
          () => {
            client.write(ESC_STATUS, "ascii");
  
            setTimeout(() => {
              if (isPrinterReady && client) {
                client.write(message, "ascii", (err) => {
                  if (err) {
                    if (client) client.destroy();
                    finish(
                      reject,
                      new Error(`Gagal mengirim data ke printer: ${err.message}`),
                    );
                    return;
                  }
                  isDataSent = true;
  
                  setTimeout(() => {
                    if (client) client.destroy();
                    finish(resolve, true);
                  }, 1000);
                });
              } else {
                if (client) client.destroy();
                finish(reject, new Error("Printer tidak siap"));
              }
            }, 500);
          },
        );
  
        client.setTimeout(10000, () => {
          if (client) client.destroy();
          finish(reject, new Error("Koneksi ke printer timeout"));
        });
  
        client.on("error", () => {
          if (client) client.destroy();
          finish(reject, new Error("Gagal connect ke printer"));
        });
  
        client.on("data", (data) => {
          const status = data[0];
          if (status === 0) {
            isPrinterReady = true;
          } else {
            if (client) client.destroy();
            finish(reject, new Error("Printer dalam status error"));
          }
        });
  
        client.on("close", () => {
          if (!isDataSent) {
            finish(
              reject,
              new Error("Koneksi printer terputus sebelum data terkirim"),
            );
          }
        });
      } catch (error) {
        if (client) client.destroy();
        finish(reject, error);
      }
    });
  };
  
  export const printSettlement = async ({
    totals,
    totalAmount,
    outletName,
    settlementDate,
  }) => {
    const config = await getDefaultPrinterConfig();
    if (!config?.tipePrinter || !config?.ipPrinter || !config?.portPrinter) {
      throw new Error("Config printer belum lengkap");
    }
  
    // Print
    const ESC_INIT = printerFormatter.ESC_INIT;
    const CUT_PAPER = printerFormatter.CUT_PAPER;
    const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
    const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
    const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
    const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
    const totalWidth = printerFormatter.totalWidth;
  
    let printMessage = ESC_INIT;
    printMessage +=
      ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + "SETTLEMENT" + "\n\n";
    printMessage += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + outletName + "\n\n";
    printMessage += ESC_FONT_SIZE_NORMAL + "-".repeat(totalWidth) + "\n";
    printMessage += `Tanggal Settlement: ${settlementDate}\n`;
    printMessage += "Metode Pembayaran dan Total\n";
    printMessage += "-".repeat(totalWidth) + "\n\n";
    printMessage += ESC_ALIGN_LEFT;
  
    printerFormatter.formatColumns("Metode Pembayaran", "", "Total");
    totals.forEach((item) => {
      const paymentMethod = item?._id ?? "UNKNOWN";
  
      printMessage += printerFormatter.formatColumns(
        paymentMethod,
        "",
        formatCurrency(item?.totalSales),
      );
      printMessage += "\n";
    });
  
    printMessage += "-".repeat(totalWidth) + "\n";
  
    printMessage += printerFormatter.formatColumns(
      "Total Keseluruhan",
      "",
      formatCurrency(totalAmount),
    );
    printMessage += "\n\n\n\n\n";
    printMessage += CUT_PAPER;
  
    if (environment == "development") {
      return true;
    }
  
    return sendRawPrintMessage(config, printMessage);
  };
  
  //untuk mencetak end of day (pengelompokan total quantity dan harga hari ini pada outlet)
  export const printCetakEOD = async ({
    totals,
    totalAmount,
    outletName,
    date,
  }) => {
    const config = await getDefaultPrinterConfig();
    if (!config?.tipePrinter || !config?.ipPrinter || !config?.portPrinter) {
      throw new Error("Config printer belum lengkap");
    }
  
    // Format currency
    const formatCurrency = (amount) => {
      return `Rp ${amount.toLocaleString("id-ID")}`;
    };
  
    // Print
    const ESC_INIT = printerFormatter.ESC_INIT;
    const CUT_PAPER = printerFormatter.CUT_PAPER;
    const ESC_ALIGN_CENTER = printerFormatter.ESC_ALIGN_CENTER;
    const ESC_ALIGN_LEFT = printerFormatter.ESC_ALIGN_LEFT;
    const ESC_FONT_SIZE_LARGE = printerFormatter.ESC_FONT_SIZE_LARGE;
    const ESC_FONT_SIZE_NORMAL = printerFormatter.ESC_FONT_SIZE_NORMAL;
    const totalWidth = printerFormatter.totalWidth;
  
    let printMessage = ESC_INIT;
    printMessage +=
      ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + "END OF DAY" + "\n\n";
    printMessage += ESC_ALIGN_CENTER + ESC_FONT_SIZE_LARGE + outletName + "\n\n";
    printMessage += ESC_FONT_SIZE_NORMAL + "-".repeat(totalWidth) + "\n";
    printMessage += `End of Day: ${date}\n`;
    printMessage += "SKU Grouping by today\n";
    printMessage += "-".repeat(totalWidth) + "\n\n";
    printMessage += ESC_ALIGN_LEFT;
  
    printMessage += printerFormatter.formatColumns("SKU", "QTY", "SALE");
    printMessage += "\n";
  
    totals.forEach((item) => {
      const sku = item?._id ?? "?sku?";
  
      printMessage += printerFormatter.formatColumns(
        sku,
        item?.totalQuantity ? item.totalQuantity : "-",
        item?.totalSales ? item.totalSales : "-",
      );
      printMessage += "\n";
    });
  
    const totalAmountQuantity = totals.reduce(
      (acc, item) => acc + (item?.totalQuantity || 0),
      0,
    );
  
    printMessage += "-".repeat(totalWidth) + "\n";
    printMessage += printerFormatter.formatColumns(
      "Total Keseluruhan",
      totalAmountQuantity ? totalAmountQuantity : "-",
      formatCurrency(totalAmount),
    );
    printMessage += "\n\n\n\n\n";
    printMessage += CUT_PAPER;
  
    if (environment == "development") {
      return true;
    }
  
    return sendRawPrintMessage(config, printMessage);
  };

  
export const getPrinterConfigs = async () => {
    const response = await axios.get(
      `${await getBaseUrl()}/api/v1/printer/getAllPrinter`,
      {
        headers: await getMobileAuthHeaders(),
        timeout: 30000,
      },
    );
  
    return response?.data?.data || [];
  };
  