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
  // Format the time as HH:MM
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

  //zustand
  const { outlet, setOutlet } = useOutlet();

  useEffect(() => {
    const fillingDataToShow = async () => {
      //rekonstruksi spg
      const spgStr = await AsyncStorage.getItem("spg");
      const parsedSpg = JSON.parse(spgStr);
      const spgData = parsedSpg?.find((s) => s?._id === spg?._id || spg);

      const data = {
        customerEmail: customerEmail || "",
        customerName: customerName || "",
        paymentMethod: paymentMethod || "",
        spg: spg?.name || spgData?.name || "",
      };
      setDataToShow(data);
    };

    const getOutletData = async () => {
      try {
        const outlet = await AsyncStorage.getItem("outlet");
        const parsedOutlet = JSON.parse(outlet);
        setOutlet(parsedOutlet);
      } catch (error) {
        console.error("Error getting outlet name:", error);
      }
    };

    if (!outlet) {
      getOutletData();
    }
    fillingDataToShow();
  }, [lastSyncTime, customerEmail, spg, customerName, paymentMethod]);

  return (
    <View>
      <View className="flex-row justify-between items-center px-4">
        <View className="flex-row  gap-x-1 justify-between">
          <TouchableOpacity
            onPress={handleShowBillTersimpanOffline}
            className="flex-row items-center rounded-md"
          >
            <Text className="text-2xl font-bold text-blue-950">
              <ReceiptText size={39} color={"#3B82F6"} />
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSinkronisasi}
            className={`flex-col  justify-center items-center p-2 rounded-lg shadow-lg ${
              isOnline ? "bg-blue-950" : "bg-gray-400"
            }`}
          >
            <View
              disabled={isPendingSinkronisasi || !isOnline}
              className="flex flex-col"
            >
              {isPendingSinkronisasi ? (
                <ActivityIndicator size={15} color="white" />
              ) : (
                <View className="flex-row  items-center ">
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
              <Text className="text-white text-xs font-medium">
                {autoSyncSetelahKwitansiPertama ? "Auto" : "Interval"}
              </Text>
            </View>
          </TouchableOpacity>
          <View className="flex-row gap-x-1">
            <TouchableOpacity
              onPress={() => {
                setTitleForCustomerFormModal("Tambahkan Pelanggan");
                setCustomerDialogPurpose(enumCustomerDialog.ADD_CUSTOMER);
              }}
              className="bg-blue-950 rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1"
            >
              <BookUser size={18} color="white" />
              <Text className="text-white text-xs font-medium">Customer</Text>
            </TouchableOpacity>
            {_id && !done && (
              <View className="flex-row gap-x-1">
                <TouchableOpacity
                  onPress={() => {
                    setIsShowNomorTransaksiModal(true);
                  }}
                  className="bg-blue-950 rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1"
                >
                  <BanknoteIcon size={18} color="white" />
                  <Text className="text-white text-xs font-medium">
                    No. trans..
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsShowVoucherRedeemModal(true);
                  }}
                  className="bg-blue-950 rounded-lg shadow-lg px-2 py-2 flex-col items-center w-20 gap-y-1"
                >
                  <TicketPercent size={18} color="white" />
                  <Text className="text-white text-xs font-medium">Redeem</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View
          className={`px-3 py-3 rounded-lg flex-row items-center ${
            isOnline ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isOnline ? (
            <Wifi size={16} color="#ffffff" />
          ) : (
            <WifiOff size={16} color="#ffffff" />
          )}
          <Text className="text-white text-xs font-medium ml-1 w-14 truncate">
            {outlet?.namaOutlet}
          </Text>
        </View>
      </View>

      <View className="flex flex-row  h-7 mt-1 ">
        <ScrollView horizontal={true} className="gap-x-3 mb-1">
          {dataToShow?.customerEmail && (
            <TouchableOpacity
              onPress={() => {
                setCustomerDialogPurpose(enumCustomerDialog.ADD_CUSTOMER);
                setTitleForCustomerFormModal("Ganti Pelanggan");
              }}
              className="bg-blue-100 mr-1 rounded-full px-2 py-1 text-xs font-bold text-blue-950"
            >
              <Text
                className=" text-xs"
                style={{ fontFamily: "gilroyRegular" }}
              >
                customer Email: {dataToShow?.customerEmail}
              </Text>
            </TouchableOpacity>
          )}

          {dataToShow?.spg && (
            <TouchableOpacity
              onPress={() => {
                setIsShowPaymentMethodModal(true);
              }}
              className="bg-blue-100 mr-1 rounded-full px-2 py-1 text-xs font-bold text-blue-950"
            >
              <Text className="text-xs" style={{ fontFamily: "gilroyRegular" }}>
                spg: {dataToShow?.spg}
              </Text>
            </TouchableOpacity>
          )}

          {dataToShow?.customerName && (
            <TouchableOpacity
              onPress={() => {
                setCustomerDialogPurpose(enumCustomerDialog.ADD_CUSTOMER);
                setTitleForCustomerFormModal("Ganti Pelanggan");
              }}
              className="bg-blue-100 mr-1 rounded-full px-2 py-1 text-xs font-bold text-blue-950"
            >
              <Text className="text-xs" style={{ fontFamily: "gilroyRegular" }}>
                customer Name: {dataToShow?.customerName}
              </Text>
            </TouchableOpacity>
          )}

          {dataToShow?.paymentMethod && (
            <TouchableOpacity
              onPress={() => {
                setIsShowPaymentMethodModal(true);
              }}
              className="bg-blue-100 mr-1 rounded-full px-2 py-1 text-xs font-bold text-blue-950"
            >
              <Text className="text-xs" style={{ fontFamily: "gilroyRegular" }}>
                paymentMethod: {paymentMethod}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
};
