import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentBill } from "../store";

export default function OptionInventoriesModal({
  isShowOptionsInventories,
  setShowOptionsInventories,
  selectedItem,
}) {
  const _id = useCurrentBill((state) => state._id);
  const addToCurrentBill = useCurrentBill((state) => state.addToCurrentBill);
  const createCurrentBill = useCurrentBill((state) => state.createCurrentBill);

  const [userInfo, setUserInfo] = useState();

  const HandleAddToInvoice = async (item) => {
    if (!item?.sku || !item?.RpHargaDasar) {
      ToastAndroid?.show("Item tidak lengkap", ToastAndroid.SHORT);
      return;
    }

    const bill = {
      sku: item.sku,
      description: item.description,
      quantity: 1,
      RpHargaDasar: item?.RpHargaDasar?.$numberDecimal,
      limitQuantity: item.quantity,
    };

    setTimeout(() => {
      addToCurrentBill(bill);
      setShowOptionsInventories(false);
    }, 0);
  };

  const handleCreateCurrentBill = async (item) => {
    if (!item?.sku || !item?.RpHargaDasar) {
      ToastAndroid?.show("Item tidak lengkap", ToastAndroid.SHORT);
      return;
    }

    const bill = {
      sku: item.sku,
      description: item?.description,
      quantity: 1,
      RpHargaDasar: item?.RpHargaDasar?.$numberDecimal,
      limitQuantity: item.quantity,
      user: userInfo?.username,
    };

    setTimeout(() => {
      createCurrentBill(bill);
      setShowOptionsInventories(false);
    }, 0);
  };

  function handleJualPaksa() {
    if (_id) {
      HandleAddToInvoice(selectedItem);
    } else {
      handleCreateCurrentBill(selectedItem);
    }
    setShowOptionsInventories(false);
  }

  useEffect(() => {
    async function getUserInfo() {
      const userInfoStorage = await AsyncStorage.getItem("userInfo");
      if (userInfoStorage) {
        setUserInfo(JSON.parse(userInfoStorage));
      }
    }
    getUserInfo();
  }, []);

  return (
    <Modal
      visible={isShowOptionsInventories}
      transparent={true}
      animationType="slide"
    >
      <View
        className="flex-1 justify-center items-center "
        style={Styles.ModalOverlay}
      >
        <View
          style={Styles.ModalContent}
          className="h-fit gap-y-4 justify-between"
        >
          <View className="flex-row justify-between">
            <View className="text-start">
              <Text className="text-2xl font-bold">Options Inventories</Text>
              <Text className="text-xl font-bold text-gray-500">
                {selectedItem?.description}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowOptionsInventories(false)}
              className=" shadow-md"
            >
              <Text className="text-2xl font-bold text-red-500">X</Text>
            </TouchableOpacity>
          </View>

          <View className="w-96 mt-3">
            <TouchableOpacity
              onPress={handleJualPaksa}
              disabled={selectedItem?.quantity > 1}
              opacity={selectedItem?.quantity}
              className={` ${
                selectedItem?.quantity < 1 ? "bg-blue-950" : "bg-gray-300"
              } flex-row items-center gap-x-3 text-center justify-center rounded-lg py-2 px-4 mb-2 shadow-md`}
            >
              <Text className="text-white font-semibold flex-row text-center">
                Jual Paksa Item
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const Styles = StyleSheet.create({
  ModalOverlay: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  ModalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    flexDirection: "column",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 10,
  },
  closeButtonText: {
    color: "blue",
    fontWeight: "bold",
  },
});
