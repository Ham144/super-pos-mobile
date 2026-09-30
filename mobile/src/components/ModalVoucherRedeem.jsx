import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { voucherRedeem } from "../api";
import { useCurrentBill, useOutlet } from "../store";
import { ToastAndroid } from "react-native";

const ModalVoucherRedeem = ({ isVisible, onClose, initialValue = "" }) => {
  const [privateFVoucherCode, setPrivateFVoucherCode] = useState(initialValue);
  const { outlet } = useOutlet();

  const { setImplementedVoucher } = useCurrentBill();

  const { mutate: onSubmitVoucherRedeem, isPending } = useMutation({
    mutationKey: ["voucherRedeem"],
    mutationFn: () => {
      const response = voucherRedeem(privateFVoucherCode, outlet._id);
      return response;
    },
    onSuccess: (response) => {
      const voucherReference = response?.data?.voucherReference;
      if (!voucherReference) {
        return ToastAndroid.show(
          "Gagal menukarkan, voucher tidak valid",
          ToastAndroid.SHORT,
        );
      }
      setImplementedVoucher(voucherReference); //ditambahkan ke array
      setPrivateFVoucherCode("");
      onClose();
      ToastAndroid?.show("Berhasil menukarkan voucher", ToastAndroid.SHORT);
    },
    onError: (err) => {
      console.log(err);
      setPrivateFVoucherCode("");
      ToastAndroid.show(
        err?.response?.data?.message || "Terjadi kesalahan penukaran",
        ToastAndroid.SHORT,
      );
    },
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg w-[90%] max-w-md">
          <Text className="text-xl font-bold mb-4">Nomor Transaksi</Text>
          <Text className="text-gray-500 text-sm mb-4">
            Tanyakan ini kecustomer jika customer memiliki voucher yang ingin di
            tukar dari transaksi masa lalu, total harga akan berkurang jika
            masih valid
          </Text>

          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4"
            placeholder="Masukkan 5 karakter kode voucher yg pernah dikirim"
            value={privateFVoucherCode}
            onChangeText={setPrivateFVoucherCode}
            keyboardType="numeric"
          />

          <View className="flex-row justify-end gap-x-2">
            <TouchableOpacity
              onPress={() => {
                onClose();
                setPrivateFVoucherCode("");
              }}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-700">Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={privateFVoucherCode.length < 5 || isPending}
              onPress={() => {
                if (!isPending) {
                  onSubmitVoucherRedeem();
                }
              }}
              className={`bg-blue-950 px-4 py-2 rounded-lg ${
                privateFVoucherCode.length < 5 ? "opacity-50" : ""
              }`}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text className="text-white font-medium">Penukaran</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalVoucherRedeem;
