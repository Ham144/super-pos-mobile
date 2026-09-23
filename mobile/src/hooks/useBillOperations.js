import { useEffect, useRef, useState } from "react";
import { Platform, ToastAndroid, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  printCetakBillCustomer,
  printCetakKwitansi,
  printCetakHelper,
  createMidtransPayment,
  getMidtransPaymentStatus,
  cetakBillStateless,
  bayarStateless,
  getOuletByUserId,
} from "../api";
import excactTimeString from "../utils/excactTimeString";
import { useLoading, useOutlet, useSyncSetting, useCurrentBill, useLiveStockRevision } from "../store";
import { useOnlineSync } from "./useOnlineSync";
import { MODE_OUTLET, resolveBillCustomer } from "../constant";
import {
  billBelongsToOutlet,
  getOutletDefaultCustomer,
} from "../utils/reconcileOutletSession";

/** Pastikan customer bill pakai defaultSellToCustName outlet (seed/CRUD), bukan kosong. */
const resolveCustomerWithOutletDefault = async ({
  name,
  phone,
  alamat,
}) => {
  let defaults = await getOutletDefaultCustomer();

  // Cache outlet lokal sering belum punya field baru — refresh dari server
  if (!defaults.name) {
    try {
      const userRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userRaw ? JSON.parse(userRaw) : null;
      if (userInfo?._id) {
        const res = await getOuletByUserId(userInfo._id);
        const fresh = res?.data;
        if (fresh) {
          await useOutlet.getState().setOutlet(fresh);
          defaults = {
            name: fresh.defaultSellToCustName || "",
            no: fresh.defaultSellToCustNo || "",
            outlet: fresh,
          };
        }
      }
    } catch (e) {
      console.warn("Gagal refresh outlet untuk default customer:", e?.message);
    }
  }

  return resolveBillCustomer(
    { name, phone, alamat },
    { defaultName: defaults.name },
  );
};

/** Jika cart masih pakai _id/kodeInvoice outlet lama, buat ulang identitas sesuai outlet aktif. */
const rekeyBillIdentityIfNeeded = async (outlet) => {
  const kodeOutlet = outlet?.kodeOutlet;
  const state = useCurrentBill.getState();
  if (!kodeOutlet || !state._id) {
    return { _id: state._id, kodeInvoice: state.kodeInvoice };
  }
  if (
    billBelongsToOutlet(
      { _id: state._id, kodeInvoice: state.kodeInvoice },
      kodeOutlet,
    )
  ) {
    return { _id: state._id, kodeInvoice: state.kodeInvoice };
  }

  let kodeKasir = "";
  let salesPerson = state.salesPerson || "";
  try {
    const userRaw = await AsyncStorage.getItem("userInfo");
    const userInfo = userRaw ? JSON.parse(userRaw) : null;
    kodeKasir = userInfo?.kodeKasir || "";
    salesPerson = salesPerson || userInfo?.username || "";
  } catch {
    /* ignore */
  }

  if (!kodeKasir || !salesPerson) {
    return { _id: state._id, kodeInvoice: state.kodeInvoice };
  }

  const now = new Date();
  const timestamp =
    String(now.getFullYear()).slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const nextId = `${kodeOutlet}-${salesPerson}-${timestamp}`;
  const nextKodeInvoice = `${kodeOutlet}${kodeKasir}${timestamp}`;

  useCurrentBill.setState({
    _id: nextId,
    kodeInvoice: nextKodeInvoice,
    salesPerson,
  });

  ToastAndroid?.show(
    "Bill disesuaikan ke outlet aktif",
    ToastAndroid.SHORT,
  );

  return { _id: nextId, kodeInvoice: nextKodeInvoice };
};

