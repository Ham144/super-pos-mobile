import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import {
  useCurrentBill,
  useDebouceTime,
  useFiturEnabled,
  useVoucherOffline,
} from "../store";
import { View, Text, Platform } from "react-native";
import { TicketPercent } from "lucide-react-native";
import { environment } from "../constant";

// Voucher redeem is online-only; mobile only creates/applies future voucher matches offline.
const VoucherOfflineCreationOnly = () => {
  const { currentBill, futureVoucher, setFutureVoucher } = useCurrentBill();
  const { voucherOffline, setVoucherOffline } = useVoucherOffline();
  const { debounceTime } = useDebouceTime();
  const { futureVoucherEnabled } = useFiturEnabled();

  const applyVoucherToItems = async (voucherDB, items) => {
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        let voucher = null;

        const MultiMatch = voucherDB.filter((vouch) => {
          if (!vouch?.skuList?.includes(item?.sku)) {
            return false;
          }
          if (
            new Date(vouch?.berlakuDari) > new Date() ||
            new Date(vouch?.berlakuHingga) < new Date()
          ) {
            return false;
          }
          if (vouch?.tipeSyarat == "quantity") {
            if (vouch?.minimalPembelianQuantity > item?.quantity) {
              return false;
            }
          }
          if (vouch?.tipeSyarat == "totalRp") {
            if (item?.totalRp < vouch?.minimalPembelianTotalRp) {
              return false;
            }
          }
          if (vouch?.quantityTersedia < 1) {
            return false;
          }
          return true;
        });

        if (!MultiMatch?.length) {
          return null;
        }

        if (MultiMatch.length > 1) {
          let palingUntung = 0;
          let palingUntungVoucher = null;

          for (const candidate of MultiMatch) {
            const rupiah = candidate?.potongan;
            if (rupiah > palingUntung) {
              palingUntung = rupiah;
              palingUntungVoucher = candidate;
            }
          }
          voucher = palingUntungVoucher;
        } else if (MultiMatch?.length == 1) {
          voucher = MultiMatch[0];
        }

        if (voucher) {
          return {
            ...item,
            voucher: true,
            voucherInfo: {
              voucherId: voucher?._id,
              tipe: voucher?.tipe,
              judulVoucher: voucher?.judulVoucher,
              potongan: voucher?.potongan,
              berlakuDari: voucher?.berlakuDari,
              berlakuHingga: voucher?.berlakuHingga,
              minimalPembelianQuantity: voucher?.minimalPembelianQuantity,
              minimalPembelianTotalRp: voucher?.minimalPembelianTotalRp,
              quantityTersedia: voucher?.quantityTersedia,
            },
          };
        }
        return null;
      })
    );

    return updatedItems.filter((item) => item !== null);
  };

  const fetchVoucherFilter = async () => {
    let voucherDB = voucherOffline;

    try {
      if (voucherDB?.length) {
        const processesedItems = await applyVoucherToItems(
          voucherDB,
          currentBill
        );
        setFutureVoucher(processesedItems);
      } else {
        const voucherStorage = JSON.parse(
          await AsyncStorage.getItem("voucher")
        );
        if (!voucherStorage) {
          if (Platform.OS == "android") return;
        } else {
          setVoucherOffline(voucherStorage);
          const processesedItems = await applyVoucherToItems(
            voucherDB,
            currentBill
          );
          setFutureVoucher(processesedItems);
        }
      }
    } catch (error) {
      if (environment == "production") return;
      else {
        console.log("gagal mengambil voucher dari local, coba sync");
      }
    }
  };

  const debounceTimeout = useRef(null);
  useEffect(() => {
    if (!currentBill || !futureVoucherEnabled) return;
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchVoucherFilter();
    }, debounceTime);
    return () => clearTimeout(debounceTimeout.current);
  }, [currentBill, futureVoucherEnabled]);

  if (!futureVoucherEnabled || !futureVoucher?.length) return null;

  return (
    <View className="py-1">
      <Text className="text-xs text-gray-500 font-bold font-aldrich mb-1">
        Fitur Future Voucher (Active)
      </Text>
      <View className="w-full">
        {futureVoucher.map((vouch, index) => (
          <View key={index} className="flex flex-col w-full py-1 border-b border-gray-100">
            <View className="flex-row justify-between w-full gap-x-3 items-center">
              <Text className="text-xs text-gray-500 font-aldrich flex-1">
                {vouch?.description}
              </Text>
              <View className="flex-row items-center gap-x-2">
                <Text className="text-xs text-gray-500 font-aldrich">
                  {vouch?.voucherInfo?.judulVoucher || "Voucher tidak berjudul"}
                </Text>
                <TicketPercent size={13} color={"green"} />
                <Text className="font-aldrich text-xs">
                  {Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(vouch?.voucherInfo?.potongan)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default VoucherOfflineCreationOnly;
