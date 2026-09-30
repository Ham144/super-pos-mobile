import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, ToastAndroid, Alert } from "react-native";
import {
  getIsEnabledFitur,
  editLinesStateless,
  voidBillStateless,
} from "../api";
import {
  useCurrentBill,
  useFiturEnabled,
  useSyncSetting,
  useOutlet,
} from "../store";
import EditItemModal from "./EditItemModal";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BillHistoryModal from "./BillHistoryModal";
import CustomerFormModal from "./AddCustomerModal";
import { enumCustomerDialog } from "../dir/enumList";
import DetailModal from "./DetailModal";
import { BillHeader } from "./BillHeader";
import { BillItems } from "./BillItems";
import { BillAdjustmentsPanel } from "./BillAdjustmentsPanel";
import { BillTotalsFooter } from "./BillTotalsFooter";
import { useBillCalculations } from "../hooks/useBillCalculations";
import { useOnlineSync } from "../hooks/useOnlineSync";
import { useBillOperations } from "../hooks/useBillOperations";
import MidtransOptionModal from "./MidtransOptionModal";
import { ModalNomorTransaksi } from "./ModalNomorTransaksi";
import ModalVoucherRedeem from "./ModalVoucherRedeem";
import { purgeForeignOutletBills } from "../utils/reconcileOutletSession";
import { environment } from "../constant";

const billSignature = (bill = []) =>
  bill
    .map((l) => `${l.sku}|${Number(l.quantity)}|${Number(l.RpHargaDasar)}`)
    .sort()
    .join(",");

const normSku = (sku) => String(sku ?? "").trim().toUpperCase();

// Perlu undo di NAV hanya kalau SKU yang sudah ter-ship dihapus / qty berubah / harga berubah.
// SKU baru cukup ikut Cetak Bill ulang (backend hanya ship line yang belum ada di NAV).
const needsNavUndo = (navBill = [], nextBill = []) =>
  navBill.some((shipped) => {
    const next = nextBill.find((l) => normSku(l.sku) === normSku(shipped.sku));
    return (
      !next ||
      Number(next.quantity) !== Number(shipped.quantity) ||
      Number(next.RpHargaDasar) !== Number(shipped.RpHargaDasar)
    );
  });