export const useBillOperations = ({
  _id,
  currentBill,
  cebelumDiskon,
  setelahDiskon,
  diskon,
  promo,
  futureVoucher,
  salesPerson,
  spg,
  customerEmail,
  customerName,
  customerPhone,
  customerAddress,
  paymentMethod,
  isPrintedCustomerBilling,
  isPrintedKwitansi,
  done,
  setDone,
  setIsPrintedCustomerBilling,
  setIsPrintedKwitansi,
  clearSale,
  isOnline,
  setCustomerDialogPurpose,
  setTitleForCustomerFormModal,
  enumCustomerDialog,
  setIsShowPaymentMethodModal,
  kodeInvoice,
  tanggalBayar,
  nomorTransaksi,
  setNomorTransaksi,
  implementedVoucher,
}) => {
  const [isShowNomorTransaksiModal, setIsShowNomorTransaksiModal] =
    useState(false);
  const [lastPrintTimestamp, setLastPrintTimestamp] = useState(0);
  const [isShowVoucherRedeemModal, setIsShowVoucherRedeemModal] =
    useState(false);

  // midtrants:
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const midtransFlowHandledRef = useRef(false);
  const midtransPollTimerRef = useRef(null);

  const { setLoadingPrinting } = useLoading();
  const { outlet } = useOutlet();

  //continue flow
  const [handleCetakBillContinueFlow, setHandleCetakBillContinueFlow] =
    useState(false);

  //hooks
  //properti ngatur langsung sync atau tidak setelah bayar
  const { handleSinkronisasi } = useOnlineSync();
  const { autoSyncSetelahKwitansiPertama } = useSyncSetting();

  const isMidtransPaymentMethod = async () => {
    const paymentMethodsRaw = await AsyncStorage.getItem("paymentMethod");
    const paymentMethods = paymentMethodsRaw
      ? JSON.parse(paymentMethodsRaw)
      : [];
    return paymentMethods.some(
      (method) =>
        method.method === paymentMethod &&
        method.status === true &&
        method.gatewayProvider === "midtrans",
    );
  };

  const resetMidtransPaymentState = () => {
    midtransFlowHandledRef.current = false;
    if (midtransPollTimerRef.current) {
      clearInterval(midtransPollTimerRef.current);
      midtransPollTimerRef.current = null;
    }
    setPaymentUrl(null);
    setShowPaymentModal(false);
  };

  const getMidtransPaymentReference = (status, fallbackUrl) => {
    const candidates = [
      status?.paymentReference,
      status?.transaction_id,
      status?.transactionId,
      status?.order_id,
      status?.orderId,
      status?.reference,
      status?.referenceId,
    ];

    if (fallbackUrl) {
      try {
        const parsedUrl = new URL(fallbackUrl);
        candidates.push(parsedUrl.searchParams.get("order_id"));
        candidates.push(parsedUrl.searchParams.get("transaction_id"));
        candidates.push(parsedUrl.searchParams.get("payment_reference"));
      } catch (error) {
        // Ignore invalid URLs from the WebView.
      }
    }

    return (
      candidates.find(
        (value) => typeof value === "string" && value.trim().length > 0,
      ) || null
    );
  };

  const isMidtransSuccessUrl = (url) => {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      const transactionStatus = (
        parsedUrl.searchParams.get("transaction_status") || ""
      ).toLowerCase();
      const statusCode = parsedUrl.searchParams.get("status_code");
      const pathName = (parsedUrl.pathname || "").toLowerCase();

      return (
        ["settlement", "capture"].includes(transactionStatus) ||
        statusCode === "200" ||
        pathName.includes("finish")
      );
    } catch (error) {
      return false;
    }
  };

  const isMidtransFailureUrl = (url) => {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      const transactionStatus = (
        parsedUrl.searchParams.get("transaction_status") || ""
      ).toLowerCase();
      const statusCode = parsedUrl.searchParams.get("status_code");

      return (
        ["deny", "cancel", "expire", "failure"].includes(transactionStatus) ||
        statusCode === "407"
      );
    } catch (error) {
      return false;
    }
  };

  const isMidtransSettledStatus = (status) => {
    const transactionStatus = String(
      status?.transaction_status || "",
    ).toLowerCase();
    const gatewayStatus = String(status?.status || "").toLowerCase();

    return (
      status?.paid === true ||
      ["settlement", "capture"].includes(transactionStatus) ||
      ["paid", "settlement", "capture"].includes(gatewayStatus)
    );
  };

  const isMidtransFailedStatus = (status) => {
    const transactionStatus = String(
      status?.transaction_status || "",
    ).toLowerCase();
    const gatewayStatus = String(status?.status || "").toLowerCase();

    return (
      status?.status === "failed" ||
      ["deny", "cancel", "expire", "failure"].includes(transactionStatus) ||
      ["failed", "deny", "cancel", "expire", "failure"].includes(gatewayStatus)
    );
  };

  /** Tandai lunas di zustand + AsyncStorage — tidak menunggu sukses cetak kwitansi. */
  const markBillAsPaidLocally = async ({
    paymentReference,
    paidAt,
  } = {}) => {
    const ref =
      paymentReference || nomorTransaksi || _id;
    const bayarAt = paidAt || new Date().toISOString();

    setDone(true);
    if (typeof setNomorTransaksi === "function") {
      setNomorTransaksi(ref);
    }

    await handleSimpanBillOffline({
      isPrintedCustomerBilling: true,
      isPrintedKwitansi: Boolean(isPrintedKwitansi),
      done: true,
      tanggalBayar: bayarAt,
      nomorTransaksi: ref,
    });

    return { ref, bayarAt };
  };

  const completeMidtransPayment = async ({ settlement, sourceUrl } = {}) => {
    if (midtransFlowHandledRef.current) return;

    midtransFlowHandledRef.current = true;
    if (midtransPollTimerRef.current) {
      clearInterval(midtransPollTimerRef.current);
      midtransPollTimerRef.current = null;
    }

    const paymentReference =
      getMidtransPaymentReference(settlement, sourceUrl) ||
      settlement?.orderId ||
      settlement?.transactionId ||
      _id;

    const paidAt =
      settlement?.settlementTime ||
      settlement?.transactionTime ||
      new Date().toISOString();

    setShowPaymentModal(false);
    setPaymentUrl(null);

    try {
      // Backend sudah done=true via webhook/status — sync lokal dulu
      // supaya pencil mati & Cetak Helper aktif meski printer gagal.
      await markBillAsPaidLocally({ paymentReference, paidAt });

      ToastAndroid?.show("Pembayaran berhasil — bill lunas", ToastAndroid.SHORT);

      // Cetak kwitansi (opsional untuk UX); gagal print tidak undo lunas
      try {
        await handleCetaKuitansi_offlineBayar({ paymentReference });
      } catch (printError) {
        console.warn(
          "Kwitansi gagal dicetak setelah Midtrans lunas:",
          printError?.message || printError,
        );
        ToastAndroid?.show(
          "Bill sudah lunas. Cetak ulang kwitansi jika printer siap.",
          ToastAndroid.LONG,
        );
      }
    } catch (error) {
      Alert.alert(
        "Pembayaran Midtrans",
        error?.message || "Gagal menandai bill lunas di perangkat",
      );
    } finally {
      midtransFlowHandledRef.current = false;
    }
  };

  const handleMidtransPaymentClose = () => {
    midtransFlowHandledRef.current = true;
    resetMidtransPaymentState();
  };

  const handleMidtransNavigationStateChange = async (navState) => {
    const url = navState?.url;
    if (!url || midtransFlowHandledRef.current) return;

    if (isMidtransFailureUrl(url)) {
      midtransFlowHandledRef.current = true;
      resetMidtransPaymentState();
      Alert.alert(
        "Pembayaran dibatalkan",
        "Midtrans membatalkan, menolak, atau melepaskan pembayaran ini.",
      );
      return;
    }

    if (!isMidtransSuccessUrl(url)) {
      return;
    }

    try {
      const settlement = await getMidtransPaymentStatus(_id);
      if (isMidtransSettledStatus(settlement)) {
        await completeMidtransPayment({ settlement, sourceUrl: url });
        return;
      }

      if (isMidtransFailedStatus(settlement)) {
        throw new Error(
          "Pembayaran Midtrans gagal, dibatalkan, atau kedaluwarsa",
        );
      }
    } catch (error) {
      Alert.alert(
        "Pembayaran Midtrans",
        error?.message || "Gagal memproses status pembayaran Midtrans",
      );
    }
  };

  useEffect(() => {
    if (!showPaymentModal || !paymentUrl) {
      if (midtransPollTimerRef.current) {
        clearInterval(midtransPollTimerRef.current);
        midtransPollTimerRef.current = null;
      }
      return undefined;
    }

    let isActive = true;
    midtransFlowHandledRef.current = false;

    const pollStatus = async () => {
      if (!isActive || midtransFlowHandledRef.current) return;

      try {
        const status = await getMidtransPaymentStatus(_id);
        if (!isActive || midtransFlowHandledRef.current) return;

        if (isMidtransSettledStatus(status)) {
          await completeMidtransPayment({
            settlement: status,
            sourceUrl: paymentUrl,
          });
          return;
        }

        if (isMidtransFailedStatus(status)) {
          midtransFlowHandledRef.current = true;
          resetMidtransPaymentState();
          Alert.alert(
            "Pembayaran Midtrans",
            "Pembayaran Midtrans gagal, dibatalkan, atau kedaluwarsa.",
          );
        }
      } catch (error) {
        if (isActive) {
          console.log(
            "Gagal memeriksa status Midtrans:",
            error?.message || error,
          );
        }
      }
    };

    pollStatus();
    midtransPollTimerRef.current = setInterval(pollStatus, 2500);

    return () => {
      isActive = false;
      if (midtransPollTimerRef.current) {
        clearInterval(midtransPollTimerRef.current);
        midtransPollTimerRef.current = null;
      }
    };
  }, [showPaymentModal, paymentUrl, _id]);

  const startMidtransPayment = async () => {
    setLoadingPrinting(true);
    try {
      midtransFlowHandledRef.current = false;
      if (midtransPollTimerRef.current) {
        clearInterval(midtransPollTimerRef.current);
        midtransPollTimerRef.current = null;
      }

      // Snapshot bill lokal — Midtrans butuh row Invoice di Mongo (webhook/status).
      // Offline: sync dump boleh gagal/terlewat; kirim snapshot supaya BE bisa upsert.
      // Stateless: jangan sync dump; invoice biasanya sudah dari cetak-bill, snapshot tetap safety net.
      const billSnapshot = {
        _id,
        kodeInvoice,
        currentBill,
        diskon,
        promo,
        futureVoucher,
        implementedVoucher,
        subTotal: cebelumDiskon,
        total: setelahDiskon,
        salesPerson,
        spg,
        customer: await resolveCustomerWithOutletDefault({
          name: customerName,
          phone: customerPhone,
          alamat: customerAddress,
        }),
        paymentMethod,
        isPrintedCustomerBilling: true,
        isPrintedKwitansi: Boolean(isPrintedKwitansi),
        done: Boolean(done),
      };

      if (outlet?.mode !== MODE_OUTLET.stateless) {
        const syncResult = await handleSinkronisasi();
        if (!syncResult) {
          console.warn(
            "Sync dump gagal/dilewati — lanjut Midtrans dengan upsert snapshot bill",
          );
        }
      }

      const transaction = await createMidtransPayment(
        _id,
        billSnapshot,
        outlet?._id || null,
      );
      if (!transaction?.redirectUrl)
        throw new Error("URL pembayaran Midtrans tidak tersedia");

      setPaymentUrl(transaction.redirectUrl);
      setShowPaymentModal(true);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Gagal memulai pembayaran";

      // BE sudah menandai lunas (webhook) tapi lokal belum — sync state, jangan stuck
      if (/bill telah selesai/i.test(message)) {
        await markBillAsPaidLocally({
          paymentReference: nomorTransaksi || _id,
        });
        ToastAndroid?.show(
          "Bill sudah lunas di server — status lokal diperbarui",
          ToastAndroid.LONG,
        );
        return;
      }

      Alert.alert("Error", message);
    } finally {
      setLoadingPrinting(false);
    }
  };

  // Fungsi untuk memeriksa bill yang tersimpan
  const checkSavedBills = async () => {
    try {
      const billsStr = await AsyncStorage.getItem("bills");

      const bills = billsStr ? JSON.parse(billsStr) : [];
      console.log("Jumlah bill tersimpan:", bills.length);

      if (bills.length > 0) {
        bills.forEach((bill, index) => {
          console.log(`Bill #${index + 1}:`, {
            id: bill._id,
            total: bill.total,
            items: bill.currentBill?.length || 0,
          });
        });
      } else {
        console.log("Tidak ada bill tersimpan");
      }

      return bills;
    } catch (error) {
      console.error("Error memeriksa bills:", error);
      return [];
    }
  };

  // Fungsi untuk menyimpan bill ke AsyncStorage
  const handleSimpanBillOffline = async ({
    isPrintedCustomerBilling,
    isPrintedKwitansi,
    done,
    tanggalBayar,
    nomorTransaksi: nomorTransaksiOverride,
  }) => {
    try {
      // Ambil bills yang sudah ada
      let bills = [];
      try {
        const billsStr = await AsyncStorage.getItem("bills");
        bills = billsStr ? JSON.parse(billsStr) : [];
      } catch (error) {
        console.error("Error membaca bills:", error);
        bills = [];
      }

      // Buat catatan untuk item jika ada promo
      const catatans = currentBill
        ? currentBill
            .map((item) => {
              const itemPromo = promo?.find((p) => p.sku === item.sku);
              return {
                sku: item.sku,
                catatan: itemPromo
                  ? `${item.catatan ? item.catatan + " | " : ""} Bonus: ${
                      itemPromo.promoInfo.skuBarangBonus
                    } (${itemPromo.promoInfo.quantityBonus}x)`.trim()
                  : item.catatan || "",
              };
            })
            .filter((catatan) => catatan.catatan)
        : [];

      // Siapkan data bill yang akan disimpan — baca _id/kodeInvoice terbaru (bisa di-rekey ke outlet aktif)
      const liveBill = useCurrentBill.getState();
      const billId = liveBill._id || _id;
      const billKode = liveBill.kodeInvoice || kodeInvoice;

      const billDetail = {
        _id: billId,
        kodeInvoice: billKode,
        currentBill,
        isPrintedCustomerBilling: isPrintedCustomerBilling,
        isPrintedKwitansi: isPrintedKwitansi,
        salesPerson: liveBill.salesPerson || salesPerson,
        spg: spg,
        diskon,
        promo,
        futureVoucher,
        customer: await resolveCustomerWithOutletDefault({
          name: customerName,
          phone: customerPhone,
          alamat: customerAddress,
        }),
        ...(futureVoucher?.length > 0 && customerEmail
          ? { futureVoucher }
          : {}),
        paymentMethod,
        subTotal: cebelumDiskon,
        total: setelahDiskon,
        sync: false,
        isChanged: true,
        done: done,
        catatans,
        createdAt: new Date().toISOString(),
        tanggalBayar: tanggalBayar || new Date().toISOString(),
        nomorTransaksi: nomorTransaksiOverride || nomorTransaksi,
        implementedVoucher: implementedVoucher,
      };

      // Cek apakah bill dengan ID ini sudah ada
      const billIndex = bills.findIndex((bill) => bill._id === billId);

      if (billIndex === -1) {
        // Bill belum ada, tambahkan baru
        bills.push(billDetail);
      } else {
        // Bill sudah ada, update
        bills[billIndex] = billDetail;
      }

      // Simpan ke AsyncStorage
      const billsToSave = JSON.stringify(bills);
      await AsyncStorage.setItem("bills", billsToSave);

      ToastAndroid?.show("Bill Berhasil disimpan", ToastAndroid.SHORT);
      return true;
    } catch (error) {
      console.error("Error menyimpan bill:", error);
      ToastAndroid?.show(
        "Gagal menyimpan bill: " + error.message,
        ToastAndroid.SHORT,
      );
      return false;
    } finally {
      setLoadingPrinting(false);
    }
  };

  //cetak bill customer
  const handleCetakBill = async ({ fromResume = false }) => {
    // Prevent multiple calls within 2 seconds
    const now = Date.now();
    if (now - lastPrintTimestamp < 2000) {
      return;
    }

    setLastPrintTimestamp(now);
    setLoadingPrinting(true); // Set loading at the start
    if (!paymentMethod || !spg?.name) {
      console.log(
        "paymentMethod atau spg tidak lengkap",
        `${paymentMethod} -- ${spg?.name}`,
      );
      setIsShowPaymentMethodModal(true);
      setHandleCetakBillContinueFlow(true); //buat ingatin lanjutkan flow
      setLoadingPrinting(false); // Reset loading before return
      return;
    }

    try {
      if (futureVoucher?.length > 0) {
        if (!customerEmail && !fromResume) {
          setCustomerDialogPurpose(enumCustomerDialog.VOUCHER);
          setTitleForCustomerFormModal(
            "Customer Mendapatkan Voucher, Email perlu Diisi Untuk Menyimpan Voucher  (boleh batal untuk menghapus voucher)",
          );
          setHandleCetakBillContinueFlow(true); //buat ingatin lanjutkan flow
          setLoadingPrinting(false); // Reset loading before return
          return;
        }
      }

      if (!currentBill?.length || cebelumDiskon === 0) {
        Platform.OS === "android"
          ? Alert.alert(
              "Terdeteksi tidak ada bill",
              "Mungkin Item kosong atau total bernilai 0",
            )
          : alert(
              "Terdeteksi tidak ada bill, Mungkin Item kosong atau total bernilai 0",
            );
        setLoadingPrinting(false); // Reset loading before return
        return;
      }

      // Simpan bill terlebih dahulu — pastikan _id sesuai outlet aktif (bukan sisa AsyncStorage lama)
      const { _id: billId, kodeInvoice: billKodeInvoice } =
        await rekeyBillIdentityIfNeeded(outlet);

      const saveResult = await handleSimpanBillOffline({
        isPrintedCustomerBilling: isPrintedCustomerBilling,
        done: done,
        isPrintedKwitansi: isPrintedKwitansi,
        tanggalBayar: tanggalBayar,
      });

      // Jika gagal menyimpan, tampilkan pesan dan keluar
      if (!saveResult) {
        ToastAndroid?.show(
          "Gagal menyimpan bill, tidak dapat melanjutkan",
          ToastAndroid.SHORT,
        );
        setLoadingPrinting(false); // Reset loading before return
        return;
      }

      const customer = await resolveCustomerWithOutletDefault({
        name: customerName,
        phone: customerPhone,
        alamat: customerAddress,
      });
      if (!salesPerson) {
        alert("Sales person tidak boleh kosong");
        return;
      }
      const bill = {
        _id: billId,
        total: setelahDiskon,
        subTotal: cebelumDiskon,
        currentBill,
        diskons: diskon,
        promos: promo,
        futureVouchers: futureVoucher,
        salesPerson,
        spg,
        customer,
        paymentMethod,
        kodeInvoice: billKodeInvoice,
        tanggalBayar: tanggalBayar,
      };

      //validasi data bill
      if (
        bill?.subTotal == 0 ||
        !bill?.currentBill?.length ||
        !bill?.salesPerson ||
        !bill?.spg ||
        !bill?.paymentMethod
      ) {
        ToastAndroid?.show(
          "Validasi data bill untuk di cetak gagal, tidak lengkap",
          ToastAndroid.LONG,
        );
        console.log("console karena data tidak lengkap :", bill);
        setLoadingPrinting(false);
        return;
      }

      // --- outlet.mode === "stateless": NAV ship (or pending discount) ---
      // offline mode keeps the existing local-only path below.
      // Sudah ter-ship & belum di-undo → cukup cetak ulang; ship lagi = SO dobel & stok NAV terpotong dua kali
      const alreadyShipped = Boolean(
        useCurrentBill.getState().isPrintedCustomerBilling,
      );
      if (outlet?.mode === "stateless" && !alreadyShipped) {
        if (!isOnline) {
          Alert.alert(
            "Offline",
            "Outlet mode stateless membutuhkan koneksi untuk cetak bill (NAV).",
          );
          setLoadingPrinting(false);
          return;
        }

        try {
          const navResult = await cetakBillStateless(
            {
              _id: billId,
              kodeInvoice: billKodeInvoice,
              currentBill,
              diskon,
              promo,
              futureVoucher,
              implementedVoucher,
              subTotal: cebelumDiskon,
              total: setelahDiskon,
              salesPerson,
              spg,
              customer,
              paymentMethod,
              nomorTransaksi,
              tanggalBayar,
              createdAt: new Date().toISOString(),
            },
            outlet?._id || null,
          );

          if (navResult?.action === "pending_discount_approval") {
            await handleSimpanBillOffline({
              isPrintedCustomerBilling: false,
              done: false,
              isPrintedKwitansi: false,
              tanggalBayar: tanggalBayar,
            });
            // persist approval flag on local bill copy
            try {
              const billsStr = await AsyncStorage.getItem("bills");
              const bills = billsStr ? JSON.parse(billsStr) : [];
              const idx = bills.findIndex((b) => b._id === _id);
              if (idx !== -1) {
                bills[idx] = {
                  ...bills[idx],
                  discountApprovalStatus: "pending",
                  sync: true,
                };
                await AsyncStorage.setItem("bills", JSON.stringify(bills));
              }
            } catch (_) {
              /* ignore local flag errors */
            }

            Alert.alert(
              "Menunggu Approve Discount",
              navResult.message ||
                "Harga retail di bawah harga web. Bill disimpan tanpa hit SOAP sampai disetujui.",
            );
            setLoadingPrinting(false);
            return;
          }

          // Ship OK → stok NAV berubah; Libraries harus refetch (no cache)
          useLiveStockRevision.getState().bumpLiveStock();
        } catch (error) {
          const msg =
            error?.response?.data?.message ||
            error?.message ||
            "Gagal SalesOrderAutoPostingShip";
          Alert.alert("Gagal Cetak Bill (NAV)", msg);
          console.log("error:", error);
          setLoadingPrinting(false);
          return;
        }
      }

      if (isOnline) {
        const multiConfig = JSON.parse(
          await AsyncStorage.getItem("printerConfigs"),
        );
        const config = multiConfig?.find((config) => config.isDefault);
        if (
          !config?.tipePrinter ||
          !config?.ipPrinter ||
          !config?.portPrinter
        ) {
          Platform.OS === "android" || Platform.OS === "ios"
            ? Alert.alert("Config printer belum lengkap")
            : alert("Config printer belum lengkap");
          setLoadingPrinting(false); // Reset loading before return
          return;
        }

        try {
          const time = excactTimeString();
          if (!bill?.customer?.name) {
            Alert.alert(
              "Customer diperlukan",
              "Isi customer di bill, atau set Default Customer Name di konfigurasi outlet (SOAP NAV).",
            );
            setLoadingPrinting(false);
            return;
          }
          await printCetakBillCustomer(
            config,
            bill,
            time,
            outlet,
            !isPrintedCustomerBilling,
          );
          // Jika berhasil cetak
          await handleSimpanBillOffline({
            isPrintedCustomerBilling: true,
            done: done,
            isPrintedKwitansi: isPrintedKwitansi,
            tanggalBayar: tanggalBayar,
          });
          setIsPrintedCustomerBilling(true);
          console.log("berhasil printCetakBillCustomer tanpa masalah");
        } catch (error) {
          console.log(error);
          // Tampilkan dialog konfirmasi
          if (Platform.OS === "android" || Platform.OS === "ios") {
            Alert.alert(
              "Gagal Cetak Bill",
              "Terjadi kesalahan mencetak bill, tetap lanjutkan transaksi?",
              [
                {
                  text: "Batal",
                  style: "cancel",
                },
                {
                  text: "Lanjutkan",
                  onPress: async () => {
                    setIsPrintedCustomerBilling(true);
                    await handleSimpanBillOffline({
                      isPrintedCustomerBilling: true,
                      done: done,
                      isPrintedKwitansi: isPrintedKwitansi,
                    });
                    ToastAndroid?.show(
                      "Transaksi dilanjutkan tanpa cetak bill",
                      ToastAndroid.SHORT,
                    );
                  },
                },
              ],
            );
          } else if (Platform.OS === "web") {
            const shouldContinue = window.confirm(
              "Terjadi kesalahan mencetak bill, tetap lanjutkan transaksi?",
            );
            if (shouldContinue) {
              setIsPrintedCustomerBilling(true);
              await handleSimpanBillOffline({
                isPrintedCustomerBilling: true,
                done: done,
                isPrintedKwitansi: isPrintedKwitansi,
              });
              ToastAndroid?.show(
                "Transaksi dilanjutkan tanpa cetak bill",
                ToastAndroid.SHORT,
              );
            }
          }
        }
      } else {
        // Jika offline
        if (Platform.OS === "android") {
          Alert.alert("Offline", "Tidak bisa cetak bill saat offline", [
            { text: "Tutup" },
            {
              text: "Anggap sudah cetak",
              onPress: async () => {
                setIsPrintedCustomerBilling(true);
                await handleSimpanBillOffline({
                  isPrintedCustomerBilling: true,
                  done: done,
                  isPrintedKwitansi: isPrintedKwitansi,
                });
                ToastAndroid?.show(
                  "Transaksi dilanjutkan tanpa cetak bill",
                  ToastAndroid.SHORT,
                );
              },
            },
          ]);
        } else if (Platform.OS === "web") {
          const anggapSudahCetak = window.confirm(
            "Offline. Tidak bisa cetak bill saat offline. Anggap sudah cetak?",
          );
          if (anggapSudahCetak) {
            setIsPrintedCustomerBilling(true);
            await handleSimpanBillOffline({
              isPrintedCustomerBilling: true,
              done: done,
              isPrintedKwitansi: isPrintedKwitansi,
            });
            ToastAndroid?.show(
              "Transaksi dilanjutkan tanpa cetak bill",
              ToastAndroid.SHORT,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error umum:", error);

      // Tampilkan dialog konfirmasi untuk melanjutkan transaksi meskipun gagal cetak
      if (Platform.OS === "android" || Platform.OS === "ios") {
        Alert.alert(
          "Terjadi kesalahan saat mencetak bill",
          "Tetap lanjutkan transaksi?",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Lanjutkan",
              onPress: async () => {
                setIsPrintedCustomerBilling(true);
                await handleSimpanBillOffline({
                  isPrintedCustomerBilling: true,
                  done: done,
                  isPrintedKwitansi: isPrintedCustomerBilling,
                });
                ToastAndroid?.show(
                  "Transaksi dilanjutkan tanpa cetak bill",
                  ToastAndroid.SHORT,
                );
              },
            },
          ],
        );
      } else if (Platform.OS === "web") {
        const shouldContinue = window.confirm(
          "Terjadi kesalahan saat mencetak bill. Tetap lanjutkan transaksi?",
        );
        if (shouldContinue) {
          setIsPrintedCustomerBilling(true);
          await handleSimpanBillOffline({
            isPrintedCustomerBilling: isPrintedCustomerBilling,
            done: done,
            isPrintedKwitansi: isPrintedKwitansi,
          });
          ToastAndroid?.show(
            "Transaksi dilanjutkan tanpa cetak bill",
            ToastAndroid.SHORT,
          );
        }
      }
    } finally {
      setLoadingPrinting(false); // Always reset loading at the end
    }
  };

  //cetak kwitansi, setelah cetak kwitansi maka langsung sync
  const handleCetaKuitansi_offlineBayar = async ({ paymentReference } = {}) => {
    try {
      if (!done && !paymentReference && (await isMidtransPaymentMethod())) {
        await startMidtransPayment();
        return;
      }

      if (isOnline) {
        const multiConfig = JSON.parse(
          await AsyncStorage.getItem("printerConfigs"),
        );
        const config = multiConfig?.find((config) => config.isDefault);
        if (
          !config?.tipePrinter ||
          !config?.ipPrinter ||
          !config?.portPrinter
        ) {
          Platform.OS === "android" || Platform.OS === "ios"
            ? Alert.alert("Config printer belum lengkap")
            : alert("Config printer belum lengkap");
          return;
        }

        const time = excactTimeString(); //untuk waktu cetak

        const bill = {
          _id,
          kodeInvoice,
          total: setelahDiskon,
          subTotal: cebelumDiskon,
          currentBill,
          diskons: diskon,
          promos: promo,
          futureVouchers: futureVoucher,
          salesPerson,
          spg,
          customer: await resolveCustomerWithOutletDefault({
            name: customerName,
            phone: customerPhone,
            alamat: customerAddress,
          }),
          paymentMethod,
          nomorTransaksi: paymentReference || nomorTransaksi,
          tanggalBayar: tanggalBayar,
        };

        //validasi data bill
        if (!bill?.total) {
          ToastAndroid?.show(
            "Total bill tidak ada, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena total tidak ada :", bill);
          return;
        }

        if (!bill?.subTotal) {
          ToastAndroid?.show(
            "total kelihatannya 0, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena subtotal tidak ada :", bill);
          return;
        }

        if (!bill?.currentBill?.length) {
          ToastAndroid?.show(
            "Tidak ada item di bill, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena tidak ada item :", bill);
          return;
        }

        if (!bill?.salesPerson) {
          ToastAndroid?.show(
            "Nama KASIR tidak ada, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena sales person tidak ada :", bill);
          return;
        }

        if (!bill?.spg) {
          ToastAndroid?.show(
            "Nama SPG tidak ada, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena SPG tidak ada :", bill);
          return;
        }

        if (!bill?.paymentMethod) {
          ToastAndroid?.show(
            "Metode pembayaran tidak ada, tidak dapat dicetak",
            ToastAndroid.LONG,
          );
          console.log("console karena metode pembayaran tidak ada :", bill);
          return;
        }

        try {
          // Cetak kwitansi
          setLoadingPrinting(true);

          // Stateless: post invoice to NAV before printing receipt
          if (outlet?.mode === "stateless" && !done) {
            try {
              await bayarStateless({
                invoiceId: _id,
                paymentMethod,
                nomorTransaksi: paymentReference || nomorTransaksi,
                tanggalBayar: tanggalBayar || new Date().toISOString(),
                outletId: outlet?._id || null,
              });
            } catch (navErr) {
              const msg =
                navErr?.response?.data?.message ||
                navErr?.message ||
                "Gagal WsPostInvoiceSO";
              Alert.alert("Gagal Bayar (NAV)", msg);
              setLoadingPrinting(false);
              return;
            }
          }

          for (let i = 0; i < 2; i++) {
            const isFirst = i === 0;
            await printCetakKwitansi(config, bill, time, outlet, isFirst);

            // Tambahkan delay setelah print pertama agar printer siap
            if (i === 0) {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          // Jika sudah done (sudah dibayar), hanya cetak kwitansi saja
          if (done) {
            ToastAndroid?.show(
              "Kwitansi berhasil dicetak ulang",
              ToastAndroid.SHORT,
            );
          } else {
            // Simpan bill dengan status baru - kwitansi berhasil dicetak
            const isTotallySuccessful = await handleSimpanBillOffline({
              isPrintedCustomerBilling: isPrintedCustomerBilling,
              isPrintedKwitansi: true,
              done: true,
              tanggalBayar: tanggalBayar || new Date().toISOString(),
              nomorTransaksi: paymentReference || nomorTransaksi,
            });

            if (isTotallySuccessful) {
              // Offline mode: update local inventaris. Stateless: stock already via NAV ship.
              if (outlet?.mode !== "stateless") {
                const updateResult = await updateInventoryAndStats();
                if (!updateResult) {
                  console.warn(
                    "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                  );
                }
              }

              setDone(true);
              setIsPrintedKwitansi(true);

              ToastAndroid?.show(
                "Kwitansi berhasil dicetak",
                ToastAndroid.SHORT,
              );
              // Offline auto-sync only — never syncMobileRoute for stateless
              if (
                outlet?.mode !== "stateless" &&
                autoSyncSetelahKwitansiPertama
              ) {
                await handleSinkronisasi();
                ToastAndroid?.show("Auto sync berhasil", ToastAndroid.SHORT);
                clearSale();
              }
              setLoadingPrinting(false);
            }
          }
        } catch (error) {
          // Jika sudah done (sudah dibayar), kita tidak perlu melakukan update lagi
          if (done) {
            ToastAndroid?.show(
              "Gagal mencetak ulang kwitansi",
              ToastAndroid.SHORT,
            );
            return;
          }

          // Tampilkan dialog konfirmasi
          if (Platform.OS === "android" || Platform.OS === "ios") {
            Alert.alert(
              "Gagal Cetak Kwitansi",
              "Terjadi kesalahan mencetak kwitansi, tetap lanjutkan transaksi?",
              [
                {
                  text: "Batal",
                  style: "cancel",
                  onPress: () => {},
                },
                {
                  text: "Lanjutkan",
                  onPress: async () => {
                    try {
                      // Update inventaris dan statistik
                      const updateResult = await updateInventoryAndStats();
                      if (!updateResult) {
                        console.warn(
                          "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                        );
                      }

                      // Set status transaksi
                      setDone(true);

                      // Simpan bill dengan status baru - kwitansi belum dicetak
                      await handleSimpanBillOffline({
                        isPrintedCustomerBilling: true,
                        isPrintedKwitansi: false,
                        done: true,
                        tanggalBayar: tanggalBayar || new Date().toISOString(), // Tambahkan tanggalBayar saat pembayaran
                      });

                      ToastAndroid?.show(
                        "Transaksi selesai tanpa cetak kwitansi",
                        ToastAndroid.SHORT,
                      );
                    } catch (err) {
                      console.error("Error saat menyelesaikan transaksi:", err);
                      ToastAndroid?.show(
                        "Gagal menyelesaikan transaksi",
                        ToastAndroid.SHORT,
                      );
                    }
                  },
                },
              ],
            );
          } else if (Platform.OS === "web") {
            const shouldContinue = window.confirm(
              "Terjadi kesalahan mencetak kwitansi, tetap lanjutkan transaksi?",
            );
            if (shouldContinue) {
              try {
                // Update inventaris dan statistik
                const updateResult = await updateInventoryAndStats();
                if (!updateResult) {
                  console.warn(
                    "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                  );
                }

                // Set status transaksi
                setDone(true);

                // Simpan bill dengan status baru - kwitansi belum dicetak
                await handleSimpanBillOffline({
                  isPrintedCustomerBilling,
                  isPrintedKwitansi: false, // Tetap false karena kwitansi gagal dicetak
                  done: true,
                  tanggalBayar: new Date().toISOString(), // Tambahkan tanggalBayar saat pembayaran
                });

                ToastAndroid?.show(
                  "Transaksi selesai tanpa cetak kwitansi",
                  ToastAndroid.SHORT,
                );
              } catch (err) {
                console.error("Error saat menyelesaikan transaksi:", err);
                ToastAndroid?.show(
                  "Gagal menyelesaikan transaksi",
                  ToastAndroid.SHORT,
                );
              }
            } else {
              alert("Transaksi selesai tanpa cetak kwitansi");
            }
          }
        } finally {
          setLoadingPrinting(false);
        }
        // Jika offline
      } else {
        // Jika sudah done (sudah dibayar), tampilkan pesan bahwa tidak bisa cetak
        if (done) {
          Platform.OS === "android" || Platform.OS === "ios"
            ? Alert.alert(
                "Cetak Kwitansi",
                "Tidak dapat mencetak ulang kwitansi saat offline",
              )
            : alert("Tidak dapat mencetak ulang kwitansi saat offline");
          return;
        }

        // Siapkan data kwitansi untuk disimpan
        const kwitansiData = {
          _id,
          kodeInvoice,
          total: setelahDiskon,
          subTotal: cebelumDiskon,
          currentBill,
          diskons: diskon,
          promos: promo,
          futureVouchers: futureVoucher,
          salesPerson,
          spg: spg,
          customer: await resolveCustomerWithOutletDefault({
            name: customerName,
            phone: customerPhone,
            alamat: customerAddress,
          }),
          paymentMethod,
          tanggalDitunda: new Date().toISOString(),
          status: "pending",
        };

        if (Platform.OS === "android") {
          Alert.alert("Offline", "Tidak bisa cetak kwitansi saat offline", [
            {
              text: "Tutup",
              onPress: () => {},
            },
            {
              text: "Simpan untuk dikirim saat online",
              onPress: async () => {
                try {
                  // Ambil kwitansi tertunda yang sudah ada
                  const kwitansiTertundaStr =
                    await AsyncStorage.getItem("kwitansiTertunda");
                  const kwitansiTertunda = kwitansiTertundaStr
                    ? JSON.parse(kwitansiTertundaStr)
                    : [];

                  // Cek apakah kwitansi sudah ada
                  const isKwitansiExists = kwitansiTertunda.some(
                    (item) => item._id === _id,
                  );

                  if (!isKwitansiExists) {
                    // Tambahkan kwitansi baru
                    kwitansiTertunda.push(kwitansiData);
                    await AsyncStorage.setItem(
                      "kwitansiTertunda",
                      JSON.stringify(kwitansiTertunda),
                    );
                  }

                  // Update inventaris dan statistik
                  const updateResult = await updateInventoryAndStats();
                  if (!updateResult) {
                    console.warn(
                      "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                    );
                  }

                  // Set status transaksi
                  setDone(true);

                  // Simpan bill dengan status baru - kwitansi belum dicetak karena offline
                  await handleSimpanBillOffline({
                    isPrintedCustomerBilling,
                    isPrintedKwitansi: false, // Tetap false karena offline
                    done: true,
                  });

                  ToastAndroid?.show(
                    "Kwitansi disimpan untuk dicetak nanti",
                    ToastAndroid.SHORT,
                  );
                } catch (err) {
                  console.error("Error saat menyimpan kwitansi tertunda:", err);
                  ToastAndroid?.show(
                    "Gagal menyimpan kwitansi tertunda",
                    ToastAndroid.SHORT,
                  );
                }
              },
            },
            {
              text: "Anggap sudah cetak",
              onPress: async () => {
                try {
                  // Update inventaris dan statistik
                  const updateResult = await updateInventoryAndStats();
                  if (!updateResult) {
                    console.warn(
                      "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                    );
                  }

                  // Set status transaksi
                  setDone(true);

                  // Simpan bill dengan status baru - kwitansi belum dicetak
                  await handleSimpanBillOffline({
                    isPrintedCustomerBilling,
                    isPrintedKwitansi: false, // Tetap false karena offline
                    done: true,
                  });

                  ToastAndroid?.show("Transaksi selesai", ToastAndroid.SHORT);
                } catch (err) {
                  console.error("Error saat menyelesaikan transaksi:", err);
                  ToastAndroid?.show(
                    "Gagal menyelesaikan transaksi",
                    ToastAndroid.SHORT,
                  );
                }
              },
            },
          ]);
        } else if (Platform.OS === "web") {
          const action = window.confirm(
            "Offline. Tidak bisa cetak kwitansi saat offline. Simpan untuk dicetak nanti?",
          );
          if (action) {
            try {
              // Ambil kwitansi tertunda yang sudah ada
              const kwitansiTertundaStr =
                await AsyncStorage.getItem("kwitansiTertunda");
              const kwitansiTertunda = kwitansiTertundaStr
                ? JSON.parse(kwitansiTertundaStr)
                : [];

              // Cek apakah kwitansi sudah ada
              const isKwitansiExists = kwitansiTertunda.some(
                (item) => item._id === _id,
              );

              if (!isKwitansiExists) {
                // Tambahkan kwitansi baru
                kwitansiTertunda.push(kwitansiData);
                await AsyncStorage.setItem(
                  "kwitansiTertunda",
                  JSON.stringify(kwitansiTertunda),
                );
              }

              // Update inventaris dan statistik
              const updateResult = await updateInventoryAndStats();
              if (!updateResult) {
                ToastAndroid?.show(
                  "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                  ToastAndroid?.SHORT,
                );
              }

              // Set status transaksi
              setDone(true);

              // Simpan bill dengan status baru - kwitansi belum dicetak karena offline
              await handleSimpanBillOffline({
                isPrintedCustomerBilling,
                isPrintedKwitansi: false, // Tetap false karena offline
                done: true,
              });

              ToastAndroid?.show(
                "Kwitansi disimpan untuk dicetak nanti",
                ToastAndroid.SHORT,
              );
            } catch (err) {
              console.error("Error saat menyimpan kwitansi tertunda:", err);
              ToastAndroid?.show(
                "Gagal menyimpan kwitansi tertunda",
                ToastAndroid.SHORT,
              );
            } finally {
              setLoadingPrinting(false);
            }
          } else {
            // Jika user memilih "Anggap sudah cetak"
            try {
              // Update inventaris dan statistik
              const updateResult = await updateInventoryAndStats();
              if (!updateResult) {
                ToastAndroid?.show(
                  "Beberapa data inventaris atau statistik mungkin tidak diperbarui dengan benar",
                  ToastAndroid?.SHORT,
                );
              }

              // Set status transaksi
              setDone(true);

              // Simpan bill dengan status baru - kwitansi belum dicetak
              await handleSimpanBillOffline({
                isPrintedCustomerBilling,
                isPrintedKwitansi: false, // Tetap false karena offline
                done: true,
              });

              ToastAndroid?.show("Transaksi selesai", ToastAndroid.SHORT);
            } catch (err) {
              console.error("Error saat menyelesaikan transaksi:", err);
              ToastAndroid?.show(
                "Gagal menyelesaikan transaksi",
                ToastAndroid.SHORT,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error umum:", error);
      ToastAndroid?.show(
        "Terjadi kesalahan: " + error.message,
        ToastAndroid.SHORT,
      );
    } finally {
      setLoadingPrinting(false);
    }
  };

  // Tambahkan fungsi untuk mengelola inventaris dan statistik
  const updateInventoryAndStats = async () => {
    /**
     * Offline mode only. Stateless: stok live di NAV (ship/post) —
     * app tidak boleh kurangi quantity inventaris lokal.
     *
     * input: cosmos 007 pundi 1x (tested ✅)
     *diskon[diskon].quantityTersedia = 80 (-1) ✅
     *promo[promo].quantityBerlaku = 8 (-1) ✅
     *spg[spg].totalHargaPenjualanFromApp = 237160 (+total) ✅
     *spg[spg].totalQuantityPenjualanFromApp = 2 (+1) ✅
     *spg[spg].skuTerjual.length = [] (+currentBill.length) ✅
     *userInfo.totalQuantityPenjualanFromApp = 2 (+1) ✅
     *userInfo.totalHargaPenjualanFromApp = 237160 (+total) ✅
     *inventories[cosmos10cl252].quantity = 18 (-promo.quantityBonus)(free bonus) ✅
     *inventories[cosmos007pundi].quantity = 16 (-item.quantity) ✅
     *inventories[cosmos007pundi].terjual = 82 (+item.quantity) ✅
     *outlet.pendapatanFromApp = 237160 (+total) ✅
     *outlet.jumlahInvoice = do not change ✅
     */
    if (outlet?.mode === "stateless" || outlet?.mode === MODE_OUTLET.stateless) {
      return true;
    }

    try {
      let updateStatus = {
        inventories: false,
        diskons: false,
        promos: false,
        vouchers: false,
        spgs: false,
        userInfo: false,
        outlet: false,
      };

      // 1. Update inventories (including bonus items)
      try {
        const inventoriesStr = await AsyncStorage.getItem("inventories");
        if (inventoriesStr) {
          let inventories = JSON.parse(inventoriesStr);
          let updated = false;

          // Update untuk items di currentBill
          if (currentBill?.length > 0) {
            currentBill.forEach((item) => {
              const inventoryIndex = inventories.findIndex(
                (inv) => inv.sku === item.sku,
              );
              if (inventoryIndex !== -1) {
                const currentQty =
                  parseInt(inventories[inventoryIndex].quantity) || 0;
                inventories[inventoryIndex].quantity =
                  currentQty - item.quantity;
                const currentTerjual = parseInt(
                  inventories[inventoryIndex].terjualFromApp || 0,
                );
                inventories[inventoryIndex].terjualFromApp =
                  currentTerjual + item.quantity;
                updated = true;
              }
            });
          }

          // Update untuk bonus items dari promo
          if (promo?.length > 0) {
            promo.forEach((p) => {
              const bonusSku = p.skuBarangBonus || p.promoInfo?.skuBarangBonus;
              const bonusQty = parseInt(
                p.quantityBonus || p.promoInfo?.quantityBonus || 1,
              );

              if (bonusSku) {
                const index = inventories.findIndex(
                  (inv) => inv.sku === bonusSku,
                );
                if (index !== -1) {
                  const currentQty = parseInt(inventories[index].quantity) || 0;
                  // Mengurangi quantity sesuai dengan bonusQty yang diatur
                  inventories[index].quantity = currentQty - bonusQty;
                  const currentTerjual = parseInt(
                    inventories[index].terjualFromApp || 0,
                  );
                  // Menambah terjual sesuai dengan bonusQty yang diatur
                  inventories[index].terjualFromApp = currentTerjual + bonusQty;
                  updated = true;
                }
              }
            });
          }

          if (updated) {
            await AsyncStorage.setItem(
              "inventories",
              JSON.stringify(inventories),
            );
            updateStatus.inventories = true;
          }
        }
      } catch (error) {
        throw new Error("Gagal mengurangi inventories offline");
      }

      // 2. Update diskon (decrease quantityTersedia)
      try {
        if (diskon?.length > 0) {
          const diskonsStr = await AsyncStorage.getItem("diskon");
          if (diskonsStr) {
            let diskons = JSON.parse(diskonsStr);
            let updated = false;

            //loop current diskon
            for (const d of diskon) {
              // Improved matching logic with multiple checks for more flexible matching
              const matchingDiskon = diskons.find(
                (diskonStorage) =>
                  // Check by kode diskon if available
                  diskonStorage.judulDiskon === d?.diskonInfo?.judulDiskon,
              );

              if (matchingDiskon) {
                const currentQty =
                  parseInt(matchingDiskon.quantityTersedia) || 0;
                matchingDiskon.quantityTersedia = Math.max(0, currentQty - 1);
                updated = true;
                console.log(
                  "Diskon Berhasil dikurangi",
                  matchingDiskon.judulDiskon || matchingDiskon._id,
                );
              } else {
                throw new Error("tidak ada judul diskon yang cocok");
              }
            }

            if (updated) {
              await AsyncStorage.setItem("diskon", JSON.stringify(diskons));
              updateStatus.diskons = true;
            }
          }
        }
      } catch (error) {
        throw new Error("Gagal mengurangi diskon offline");
      }

      // 3. Update promo (decrease quantityBerlaku)
      try {
        if (promo?.length > 0) {
          const promosStr = await AsyncStorage.getItem("promo");
          if (promosStr) {
            let promos = JSON.parse(promosStr);
            let updated = false;

            for (const p of promo) {
              // Improved matching logic for promos
              const matchingPromo = promos.find(
                (promoStorage) =>
                  promoStorage?.judulPromo === p?.promoInfo?.judulPromo,
              );

              if (matchingPromo) {
                const currentQty = parseInt(matchingPromo.quantityBerlaku) || 0;
                matchingPromo.quantityBerlaku = Math.max(0, currentQty - 1);
                updated = true;
                console.log(
                  "Promo Berhasil dikurangi",
                  matchingPromo.judulPromo || matchingPromo._id,
                );
              } else {
                throw new Error("tidak ada judul promo yang cocok");
              }
            }

            if (updated) {
              await AsyncStorage.setItem("promo", JSON.stringify(promos));
              updateStatus.promos = true;
            }
          }
        }
      } catch (error) {
        throw new Error("Gagal mengurangi promo offline");
      }

      // 4. Update voucher (decrease quantityTersedia)
      try {
        if (futureVoucher?.length > 0) {
          const vouchersStr = await AsyncStorage.getItem("voucher");
          if (vouchersStr) {
            let vouchers = JSON.parse(vouchersStr);
            let updated = false;

            for (const v of futureVoucher) {
              // Using find instead of findIndex for consistency with other updates
              const matchingVoucher = vouchers.find(
                (voucherStorage) =>
                  voucherStorage._id === v?.voucherInfo?.voucherId,
              );

              if (matchingVoucher) {
                const currentQty =
                  parseInt(matchingVoucher.quantityTersedia) || 0;
                matchingVoucher.quantityTersedia = Math.max(0, currentQty - 1);
                updated = true;
                console.log(
                  "Voucher match found and updated:",
                  matchingVoucher.judulVoucher ||
                    matchingVoucher.kodeVoucher ||
                    matchingVoucher._id,
                );
              } else {
                console.log(
                  "Voucher tidak ditemukan:",
                  v?.judulVoucher ||
                    v?.kodeVoucher ||
                    v?._id ||
                    "unknown voucher",
                );
              }
            }

            if (updated) {
              await AsyncStorage.setItem("voucher", JSON.stringify(vouchers));
              updateStatus.vouchers = true;
            }
          }
        } else {
          console.log(
            "skip aggregate futureVoucher pada updateInventoryAndStats karena tidak ada",
          );
        }
      } catch (error) {
        throw new Error("Gagal mengurangi voucher offline");
      }

      // 5. Update SPG stats
      try {
        const spgsStr = await AsyncStorage.getItem("spg");
        if (spgsStr) {
          const spgs = JSON.parse(spgsStr);
          let updated = false;
          const spgIndex = spgs.findIndex(
            (s) => s?._id === spg?._id || s?._id === spg,
          );

          if (spgIndex !== -1) {
            // Update skuTerjual for SPG
            currentBill.forEach((item) => {
              const skuTerjuals = spgs[spgIndex]?.skuTerjual?.map((i) => i.sku);
              //note: skuTerjual.sku&.quantity akan direset jadi kosong jika sync berhasil
              if (skuTerjuals?.includes(item.sku)) {
                // Find the matching SKU item
                const existingItem = spgs[spgIndex].skuTerjual.find(
                  (i) => i.sku === item.sku,
                );
                if (existingItem) {
                  const existingQty = parseInt(existingItem.quantity) || 0;
                  existingItem.quantity = existingQty + parseInt(item.quantity);
                  updated = true;
                }
              } else {
                if (!spgs[spgIndex].skuTerjual) {
                  spgs[spgIndex].skuTerjual = [];
                }
                const verydemure = {
                  sku: item?.sku,
                  quantity: item?.quantity,
                };
                spgs[spgIndex].skuTerjual.push(verydemure);
                updated = true;
                console.log("SPG Berhasil tambah sku baru:", item.sku);
              }
            });

            // Update totalHargaPenjualanFromApp
            spgs[spgIndex].totalHargaPenjualanFromApp += setelahDiskon || 0;

            // Update totalQuantityPenjualanFromApp
            const totalItemQuantity = currentBill.reduce(
              (sum, item) => sum + (parseInt(item.quantity) || 0),
              0,
            );
            spgs[spgIndex].totalQuantityPenjualanFromApp += totalItemQuantity;
            updated = true;

            if (updated) {
              await AsyncStorage.setItem("spg", JSON.stringify(spgs));
              updateStatus.spgs = true;
            }
          } else {
            throw new Error("No spg found, coba sync atau tambahkan ke outlet dulu");
          }
        }
      } catch (error) {
        throw new Error("Gagal mempengaruhi SPG offline", error);
      }

      // 6. Update userInfo stats
      try {
        const userInfoStr = await AsyncStorage.getItem("userInfo");
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          let updated = false;

          // Update totalHargaPenjualanFromApp
          if (userInfo) {
            userInfo.totalHargaPenjualanFromApp += setelahDiskon || 0;
            // Update totalQuantityPenjualanFromApp
            const totalItemQuantity = currentBill.reduce(
              (sum, item) => sum + (parseInt(item.quantity) || 0),
              0,
            );
            userInfo.totalQuantityPenjualanFromApp += totalItemQuantity;
            updated = true;
          }

          if (updated) {
            console.log("Menyimpan perubahan userInfo ke AsyncStorage...");
            await AsyncStorage.setItem("userInfo", JSON.stringify(userInfo));
            updateStatus.userInfo = true;
            console.log("UserInfo data berhasil disimpan di AsyncStorage");
          }
        }
      } catch (error) {
        throw new Error("Gagal memperbarui userInfo", error);
      }

      // 7. Update outlet data
      try {
        const outletStr = await AsyncStorage.getItem("outlet");
        if (outletStr) {
          const outlet = JSON.parse(outletStr);
          let updated = false;

          if (outlet) {
            // Update pendapatanFromApp
            outlet.pendapatanFromApp += setelahDiskon || cebelumDiskon;
            updated = true;
          }

          if (updated) {
            await AsyncStorage.setItem("outlet", JSON.stringify(outlet));
            updateStatus.outlet = true;
          }
        }
      } catch (error) {
        throw new Error("Gagal memperbarui outlet", error);
      }

      // Save update timestamp
      try {
        const updateTimestamp = new Date().toISOString();
        await AsyncStorage.setItem("lastInventoryUpdate", updateTimestamp);
      } catch (error) {
        throw new Error("Gagal menyimpan timestamp", error);
      }

      return Object.values(updateStatus).some((status) => status);
    } catch (error) {
      throw new Error("Gagal memperbarui data inventaris dan statistik", error);
    }
  };

  const handleCetakHelper = async () => {
    try {
      if (isOnline) {
        const multiConfig = JSON.parse(
          await AsyncStorage.getItem("printerConfigs"),
        );
        const config = multiConfig?.find((config) => config.isDefault);
        if (
          !config?.tipePrinter ||
          !config?.ipPrinter ||
          !config?.portPrinter
        ) {
          Platform.OS === "android" || Platform.OS === "ios"
            ? Alert.alert("Config printer belum lengkap")
            : alert("Config printer belum lengkap");
          return;
        }

        const time = excactTimeString();

        // Create list of items from current bill
        const items =
          currentBill?.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
          })) || [];

        // Get catatan items if any
        const catatans = currentBill
          ? currentBill
              .map((item) => {
                return {
                  sku: item.sku,
                  catatan: item.catatan || "",
                };
              })
              .filter((catatan) => catatan.catatan)
          : [];

        try {
          // Call the API function to print the helper note
          await printCetakHelper(_id, config, items, promo, catatans, time);
          ToastAndroid?.show(
            "Helper note berhasil dicetak",
            ToastAndroid.SHORT,
          );
        } catch (error) {
          console.error("Error cetak helper note:", error);
          ToastAndroid?.show("Gagal mencetak helper note", ToastAndroid.SHORT);
        }
      } else {
        throw new Error("Tidak bisa cetak saat offline");
      }
    } catch (error) {
      console.error("Error umum:", error);
      ToastAndroid?.show(
        "Terjadi kesalahan: " + error.message,
        ToastAndroid.SHORT,
      );
    } finally {
      setLoadingPrinting(false);
    }
  };

  const handleNomorTransaksiSubmit = (nomor) => {
    if (!nomor || nomor == undefined || nomor == null) {
      ToastAndroid?.show(
        "Nomor transaksi tidak boleh kosong",
        ToastAndroid.SHORT,
      );
      return;
    }
    setNomorTransaksi(nomor);
    setIsShowNomorTransaksiModal(false);
  };

  return {
    handleCetakBill,
    handleCetaKuitansi_offlineBayar,
    handleCetakHelper,
    checkSavedBills,
    isShowNomorTransaksiModal,
    setIsShowNomorTransaksiModal,
    handleNomorTransaksiSubmit,
    nomorTransaksi,
    isShowVoucherRedeemModal,
    setIsShowVoucherRedeemModal,
    showPaymentModal,
    paymentUrl,
    handleCetakBillContinueFlow,
    setHandleCetakBillContinueFlow,
    handleMidtransNavigationStateChange,
    handleMidtransPaymentClose,
    setShowPaymentModal,
  };
};
