import { Router } from "express";
import Printer from "../models/Printer.model.js";
import {
  testPrintToThermalPrinter,
  printToThermalPrinterCetakBillCustomer,
  printHelperNote,
  printToThermalPrinterCetakKwitansi,
} from "../utils/printerUtil.js";

const router = Router();

const isMobileRequest = (req) => Boolean(req.headers.mobile);

const blockMobileCrud = (res) =>
  res.status(403).json({
    message: "CRUD printer hanya tersedia di web",
  });

const normalizePrinterResponse = (printer) => {
  if (!printer) return null;

  const plain = printer.toObject ? printer.toObject() : printer;
  const portPrinter = plain.portPrinter || plain.port || "9100";

  return {
    ...plain,
    portPrinter,
    port: plain.port || portPrinter,
  };
};

const normalizePrinterPayload = (body) => {
  const name = String(body?.name || "").trim();
  const ipPrinter = String(body?.ipPrinter || "").trim();
  const tipePrinter = String(body?.tipePrinter || "").trim();
  const portPrinter = String(body?.portPrinter || body?.port || "").trim();

  if (!name) {
    const error = new Error("Nama printer wajib diisi");
    error.status = 400;
    throw error;
  }

  if (!ipPrinter) {
    const error = new Error("IP printer wajib diisi");
    error.status = 400;
    throw error;
  }

  if (!tipePrinter) {
    const error = new Error("Tipe printer wajib diisi");
    error.status = 400;
    throw error;
  }

  if (!portPrinter) {
    const error = new Error("Port printer wajib diisi");
    error.status = 400;
    throw error;
  }

  return {
    name,
    ipPrinter,
    tipePrinter: tipePrinter.toUpperCase(),
    portPrinter,
    port: portPrinter,
    isDefault:
      typeof body?.isDefault === "boolean"
        ? body.isDefault
        : String(body?.isDefault).toLowerCase() === "true",
  };
};

const ensureSingleDefaultPrinter = async (printerId) => {
  await Printer.updateMany(
    { _id: { $ne: printerId } },
    { $set: { isDefault: false } },
  );
};

//test config
router.post("/printTest", async (req, res) => {
  const { printerIp, printerPort, printerModel } = req.body;
  console.log({ printerIp, printerPort, printerModel });
  if (!printerIp) {
    return res.status(400).json({ message: "Printer IP tidak diberikan" });
  }
  if (!printerPort) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }
  if (!printerModel) {
    return res
      .status(400)
      .json({ message: "items untuk dicetak tidak diberikan" });
  }

  try {
    const result = await testPrintToThermalPrinter({
      ip: printerIp,
      port: printerPort,
      printerModel: printerModel?.toUpperCase(),
    });
    if (result) {
      return res.json({ message: "Test Berhasil" });
    } else {
      return res
        .status(400)
        .json({ message: "Gagal mencetak", error: "printer tidak terhubung" });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "Gagal mencetak", error: error?.message });
  }
});

router.get("/getAllPrinter", async (_, res) => {
  try {
    const printers = await Printer.find()
      .sort({ isDefault: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      data: printers.map((printer) => normalizePrinterResponse(printer)),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil daftar printer",
      error: error?.message,
    });
  }
});

router.get("/getDefaultPrinter", async (_, res) => {
  try {
    const printer =
      (await Printer.findOne({ isDefault: true }).lean()) ||
      (await Printer.findOne().sort({ updatedAt: -1, createdAt: -1 }).lean());

    return res.json({
      data: normalizePrinterResponse(printer),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil default printer",
      error: error?.message,
    });
  }
});

router.post("/createPrinter", async (req, res) => {
  if (isMobileRequest(req)) {
    return blockMobileCrud(res);
  }

  try {
    const payload = normalizePrinterPayload(req.body);
    const printerCount = await Printer.countDocuments();
    const printer = await Printer.create({
      ...payload,
      isDefault: payload.isDefault || printerCount === 0,
    });

    if (printer.isDefault) {
      await ensureSingleDefaultPrinter(printer._id);
    }

    const savedPrinter = printer.isDefault
      ? await Printer.findById(printer._id).lean()
      : printer;

    return res.status(201).json({
      message: "Printer berhasil ditambahkan",
      data: normalizePrinterResponse(savedPrinter),
    });
  } catch (error) {
    return res.status(error?.status || 500).json({
      message: error?.message || "Gagal menambahkan printer",
    });
  }
});

router.put("/updatePrinter/:id", async (req, res) => {
  if (isMobileRequest(req)) {
    return blockMobileCrud(res);
  }

  try {
    const payload = normalizePrinterPayload(req.body);
    const printer = await Printer.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({ message: "Printer tidak ditemukan" });
    }

    printer.name = payload.name;
    printer.ipPrinter = payload.ipPrinter;
    printer.tipePrinter = payload.tipePrinter;
    printer.portPrinter = payload.portPrinter;
    printer.port = payload.port;
    printer.isDefault = payload.isDefault;
    await printer.save();

    if (printer.isDefault) {
      await ensureSingleDefaultPrinter(printer._id);
    }

    const updatedPrinter = await Printer.findById(printer._id).lean();

    return res.json({
      message: "Printer berhasil diperbarui",
      data: normalizePrinterResponse(updatedPrinter),
    });
  } catch (error) {
    return res.status(error?.status || 500).json({
      message: error?.message || "Gagal memperbarui printer",
    });
  }
});