const RegisterInvoice = ({ fullWidth = false }) => {
  // State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [tempEditItem, setTempEditItem] = useState({});
  const [isShowBillTersimpan, setIsShowBillTersimpan] = useState(false);
  const [allBillTersimpan, setAllBillTersimpan] = useState(null);
  const [titleForCustomerFormModal, setTitleForCustomerFormModal] =
    useState("");
  const [isShowPaymentMethodModal, setIsShowPaymentMethodModal] =
    useState(false);
  const [customerDialogPurpose, setCustomerDialogPurpose] = useState(
    enumCustomerDialog.HIDE
  );
  const { setAutoSyncSetelahKwitansiPertama } = useSyncSetting();
  const {
    setFutureVoucherEnabled,
    setPromoEnabled,
    setDiskonEnabled,
    diskonEnabled,
    promoEnabled,
    futureVoucherEnabled,
  } = useFiturEnabled();

  // Fitur query
  const { data: fiturEnabled } = useQuery({
    queryFn: async () => await getIsEnabledFitur(),
    queryKey: ["fiturEnabled"],
  });

  // Zustand store
  const {
    _id,
    currentBill,
    clearSale: originalClearSale,
    spg,
    diskon,
    promo,
    futureVoucher,
    isPrintedKwitansi,
    isPrintedCustomerBilling,
    setIsPrintedCustomerBilling,
    setIsPrintedKwitansi,
    setCurrentBill,
    done,
    setDone,
    customerName,
    customerEmail,
    customerPhone,
    customerJenisKel,
    customerAddress,
    paymentMethod,
    salesPerson,
    kodeInvoice,
    setNomorTransaksi,
    nomorTransaksi,
    tanggalBayar,
    implementedVoucher,
  } = useCurrentBill();

  // Define handleClearSale before useBillOperations
  const handleClearSale = () => {
    originalClearSale();
    setDone(false);
  };

  const handleEditBillItem = useCallback((item) => {
    setShowEditItemModal(true);
    setTempEditItem(item);
  }, []);

  const { outlet } = useOutlet();
  const isStateless = outlet?.mode === "stateless";

  // Snapshot bill yang terakhir sudah sinkron dengan NAV (saat ship / setelah undo).
  // null = bill ini belum pernah di-ship, jadi perubahan cukup lokal.
  const navSyncedBillRef = useRef(null);
  // Bill terakhir yang sudah dikonfirmasi kasir (bisa berisi item baru yang belum ter-ship)
  const acceptedBillRef = useRef(null);
  const navSyncInFlightRef = useRef(false);
  const navChangeAlertOpenRef = useRef(false);
  // true = ada undo / item baru sejak cetak terakhir, jadi Bayar tidak boleh dibuka lagi tanpa cetak ulang
  const navUndoneSincePrintRef = useRef(false);

  useEffect(() => {
    navSyncedBillRef.current = null;
    acceptedBillRef.current = null;
    navUndoneSincePrintRef.current = false;
  }, [_id]);

  useEffect(() => {
    if (isStateless && isPrintedCustomerBilling && _id) {
      const printed = useCurrentBill.getState().currentBill || [];
      navSyncedBillRef.current = printed;
      acceptedBillRef.current = printed;
      navUndoneSincePrintRef.current = false;
    }
  }, [isStateless, isPrintedCustomerBilling, _id]);

  const revertToNavBill = useCallback(() => {
    const accepted = acceptedBillRef.current || navSyncedBillRef.current;
    if (!accepted) return;
    useCurrentBill.setState({ currentBill: accepted });
    if (!navUndoneSincePrintRef.current) setIsPrintedCustomerBilling(true);
  }, [setIsPrintedCustomerBilling]);

  const syncNavLines = useCallback(async () => {
    if (navSyncInFlightRef.current) return;
    const state = useCurrentBill.getState();
    const synced = navSyncedBillRef.current;
    if (!synced || state.done || !state._id) return;

    const nextBill = state.currentBill || [];
    if (billSignature(nextBill) === billSignature(synced)) return;

    const removeSkus = synced
      .filter((line) => !nextBill.some((l) => l.sku === line.sku))
      .map((line) => line.sku);

    navSyncInFlightRef.current = true;
    try {
      const result = await editLinesStateless({
        invoiceId: state._id,
        currentBill: nextBill,
        diskon: state.diskon,
        removeSkus,
      });
      const undoneSkus = new Set(
        (result?.undone || []).map((l) => normSku(l.itemNo)),
      );
      navSyncedBillRef.current = synced.filter(
        (l) => !undoneSkus.has(normSku(l.sku)),
      );
      acceptedBillRef.current = nextBill;
      navUndoneSincePrintRef.current = true;
      Alert.alert(
        "Undo Shipment Berhasil",
        "Item yang berubah sudah di-undo di NAV.\n\nWAJIB tekan \"Cetak Bill (Customer)\" lagi sebelum Bayar. Pastikan bill sudah FINAL sebelum mencetak, supaya tidak bolak-balik undo.",
      );
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message;
      const partialUndone = error?.response?.data?.partialUndone || [];
      console.error(msg);

      // Sebagian line sudah ter-undo di NAV → shipment sudah tidak utuh, Bayar tetap dikunci
      if (partialUndone.length) navUndoneSincePrintRef.current = true;
      revertToNavBill();

      const errorMessage =
        `${msg}\n\nPerubahan dibatalkan, item dikembalikan seperti bill yang sudah dikirim ke NAV.` +
        (partialUndone.length
          ? `\n\nPERHATIAN: sebagian line sempat ter-undo (${partialUndone
              .map((l) => l.itemNo)
              .join(", ")}). Wajib Cetak Bill (Customer) ulang sebelum Bayar.`
          : "");
      Alert.alert("Undo Shipment GAGAL", errorMessage);
      if(environment == "development") {
        console.error(errorMessage);
      }
    } finally {
      navSyncInFlightRef.current = false;
    }
  }, [revertToNavBill]);

  // Semua sumber perubahan (Libraries, Favorites, edit, hapus) lewat sini.
  // Sebelum Cetak Bill: synced masih null → bebas, murni lokal.
  // Sesudah Cetak Bill: kasir wajib konfirmasi dulu sebelum undo shipment ke NAV.
  useEffect(() => {
    const synced = navSyncedBillRef.current;
    if (!isStateless || done || !_id || !synced) return;
    if (navChangeAlertOpenRef.current || navSyncInFlightRef.current) return;
    const accepted = acceptedBillRef.current || synced;
    if (billSignature(currentBill || []) === billSignature(accepted)) return;

    navChangeAlertOpenRef.current = true;
    const closeAlert = () => {
      navChangeAlertOpenRef.current = false;
    };

    if (!needsNavUndo(synced, currentBill || [])) {
      Alert.alert(
        "⚠️ Bill Sudah Terkirim ke NAV",
        "Item baru ditambahkan ke bill yang sudah dikirim ke NAV.\n\n" +
          "Tidak perlu undo shipment, tapi kamu WAJIB Cetak Bill (Customer) ulang " +
          "supaya item baru ikut terkirim sebelum Bayar.\n\n" +
          "note: pastikan customer sudah FINAL sebelum menekan Cetak Bill (Customer)",
        [
          {
            text: "Batalkan Perubahan",
            style: "cancel",
            onPress: () => {
              revertToNavBill();
              closeAlert();
            },
          },
          {
            text: "Lanjutkan",
            onPress: () => {
              acceptedBillRef.current = useCurrentBill.getState().currentBill || [];
              navUndoneSincePrintRef.current = true;
              setIsPrintedCustomerBilling(false);
              closeAlert();
            },
          },
        ],
        { cancelable: false },
      );
      return;
    }

    Alert.alert(
      "⚠️ Bill Sudah Terkirim ke NAV",
      "Bill ini sudah dicetak & dikirim ke NAV (SalesOrderAutoPostingShip).\n\n" +
        "Mengubah qty / harga atau menghapus item yang sudah terkirim akan menjalankan UNDO SHIPMENT di NAV, " +
        "lalu kamu WAJIB Cetak Bill ulang sebelum Bayar.\n\n" +
        "note: pastikan customer sudah FINAL sebelum menekan Cetak Bill (Customer)",
      [
        {
          text: "Batalkan Perubahan",
          style: "cancel",
          onPress: () => {
            revertToNavBill();
            closeAlert();
          },
        },
        {
          text: "Ya, Undo di NAV",
          style: "destructive",
          onPress: async () => {
            setIsPrintedCustomerBilling(false);
            await syncNavLines();
            closeAlert();
          },
        },
      ],
      { cancelable: false },
    );
  }, [
    currentBill,
    isStateless,
    done,
    _id,
    setIsPrintedCustomerBilling,
    syncNavLines,
    revertToNavBill,
  ]);

  const handleUserClearSale = () => {
    const state = useCurrentBill.getState();
    const wasShipped = Boolean(navSyncedBillRef.current);
    if (!isStateless || state.done || !state._id || !wasShipped) {
      handleClearSale();
      return;
    }

    Alert.alert(
      "⚠️ Bill Sudah Terkirim ke NAV",
      "Clear bill ini akan menjalankan UNDO SHIPMENT untuk SEMUA item di NAV.\n\nYakin bill ini dibatalkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Undo Semua & Clear",
          style: "destructive",
          onPress: () => voidShippedBillThenClear(state._id),
        },
      ],
      { cancelable: false },
    );
  };

  const voidShippedBillThenClear = (invoiceId) => {
    voidBillStateless({ invoiceId })
      .then(() => {
        ToastAndroid?.show(
          "Shipment NAV dibatalkan (undo shipment)",
          ToastAndroid.SHORT,
        );
        handleClearSale();
      })
      .catch((error) => {
        const msg = error?.response?.data?.message || error?.message;
        const partialUndone = error?.response?.data?.partialUndone || [];
        const msgError =
          `${msg || "Terjadi kesalahan"}` +
          (partialUndone.length
            ? `\n\nSebagian line sempat ter-undo: ${partialUndone
                .map((l) => l.itemNo)
                .join(", ")}.`
            : "") +
          `\n\nBill TIDAK di-clear. Jika tetap di-clear, shipment di NAV masih tercatat dan harus di-void manual dari Aktivitas.`;
        if (environment === "development") {
          console.log("voidBillStateless gagal:", error?.response?.data || error);
        }
        Alert.alert(
          "Gagal Undo Shipment NAV",
          msgError,
          [
            { text: "Batal", style: "cancel" },
            { text: "Tetap Clear", style: "destructive", onPress: handleClearSale },
          ],
        );
      });
  };

  // Custom hooks
  const { isCalculating, cebelumDiskon, setelahDiskon } = useBillCalculations();
  const { isOnline, handleSinkronisasi, isPendingSinkronisasi, lastSyncTime } =
    useOnlineSync();
  const {
    handleCetakBill,
    handleCetaKuitansi_offlineBayar,
    handleCetakHelper,
    isShowNomorTransaksiModal,
    setIsShowNomorTransaksiModal,
    handleNomorTransaksiSubmit,
    isShowVoucherRedeemModal,
    setIsShowVoucherRedeemModal,
    showPaymentModal,
    paymentUrl,
    handleMidtransNavigationStateChange,
    handleMidtransPaymentClose,
  } = useBillOperations({
    _id,
    kodeInvoice,
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
    customerJenisKel,
    customerAddress,
    paymentMethod,
    isPrintedCustomerBilling,
    isPrintedKwitansi,
    setIsPrintedKwitansi,
    done,
    setDone,
    setIsPrintedCustomerBilling,
    clearSale: handleClearSale,
    isOnline,
    setCustomerDialogPurpose,
    setTitleForCustomerFormModal,
    enumCustomerDialog,
    setIsShowPaymentMethodModal,
    setNomorTransaksi,
    nomorTransaksi,
    tanggalBayar,
    implementedVoucher,
  });

  const handleShowBillTersimpanOffline = async () => {
    try {
      setIsShowBillTersimpan(true);
      const kodeOutlet = outlet?.kodeOutlet;
      const billsOffline = kodeOutlet
        ? await purgeForeignOutletBills(kodeOutlet)
        : JSON.parse(await AsyncStorage.getItem("bills")) || [];

      // Urutkan bill berdasarkan yang terbaru dulu
      const sortedBills = [...billsOffline].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        if (a.kodeInvoice && b.kodeInvoice) {
          return b.kodeInvoice.localeCompare(a.kodeInvoice);
        }
        return 0;
      });

      setAllBillTersimpan(sortedBills);
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat membaca bill dari AsyncStorage:",
        error
      );
    }
  };

  const handlePickSavedBill = async (_id) => {
    try {
      const storedBills = await AsyncStorage.getItem("bills");
      if (storedBills) {
        const parsedBill = await JSON.parse(storedBills);
        const index = parsedBill.findIndex((bill) => bill?._id == _id);
        if (index !== -1) {
          //jangan lupa konvesi string id spg menjadi obj spg
          if (typeof parsedBill[index].spg === "string") {
            const spgData = await AsyncStorage.getItem("spg");
            const spgDataParsed = JSON.parse(spgData);
            const spgDataObj = spgDataParsed.find(
              (spg) => spg._id === parsedBill[index].spg
            );
            parsedBill[index].spg = spgDataObj;
          }
          setCurrentBill(parsedBill[index]);
          setDone(parsedBill[index].done === true);
          setIsShowBillTersimpan(false);
        } else {
          ToastAndroid?.show("terjadi kesalahan", ToastAndroid.SHORT);
        }
      } else {
        ToastAndroid?.show("Tidak ada bills history", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat membaca bill dari AsyncStorage:",
        error
      );
    }
  };

  const handleAddorSelectCustomer = async (newCustomer) => {
    const customerOffline = await AsyncStorage.getItem("customer");
    if (customerOffline) {
      const similarCustomer = customerOffline.find(
        (customer) => customer.email === newCustomer.email
      );
      if (similarCustomer) {
      }
    } else {
      await AsyncStorage.setItem("customer", JSON.stringify([]));
    }
  };

  useEffect(() => {
    async function initAPPCONFIG() {
      const isDiskonEnabledStg = await AsyncStorage.getItem("diskonEnabled");
      const isPromoEnabledStg = await AsyncStorage.getItem("promoEnabled");
      const isFutureVoucherEnabledStg = await AsyncStorage.getItem(
        "futureVoucherEnabled"
      );

      const autoSyncSetelahKwitansiPertama = await AsyncStorage.getItem(
        "autoSyncSetelahKwitansiPertama"
      );

      if (isDiskonEnabledStg) {
        setDiskonEnabled(JSON.parse(isDiskonEnabledStg));
      } else {
        setDiskonEnabled(true);
        await AsyncStorage.setItem("diskonEnabled", JSON.stringify(true));
      }

      if (isPromoEnabledStg) {
        setPromoEnabled(JSON.parse(isPromoEnabledStg));
      } else {
        setPromoEnabled(true);
        await AsyncStorage.setItem("promoEnabled", JSON.stringify(true));
      }

      if (isFutureVoucherEnabledStg) {
        setFutureVoucherEnabled(JSON.parse(isFutureVoucherEnabledStg));
      } else {
        setFutureVoucherEnabled(true);
        await AsyncStorage.setItem(
          "futureVoucherEnabled",
          JSON.stringify(true)
        );
      }

      if (autoSyncSetelahKwitansiPertama) {
        setAutoSyncSetelahKwitansiPertama(autoSyncSetelahKwitansiPertama);
      } else {
        setAutoSyncSetelahKwitansiPertama(true);
        await AsyncStorage.setItem(
          "autoSyncSetelahKwitansiPertama",
          JSON.stringify(true)
        );
      }
    }
    initAPPCONFIG();
  }, [fiturEnabled]);

  const billActionsProps = useMemo(
    () => ({
      _id,
      cebelumDiskon,
      setelahDiskon,
      done,
      isPrintedCustomerBilling,
      isPrintedKwitansi,
      handleCetakBill,
      handleCetaKuitansi_offlineBayar,
      handleCetakHelper,
      clearSale: handleUserClearSale,
      setIsShowPaymentMethodModal,
    }),
    [
      _id,
      cebelumDiskon,
      setelahDiskon,
      done,
      isPrintedCustomerBilling,
      isPrintedKwitansi,
      handleCetakBill,
      handleCetaKuitansi_offlineBayar,
      handleCetakHelper,
      handleUserClearSale,
      setIsShowPaymentMethodModal,
    ]
  );

  return (
    <View className={`${fullWidth ? "w-full" : "w-1/2"} h-full pb-2 px-3`}>
      <View className="bg-white flex-col w-full h-full px-2 ">
        <View className="flex-1 flex flex-col">
          <BillHeader
            _id={_id}
            handleShowBillTersimpanOffline={handleShowBillTersimpanOffline}
            handleSinkronisasi={handleSinkronisasi}
            isPendingSinkronisasi={isPendingSinkronisasi}
            isOnline={isOnline}
            setTitleForCustomerFormModal={setTitleForCustomerFormModal}
            setCustomerDialogPurpose={setCustomerDialogPurpose}
            customerEmail={customerEmail}
            spg={spg}
            customerName={customerName}
            paymentMethod={paymentMethod}
            setIsShowPaymentMethodModal={setIsShowPaymentMethodModal}
            enumCustomerDialog={enumCustomerDialog}
            lastSyncTime={lastSyncTime}
            kodeInvoice={kodeInvoice}
            handleNomorTransaksiSubmit={handleNomorTransaksiSubmit}
            setIsShowNomorTransaksiModal={setIsShowNomorTransaksiModal}
            setIsShowVoucherRedeemModal={setIsShowVoucherRedeemModal}
          />

          <View className="flex-1 min-h-0">
            <View style={{ flex: 1, minHeight: 0 }}>
              <BillItems
                onEditItem={handleEditBillItem}
                onRemoveItem={async (item) => {
                  useCurrentBill.getState().removeFromCurrentBill(item);
                  const nextBill = useCurrentBill.getState().currentBill || [];
                  await syncNavUndoAfterLineChange(nextBill, [item.sku]);
                }}
              />
            </View>

            {/* Shrink-wrap: only consumes height when promo/diskon/voucher UI exists */}
            <BillAdjustmentsPanel />
          </View>

          <BillTotalsFooter
            cebelumDiskon={cebelumDiskon}
            setelahDiskon={setelahDiskon}
            isCalculating={isCalculating}
            billActionsProps={billActionsProps}
          />
        </View>
      </View>

      {/* Modals */}
      {isShowBillTersimpan && (
        <BillHistoryModal
          allBillTersimpan={allBillTersimpan}
          isShowBillTersimpan={isShowBillTersimpan}
          setIsShowBillTersimpan={setIsShowBillTersimpan}
          handlePickSavedBill={handlePickSavedBill}
          key={"billHistoryModal"}
        />
      )}
      {customerDialogPurpose !== enumCustomerDialog.HIDE && (
        <CustomerFormModal
          onClose={() => {
            setCustomerDialogPurpose(enumCustomerDialog.HIDE);
            setTitleForCustomerFormModal(null);
          }}
          callback={handleCetakBill}
          title={titleForCustomerFormModal}
          customerDialogPurpose={customerDialogPurpose}
          onSubmit={handleAddorSelectCustomer}
          isPaid={done}
          key={"pelanggan"}
        />
      )}
      {isShowPaymentMethodModal && (
        <DetailModal
          setModalVisible={setIsShowPaymentMethodModal}
          visible={isShowPaymentMethodModal}
          handleCetakBill={handleCetakBill}
          key={"paymentMethod"}
        />
      )}
      {showEditItemModal && (
        <EditItemModal
          showEditItemModal={showEditItemModal}
          setShowEditItemModal={setShowEditItemModal}
          tempEditItem={tempEditItem}
        />
      )}
      {isShowNomorTransaksiModal && (
        <ModalNomorTransaksi
          isVisible={isShowNomorTransaksiModal}
          onClose={() => setIsShowNomorTransaksiModal(false)}
          onSubmit={handleNomorTransaksiSubmit}
        />
      )}
      {isShowVoucherRedeemModal && (
        <ModalVoucherRedeem
          isVisible={isShowVoucherRedeemModal}
          onClose={() => {
            setIsShowVoucherRedeemModal(false);
          }}
        />
      )}
      <MidtransOptionModal
        visible={showPaymentModal}
        paymentUrl={paymentUrl}
        onClose={handleMidtransPaymentClose}
        onNavigationStateChange={handleMidtransNavigationStateChange}
      />
      
    </View>
  );
};

export default RegisterInvoice;
