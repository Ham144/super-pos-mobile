import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCurrentBill,
  useDebouceTime,
  useDiskonOffline,
  useFiturEnabled,
} from "../store";
import { View, Text, ToastAndroid, Alert } from "react-native";
import { Scissors } from "lucide-react-native";
import { environment } from "../constant";

const CheckDiskonOffline = () => {
  const { currentBill, diskon, setDiskon } = useCurrentBill();
  const { diskonOffline, setDiskonOffline } = useDiskonOffline();
  const [diskonCache, setDiskonCache] = useState(new Map());
  const { diskonEnabled } = useFiturEnabled();
  const { debounceTime } = useDebouceTime();

  //diskonDB jadi map untuk pencarian lebih cepat
  const diskonMap = useMemo(() => {
    const map = new Map();
    diskonOffline.forEach((diskon) => {
      diskon.skuTanpaSyarat?.forEach((sku) => {
        if (!map.has(sku)) map.set(sku, []);
        map.get(sku).push(diskon);
      });
    });
    return map;
  }, [diskonOffline]);

  const applyDiskonToItems = async (diskonDB, items) => {
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        // Cek apakah sudah ada di cache
        let diskon = null;
        if (diskonCache.has(item.sku)) return diskonCache.get(item.sku);

        const MultidiskonDB = diskonMap.get(item.sku) || [];
        if (!MultidiskonDB.length) return null;

        let palingUntung = 0;
        let palingUntungDiskon = null;
        let rupiah;

        for (const diskon of MultidiskonDB) {
          if (
            (diskon?.berlakuDari &&
              new Date(diskon.berlakuDari) > new Date()) ||
            (diskon?.berlakuHingga &&
              new Date(diskon.berlakuHingga) < new Date()) ||
            diskon?.quantityTersedia === 0
          )
            continue;

          rupiah = diskon?.percentPotonganHarga?.$numberDecimal
            ? item.totalRp * diskon.percentPotonganHarga?.$numberDecimal
            : diskon?.RpPotonganHarga?.$numberDecimal;

          if (rupiah > palingUntung) {
            palingUntung = rupiah;
            palingUntungDiskon = diskon;
          }
        }

        if (palingUntungDiskon) {
          diskon = {
            RpHargaDasar: item.RpHargaDasar,
            description: item?.description,
            diskon: true,
            diskonInfo: {
              RpPotonganHarga: palingUntung,
              description: palingUntungDiskon.description,
              diskonId: palingUntungDiskon._id,
              judulDiskon: palingUntungDiskon.judulDiskon,
            },
            limitQuantity: palingUntungDiskon?.quantityTersedia,
            sku: item?.sku,
            totalRp: item?.totalRp,
          };

          // Simpan hasil dalam cache
          diskonCache.set(item.sku, diskon);
        }

        return diskon;
      })
    );

    setDiskonCache(new Map(diskonCache)); // Update cache
    return updatedItems.filter((item) => item !== null);
  };

  const fetchDiskon = async () => {
    let diskonDB = diskonOffline;
    try {
      // Memeriksa apakah ada data di local storage
      if (diskonDB?.length) {
        const processesedItems = await applyDiskonToItems(
          diskonDB,
          currentBill
        );
        setDiskon(processesedItems);
      } else {
        const diskonStorage = JSON.parse(await AsyncStorage.getItem("diskon"));
        if (!diskonStorage) {
          if(environment == "production") return;
          else {
            console.log("gagal mengambil diskon dari local, coba sync ulang");
          }
        } else {
          setDiskonOffline(diskonStorage);
          const processesedItems = await applyDiskonToItems(
            diskonDB,
            currentBill
          );
          setDiskon(processesedItems);
        }
      }
    } catch (error) {
      console.log(error);
      if(environment == "production") return;
      else {
        console.log("gagal mengambil diskon dari local, coba sync");
      }
    }
  };

  const debounceTimeout = useRef(null);
  useEffect(() => {
    if (!currentBill || !diskonEnabled) return;

    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchDiskon();
    }, debounceTime);

    return () => clearTimeout(debounceTimeout.current);
  }, [currentBill, diskonEnabled]);

  // Logic always runs; UI only when there is something to show
  if (!diskonEnabled || !diskon?.length) return null;

  return (
    <View className="py-1">
      <Text className="text-xs text-gray-500 font-bold font-aldrich mb-1">
        Fitur Diskon (Aktif)
      </Text>
      <View>
        {diskon.map((dis, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center py-1 border-b border-gray-100"
            >
              <View className="flex-1 flex-row gap-x-2">
                <Text className="text-xs text-gray-500 font-aldrich">
                  {dis?.description || ""}
                </Text>
              </View>
              <View className="flex-row items-center justify-end">
                <Text className="text-xs text-gray-500 font-aldrich mr-2">
                  {dis?.diskonInfo?.judulDiskon || ""}
                </Text>
                <View className="flex-row items-center gap-x-1">
                  <Scissors size={12} color={"green"} />
                  <Text className="text-xs font-aldrich">
                    {Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(dis?.diskonInfo?.RpPotonganHarga)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
      </View>
    </View>
  );
};

export default CheckDiskonOffline;