router.patch("/setDefaultPrinter/:id", async (req, res) => {
  if (isMobileRequest(req)) {
    return blockMobileCrud(res);
  }

  try {
    const printer = await Printer.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({ message: "Printer tidak ditemukan" });
    }

    await ensureSingleDefaultPrinter(printer._id);
    printer.isDefault = true;
    await printer.save();

    return res.json({
      message: "Default printer berhasil diubah",
      data: normalizePrinterResponse(await Printer.findById(printer._id).lean()),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Gagal mengubah default printer",
    });
  }
});

router.delete("/deletePrinter/:id", async (req, res) => {
  if (isMobileRequest(req)) {
    return blockMobileCrud(res);
  }

  try {
    const printer = await Printer.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({ message: "Printer tidak ditemukan" });
    }

    const wasDefault = printer.isDefault;
    await Printer.deleteOne({ _id: printer._id });

    if (wasDefault) {
      const nextDefault = await Printer.findOne().sort({
        updatedAt: -1,
        createdAt: -1,
      });

      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    return res.json({
      message: "Printer berhasil dihapus",
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Gagal menghapus printer",
    });
  }
});

//untuk customer sebelum bayar
router.post("/printCetakBillCustomer", async (req, res) => {
  const { config, bill, time } = req.body;

  if (!config?.ipPrinter) {
    return res.status(400).json({ message: "Printer IP tidak diberikan" });
  }
  if (!config?.portPrinter) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }
  if (!config?.tipePrinter) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }

  if (!bill) {
    return res
      .status(400)
      .json({ message: "bill untuk dicetak tidak diberikan" });
  }

  //cek bill
  if (!bill?.currentBill) {
    return res.status(400).json({ message: "Tidak ada current bill" });
  }

  try {
    const isSuccess = await printToThermalPrinterCetakBillCustomer({
      ip: config?.ipPrinter,
      port: config?.portPrinter,
      printerModel: config?.tipePrinter,
      diskons: bill?.diskons,
      promos: bill?.promos,
      futureVouchers: bill?.futureVouchers,
      subtotal: bill?.subTotal,
      total: bill?.total,
      currentBill: bill?.currentBill,
      id: bill?.id,
      customerName: bill?.customerName,
      spg: bill?.spg,
      salesPerson: bill?.salesPerson,
      paymentMethod: bill?.paymentMethod,
      customerName: bill?.customerName,
      customerEmail: bill?.customerEmail,
      time,
      kodeInvoice: bill?.kodeInvoice,
    });

    if (isSuccess) {
      return res.json({ message: "Berhasil mencetak bill customer" });
    } else {
      return res.status(400).json({ message: "printer tidak terhubug" });
    }
  } catch (error) {
    return res.status(400).json({ message: "Gagal mencetak bill customer" });
  }
});

//untuk customer setelah bayar (pilihan mesin),
//paymentMachine melitputi :
//EDC BCA, Transfer, Qris, LinkAja, Dana, Ovo,Grabfood, ShopeeFood
//note: jangan ubah apa apa database, hanya pakai sinkronisasi
router.post("/printCetakKuitansi", async (req, res) => {
  const { config, bill, time } = req.body;

  if (!config?.ipPrinter) {
    return res.status(400).json({ message: "Printer IP tidak diberikan" });
  }
  if (!config?.portPrinter) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }
  if (!config?.tipePrinter) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }

  if (!bill) {
    return res
      .status(400)
      .json({ message: "bill untuk dicetak tidak diberikan" });
  }

  //cek bill
  if (!bill?.currentBill) {
    return res.status(400).json({ message: "Tidak ada current bill" });
  }

  try {
    const isSuccess = await printToThermalPrinterCetakKwitansi({
      ip: config?.ipPrinter,
      port: config?.portPrinter,
      printerModel: config?.tipePrinter,
      diskons: bill?.diskons,
      promos: bill?.promos,
      futureVouchers: bill?.futureVouchers,
      subtotal: bill?.subTotal,
      total: bill?.total,
      currentBill: bill?.currentBill,
      id: bill?.id,
      customerName: bill?.customerName,
      spg: bill?.spg,
      salesPerson: bill?.salesPerson,
      paymentMethod: bill?.paymentMethod,
      customerName: bill?.customerName,
      customerEmail: bill?.customerEmail,
      time,
      kodeInvoice: bill?.kodeInvoice,
    });

    if (isSuccess) {
      return res.json({ message: "Berhasil mencetak bill customer" });
    } else {
      return res.status(400).json({ message: "printer tidak terhubug" });
    }
  } catch (error) {
    return res.status(400).json({ message: "Gagal mencetak bill customer" });
  }
});

//untuk helper
router.post("/printSimpanBill", async (req, res) => {
  const { printerIp, printerPort, printerModel, items, catatans, time } =
    req.body;
  if (!printerIp) {
    return res.status(400).json({ message: "Printer IP tidak diberikan" });
  }
  if (!printerPort) {
    return res.status(400).json({ message: "Printer port tidak diberikan" });
  }
  if (!printerModel) {
    return res.status(400).json({ message: "Printer model tidak diberikan" });
  }
  if (!items) {
    return res
      .status(400)
      .json({ message: "items untuk dicetak tidak diberikan" });
  }

  try {
    const isSuccess = await printHelperNote({
      ip: printerIp,
      port: printerPort,
      items: items,
      printerModel,
      catatans,
      time,
    });
    if (isSuccess) {
      return res.json({ message: "Berhasil mencetak" });
    } else {
      return res.status(400).json({ message: "Printer tidak terhubung" });
    }
  } catch (error) {
    console.log("gagal mencetak", error);
    return res.status(400).json({ message: "Gagal mencetak", error: error });
  }
});

export default router;
