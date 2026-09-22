import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  ReceiptText,
  RefreshCcw,
  BookUser,
  Wifi,
  WifiOff,
  BanknoteIcon,
  TicketPercent,
} from "lucide-react-native";
import { enumCustomerDialog } from "../dir/enumList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentBill, useOutlet, useSyncSetting } from "../store";
import { MODE_OUTLET } from "../constant";

export const BillHeader = ({
  handleShowBillTersimpanOffline,
  handleSinkronisasi,
  isPendingSinkronisasi,
  isOnline,
  setTitleForCustomerFormModal,
  setCustomerDialogPurpose,
  customerEmail,
  spg,
  customerName,
  paymentMethod,
  setIsShowPaymentMethodModal,
  lastSyncTime,
  setIsShowNomorTransaksiModal,
  setIsShowVoucherRedeemModal,
  _id,
}) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return "--:--";
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const [dataToShow, setDataToShow] = useState({});
  const { autoSyncSetelahKwitansiPertama } = useSyncSetting();
  const { done } = useCurrentBill();

  const { outlet, setOutlet } = useOutlet();

  useEffect(() => {
    const fillingDataToShow = async () => {
      const spgStr = await AsyncStorage.getItem("spg");
      const parsedSpg = spgStr ? JSON.parse(spgStr) : [];
      const spgData = parsedSpg?.find((s) => s?._id === spg?._id || spg);

      setDataToShow({
        customerEmail: customerEmail || "",
        customerName: customerName || "",
        paymentMethod: paymentMethod || "",
        spg: spg?.name || spgData?.name || "",
      });
    };

    const getOutletData = async () => {
      try {
        const outletRaw = await AsyncStorage.getItem("outlet");
        const parsedOutlet = JSON.parse(outletRaw);
        setOutlet(parsedOutlet);
      } catch (error) {
        console.error("Error getting outlet name:", error);
      }
    };

    if (!outlet) {
      getOutletData();
    }
    fillingDataToShow();
  }, [
    lastSyncTime,
    customerEmail,
    spg,
    customerName,
    paymentMethod,
    outlet?._id,
  ]);

  const openCustomerModal = (title) => {
    if (done) return;
    setTitleForCustomerFormModal(title);
    setCustomerDialogPurpose(enumCustomerDialog.ADD_CUSTOMER);
  };

  const openPaymentSpgModal = () => {
    if (done) return;
    setIsShowPaymentMethodModal(true);
  };

  return (
    <View>
      <View className="flex-row justify-between items-center px-4">
        <View className="flex-row gap-x-1 justify-between">
          <TouchableOpacity
            onPress={handleShowBillTersimpanOffline}
            className="flex-row items-center rounded-md"
          >
            <ReceiptText size={39} color="#3B82F6" />
          </TouchableOpacity>

          {outlet?.mode == MODE_OUTLET.offline && (
            <TouchableOpacity
              onPress={handleSinkronisasi}
              className={`flex-col justify-center items-center p-2 rounded-lg shadow-lg ${
                isOnline ? "bg-blue-950" : "bg-gray-400"
              }`}
              disabled={isPendingSinkronisasi || !isOnline}
            >
              <View className="flex flex-col">
                {isPendingSinkronisasi ? (
                  <ActivityIndicator size={15} color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <RefreshCcw size={15} color="white" />
                    <Text
                      className="text-white"
                      style={{ fontFamily: "gilroyRegular" }}
                    >
                      {formatTime(lastSyncTime)}
                    </Text>
                  </View>
                )}
              </View>
              <View className="block">
                <Text className="text-xs font-medium text-white">
                  {autoSyncSetelahKwitansiPertama ? "Auto" : "Interval"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="flex-row gap-x-1">
            <TouchableOpacity
              onPress={() => openCustomerModal("Tambahkan Pelanggan")}
              disabled={done}
              className={`rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1 ${
                done ? "bg-gray-400" : "bg-blue-950"
              }`}
            >
              <BookUser size={18} color="white" />
              <Text className="text-xs font-medium text-white">Customer</Text>
            </TouchableOpacity>

            {_id && !done && (
              <View className="flex-row gap-x-1">
                <TouchableOpacity
                  onPress={() => setIsShowNomorTransaksiModal(true)}
                  className="bg-blue-950 rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1"
                >
                  <BanknoteIcon size={18} color="white" />
                  <Text className="text-xs font-medium text-white">
                    No. trans..
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsShowVoucherRedeemModal(true)}
                  className="bg-blue-950 rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1"
                >
                  <TicketPercent size={18} color="white" />
                  <Text className="text-xs font-medium text-white">Redeem</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View
          className={`px-3 py-2 rounded-lg flex-row items-center border ${
            outlet?.mode === MODE_OUTLET.offline
              ? "bg-amber-500/10 border-amber-500/30"
              : outlet?.mode === MODE_OUTLET.stateless
                ? "bg-purple-500/10 border-purple-500/30"
                : "bg-slate-100 border-slate-200"
          }`}
        >
          {isOnline ? (
            <Wifi size={15} color="#10b981" />
          ) : (
            <WifiOff size={15} color="#ef4444" />
          )}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className={`text-xs font-semibold ml-1.5 max-w-[100px] ${
              outlet?.mode === MODE_OUTLET.offline
                ? "text-amber-600"
                : outlet?.mode === MODE_OUTLET.stateless
                  ? "text-purple-600"
                  : "text-slate-700"
            }`}
          >
            {outlet?.mode === MODE_OUTLET.offline
              ? "Offline Mode"
              : outlet?.mode === MODE_OUTLET.stateless
                ? `Stateless • ${outlet?.namaOutlet || ""}`
                : outlet?.namaOutlet}
          </Text>
        </View>
      </View>

      <View className="flex flex-row h-7 mt-1">
        <ScrollView horizontal={true} className="gap-x-3 mb-1">
          {dataToShow?.customerEmail ? (
            <TouchableOpacity
              disabled={done}
              onPress={() => openCustomerModal("Ganti Pelanggan")}
              className={`mr-1 rounded-full px-2 py-1 ${
                done ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-xs ${done ? "text-emerald-800" : "text-blue-950"}`}
                style={{ fontFamily: "gilroyRegular" }}
              >
                customer Email: {dataToShow?.customerEmail}
              </Text>
            </TouchableOpacity>
          ) : null}

          {dataToShow?.spg ? (
            <TouchableOpacity
              disabled={done}
              onPress={openPaymentSpgModal}
              className={`mr-1 rounded-full px-2 py-1 ${
                done ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-xs ${done ? "text-emerald-800" : "text-blue-950"}`}
                style={{ fontFamily: "gilroyRegular" }}
              >
                spg: {dataToShow?.spg}
              </Text>
            </TouchableOpacity>
          ) : null}

          {dataToShow?.customerName ? (
            <TouchableOpacity
              disabled={done}
              onPress={() => openCustomerModal("Ganti Pelanggan")}
              className={`mr-1 rounded-full px-2 py-1 ${
                done ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-xs ${done ? "text-emerald-800" : "text-blue-950"}`}
                style={{ fontFamily: "gilroyRegular" }}
              >
                customer Name: {dataToShow?.customerName}
              </Text>
            </TouchableOpacity>
          ) : null}

          {dataToShow?.paymentMethod ? (
            <TouchableOpacity
              disabled={done}
              onPress={openPaymentSpgModal}
              className={`mr-1 rounded-full px-2 py-1 ${
                done ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-xs ${done ? "text-emerald-800" : "text-blue-950"}`}
                style={{ fontFamily: "gilroyRegular" }}
              >
                paymentMethod: {paymentMethod}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};
