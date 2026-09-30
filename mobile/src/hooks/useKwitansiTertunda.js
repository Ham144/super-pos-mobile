import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, ToastAndroid } from "react-native";

const useKwitansiTertunda = ({ bill }) => {
  // Mengambil semua kwitansi tertunda
  const getKwitansiTertunda = async () => {
    try {
      const kwitansiTertundaStr = await AsyncStorage.getItem(
        "kwitansiTertunda"
      );
      return kwitansiTertundaStr ? JSON.parse(kwitansiTertundaStr) : [];
    } catch (error) {
      console.error("Error getting delayed receipts:", error);
      return [];
    }
  };

  // Menyimpan bill ke kwitansi tertunda
  const simpanBillKeKirimKwitansiTertunda = async () => {
    try {
      if (!bill) {
        throw new Error("Bill tidak ditemukan");
      }

      // Ambil kwitansi tertunda yang sudah ada
      const kwitansiTertunda = await getKwitansiTertunda();

      // Cek apakah bill sudah ada di kwitansi tertunda
      const isBillExists = kwitansiTertunda.some(
        (item) => item._id === bill._id
      );

      if (isBillExists) {
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Bill sudah ada di kwitansi tertunda",
            ToastAndroid.SHORT
          );
        }
        return false;
      }

      // Tambahkan bill baru ke kwitansi tertunda
      const updatedKwitansiTertunda = [
        ...kwitansiTertunda,
        {
          ...bill,
          tanggalDitunda: new Date().toISOString(),
          status: "pending",
        },
      ];

      // Simpan ke AsyncStorage
      await AsyncStorage.setItem(
        "kwitansiTertunda",
        JSON.stringify(updatedKwitansiTertunda)
      );

      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Bill berhasil disimpan ke kwitansi tertunda",
          ToastAndroid.SHORT
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving delayed receipt:", error);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Gagal menyimpan ke kwitansi tertunda",
          ToastAndroid.SHORT
        );
      }
      return false;
    }
  };

  // Mengirim kwitansi tertunda melalui email
  const kirimKwitansiTertudanDariEmail = async () => {
    try {
      const kwitansiTertunda = await getKwitansiTertunda();

      // Filter kwitansi yang memiliki email customer
      const kwitansiDenganEmail = kwitansiTertunda.filter(
        (item) => item.customer?.email
      );

      if (kwitansiDenganEmail.length === 0) {
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Tidak ada kwitansi dengan email customer",
            ToastAndroid.SHORT
          );
        }
        return false;
      }

      // TODO: Implementasi pengiriman email
      // Setelah berhasil dikirim, update status
      const updatedKwitansiTertunda = kwitansiTertunda.map((item) => {
        if (item.customer?.email) {
          return { ...item, status: "sent" };
        }
        return item;
      });

      await AsyncStorage.setItem(
        "kwitansiTertunda",
        JSON.stringify(updatedKwitansiTertunda)
      );

      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Kwitansi berhasil dikirim via email",
          ToastAndroid.SHORT
        );
      }
      return true;
    } catch (error) {
      console.error("Error sending delayed receipts via email:", error);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Gagal mengirim kwitansi via email",
          ToastAndroid.SHORT
        );
      }
      return false;
    }
  };

  // Mengirim kwitansi tertunda melalui WhatsApp
  const kirimKwitansiTertudanDariWhatsapp = async () => {
    try {
      const kwitansiTertunda = await getKwitansiTertunda();

      // Filter kwitansi yang memiliki nomor telepon customer
      const kwitansiDenganPhone = kwitansiTertunda.filter(
        (item) => item.customer?.phone
      );

      if (kwitansiDenganPhone.length === 0) {
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Tidak ada kwitansi dengan nomor telepon",
            ToastAndroid.SHORT
          );
        }
        return false;
      }

      // TODO: Implementasi pengiriman WhatsApp
      // Setelah berhasil dikirim, update status
      const updatedKwitansiTertunda = kwitansiTertunda.map((item) => {
        if (item.customer?.phone) {
          return { ...item, status: "sent" };
        }
        return item;
      });

      await AsyncStorage.setItem(
        "kwitansiTertunda",
        JSON.stringify(updatedKwitansiTertunda)
      );

      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Kwitansi berhasil dikirim via WhatsApp",
          ToastAndroid.SHORT
        );
      }
      return true;
    } catch (error) {
      console.error("Error sending delayed receipts via WhatsApp:", error);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Gagal mengirim kwitansi via WhatsApp",
          ToastAndroid.SHORT
        );
      }
      return false;
    }
  };

  // Menghapus kwitansi tertunda
  const hapusKwitansiTertunda = async (billId) => {
    try {
      const kwitansiTertunda = await getKwitansiTertunda();
      const updatedKwitansiTertunda = kwitansiTertunda.filter(
        (item) => item._id !== billId
      );

      await AsyncStorage.setItem(
        "kwitansiTertunda",
        JSON.stringify(updatedKwitansiTertunda)
      );

      if (Platform.OS === "android") {
        ToastAndroid.show("Kwitansi berhasil dihapus", ToastAndroid.SHORT);
      }
      return true;
    } catch (error) {
      console.error("Error deleting delayed receipt:", error);
      if (Platform.OS === "android") {
        ToastAndroid.show("Gagal menghapus kwitansi", ToastAndroid.SHORT);
      }
      return false;
    }
  };

  return {
    getKwitansiTertunda,
    simpanBillKeKirimKwitansiTertunda,
    kirimKwitansiTertudanDariEmail,
    kirimKwitansiTertudanDariWhatsapp,
    hapusKwitansiTertunda,
  };
};

export default useKwitansiTertunda;
