import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ToastAndroid, Alert } from "react-native";
import { getIsEnabledFitur, editLinesStateless } from "../api";
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

  const syncNavUndoAfterLineChange = useCallback(
    async (nextBill, removeSkus = []) => {
      if (
        outlet?.mode !== "stateless" ||
        !isPrintedCustomerBilling ||
        done ||
        !_id
      ) {
        return;
      }
      try {
        await editLinesStateless({
          invoiceId: _id,
          currentBill: nextBill,
          diskon,
          removeSkus,
        });
        setIsPrintedCustomerBilling(false);
        ToastAndroid?.show(
          "Perubahan dikirim ke NAV (undo shipment). Cetak bill ulang.",
          ToastAndroid.LONG,
        );
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Gagal undo shipment NAV";
        Alert.alert("Gagal sync edit ke NAV", msg);
      }
    },
    [
      outlet?.mode,
      isPrintedCustomerBilling,
      done,
      _id,
      diskon,
      setIsPrintedCustomerBilling,
    ],
  );

  const handleAfterEditItem = useCallback(
    async () => {
      const nextBill = useCurrentBill.getState().currentBill || [];
      await syncNavUndoAfterLineChange(nextBill);
    },
    [syncNavUndoAfterLineChange],
  );

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
      const billsOffline =
        JSON.parse(await AsyncStorage.getItem("bills")) || [];

      // Urutkan bill berdasarkan yang terbaru dulu
      // Asumsikan bill yang ditambahkan terakhir adalah yang paling baru
      // Jika ada properti timestamp, gunakan itu sebagai dasar pengurutan
      const sortedBills = [...billsOffline].sort((a, b) => {
        // Jika ada timestamp (createdAt, updatedAt, atau timestamp lain), gunakan itu
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }

        // Fallback ke perbandingan kodeInvoice jika ada (asumsikan kode invoice bisa diurutkan)
        if (a.kodeInvoice && b.kodeInvoice) {
          // Jika kode invoice berisi timestamp (misal INV-20230605-001)
          // Ekstrak timestamp dari kodeInvoice jika mengikuti format tertentu
          return b.kodeInvoice.localeCompare(a.kodeInvoice);
        }

        // Jika tidak bisa melakukan pengurutan yang andal, biarkan urutan tetap seperti aslinya
        return 0;
      });

      // Simpan hasil pengurutan untuk digunakan nanti
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
      clearSale: handleClearSale,
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
      handleClearSale,
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
          onAfterEdit={handleAfterEditItem}
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
