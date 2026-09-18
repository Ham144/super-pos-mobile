import {
  View,
  Text,
  ToastAndroid,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  useCurrentBill,
  useDebouceTime,
  useFiturEnabled,
  usePromoOffline,
} from "../store";
import { Delete, Gift, Pencil } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PilihInventoryModal from "./PilihInventoryModal";
import EditBonusQuantity from "./EditBonusQuantity";
import {
  filterVisibleInventories,
  loadRemovedInventorySkus,
} from "../utils/inventoryFilters";

export default function checkPromoOffline() {
  //zustand
  const { currentBill, promo, setPromo, done } = useCurrentBill();

  const { debounceTime } = useDebouceTime();

  const { promoEnabled } = useFiturEnabled();

  //state
  const [inventoryList, setInventoryList] = useState([]);
  const [pilihPromoShow, setPilihPromoShow] = useState(false);
  const [favoritesLength, setFavoriteLength] = useState(0);
  const [selectedSkuTemp, setSelectedSkuTemp] = useState();
  const [tempPromoEditing, setTempPromoEditing] = useState();
  const { promoOffline, setPromoOffline } = usePromoOffline();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState();

  const handleOpenPromoBonusModalChange = async (promoToChange) => {
    if (done) {
      return Alert?.alert("Transaksi sudah selesai");
    }
    try {
      setTempPromoEditing(promoToChange);
      const inventoriesOffline = filterVisibleInventories(
        JSON.parse(await AsyncStorage.getItem("inventories")),
        await loadRemovedInventorySkus(AsyncStorage)
      );
      const favoritesOfflineRaw = await AsyncStorage.getItem(
        "favoritedInventorySkus"
      );
      const favoritesOffline = favoritesOfflineRaw
        ? JSON.parse(favoritesOfflineRaw)
        : [];

      if (!inventoriesOffline || !inventoriesOffline.length) {
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Gagal mengambil inventoriesOffline",
            ToastAndroid.SHORT
          );
          return;
        }
        console.log("Gagal mengambil inventories");
        return;
      }
      //Sorting inventoriesOffline: items that are in favorites will appear at the top
      const sortedInventories = inventoriesOffline.sort((a, b) => {
        const isAFavorite = favoritesOffline?.includes(a.sku);
        const isBFavorite = favoritesOffline?.includes(b.sku);
        if (isAFavorite && !isBFavorite) return -1;
        if (!isAFavorite && isBFavorite) return 1;
        return 0;
      });
      setFavoriteLength(favoritesOffline?.length ?? 0);
      setInventoryList(sortedInventories);
      setPilihPromoShow(true);
    } catch (error) {
      console.log(error);
      if (Platform.OS === "android") {
        ToastAndroid.show("gagal mengambil libraryList", ToastAndroid.SHORT);
      }
    }
  };

  const closePilihPromo = () => {
    setPilihPromoShow(false);
    setInventoryList([]);
  };

  const handleGantiBarangBonus = (skuPengganti) => {
    if (!skuPengganti || !tempPromoEditing) return;

    if (!tempPromoEditing?.promoInfo) {
      console.log("Promo info belum tersedia");
      return;
    }

    const { promoId, kategori } = tempPromoEditing.promoInfo;

    const next = promo.map((p) => {
      if (
        p.promoInfo.promoId === promoId &&
        p.promoInfo.kategori === kategori
      ) {
        return {
          ...p,
          promoInfo: {
            ...p.promoInfo,
            skuBarangBonus: skuPengganti,
          },
        };
      }
      return p;
    });

    setPromo(next);
    setTempPromoEditing(null);
    setPilihPromoShow(false);
  };

  const applyPromoSimpleTotal = async (promoDB, items) => {
    // array hasil
    const updatedItems = [];

    // ambil custom map dari state “promo” sebelumnya
    const existingPromos = promo || [];
    const customBonusMap = new Map();
    const customQuantityMap = new Map();

    existingPromos.forEach((p) => {
      const id = p.promoInfo.promoId;
      const kategori = p.promoInfo.kategori; // “harga” atau “quantity”
      const key = `${id}-${kategori}`;

      if (p.promoInfo.skuBarangBonus) {
        customBonusMap.set(key, p.promoInfo.skuBarangBonus);
      }
      if (p.promoInfo.quantityBonus != null) {
        customQuantityMap.set(key, p.promoInfo.quantityBonus);
      }
    });

    // hitung total
    const now = new Date();
    const outletStr = await AsyncStorage.getItem("outlet");
    const myOutlet = outletStr ? JSON.parse(outletStr) : null;
    const totalQuantity = items.reduce((a, i) => a + i.quantity, 0);
    const totalRp = items.reduce((a, i) => a + i.totalRp, 0);

    // filter promo aktif & memenuhi syarat
    const applicable = promoDB.filter((pr) => {
      if (pr.authorizedOutlets?.length && !myOutlet) return false;
      if (
        pr.authorizedOutlets?.length &&
        !pr.authorizedOutlets.includes(myOutlet?._id)
      )
        return false;
      if (pr.berlakuDari && new Date(pr.berlakuDari) > now) return false;
      if (pr.berlakuHingga && new Date(pr.berlakuHingga) < now) return false;
      if (pr.syaratQuantity != null && totalQuantity < pr.syaratQuantity)
        return false;
      if (pr.syaratTotalRp != null && totalRp < pr.syaratTotalRp) return false;
      return true;
    });

    // pisah kategori
    const byHarga = applicable.filter((p) => p.syaratTotalRp != null);
    const byQty = applicable.filter((p) => p.syaratQuantity != null);

    // cari best
    const bestHarga = byHarga.reduce(
      (mx, p) => (!mx || p.syaratTotalRp > mx.syaratTotalRp ? p : mx),
      null
    );
    const bestQty = byQty.reduce(
      (mx, p) => (!mx || p.syaratQuantity > mx.syaratQuantity ? p : mx),
      null
    );

    // helper untuk push
    const pushPromo = (p, kategori) => {
      const key = `${p._id}-${kategori}`;
      const skuCustom = customBonusMap.get(key) ?? p.skuBarangBonus;
      const qtyCustom = customQuantityMap.get(key) ?? p.quantityBonus;

      updatedItems.push({
        ...p,
        promo: true,
        description:
          kategori === "harga"
            ? "Keseluruhan (best by price)"
            : "Keseluruhan (best by quantity)",
        promoInfo: {
          kategori,
          promoId: p._id,
          judulPromo: p.judulPromo,
          pesan: `Mendapatkan promo ${p.judulPromo}, sehingga mendapatkan bonus quantity ${qtyCustom}`,
          skuBarangBonus: skuCustom,
          quantityBonus: qtyCustom,
        },
      });
    };

    if (bestHarga) pushPromo(bestHarga, "harga");
    if (bestQty && bestQty._id !== bestHarga?._id)
      pushPromo(bestQty, "quantity");

    // deep‑clone agar no shared refs
    return updatedItems.map((it) => ({
      ...it,
      promoInfo: { ...it.promoInfo },
    }));
  };

  //items itu currentBill item, dan promoDB itu refrensi promo
  const applyPromoParticular = async (promoDB, items) => {
    const updatedItems = [];
    const now = new Date();

    const existingPromos = promo || [];
    const customBonusMap = new Map();
    const customQuantityMap = new Map();

    existingPromos.forEach((existingPromo) => {
      if (existingPromo.promoInfo?.skuBarangBonus) {
        customBonusMap.set(
          existingPromo.sku,
          existingPromo.promoInfo.skuBarangBonus
        );
      }
      if (existingPromo.promoInfo?.quantityBonus) {
        customQuantityMap.set(
          existingPromo.sku,
          existingPromo.promoInfo.quantityBonus
        );
      }
    });

    const outletStr = await AsyncStorage.getItem("outlet");
    const myOutlet = outletStr ? JSON.parse(outletStr) : null;

    for (const item of items) {
      const applicablePromos = promoDB.filter((promo) => {
        //jika ada filter outlet maka periksa
        if (
          Array.isArray(promo.authorizedOutlets) &&
          promo.authorizedOutlets.length > 0 &&
          (!myOutlet || !promo.authorizedOutlets.includes(myOutlet._id))
        ) {
          console.log("otoriasasi outlet untuk promo gagal");
          return false;
        }

        //jika ada filter sku maka periksa
        if (
          Array.isArray(promo.skuList) &&
          promo.skuList.length > 0 &&
          !promo.skuList.includes(item.sku)
        ) {
          console.log("pengecekan skuList tidak lulus");
          return false;
        }
        //cek kadaluarsa
        if (promo.berlakuDari && new Date(promo.berlakuDari) > now) {
          console.log("promo belum berlaku");
          return false;
        }
        if (promo.berlakuHingga && new Date(promo.berlakuHingga) < now) {
          console.log("promo sudah kadaluarsa");
          return false;
        }

        //cek ketersidiaan
        if (
          typeof promo.quantityBerlaku === "number" &&
          promo.quantityBerlaku <= 0
        ) {
          console.log("kuota promo telah habis");
          return false;
        }

        //cek syarat utama
        if (
          typeof promo.syaratQuantity === "number" &&
          item.quantity < promo.syaratQuantity
        ) {
          console.log("syarat quantity tidak terpenuhi");
          return false;
        }
        if (
          typeof promo.syaratTotalRp === "number" &&
          item.totalRp < promo.syaratTotalRp
        ) {
          console.log("syarat harga tidak terpenuhi");
          return false;
        }

        return true;
      });

      if (!applicablePromos.length) continue;

      const bestPromo = applicablePromos.reduce(
        (max, promo) => (promo.quantityBonus > max.quantityBonus ? promo : max),
        applicablePromos[0]
      );

      const customBonus = customBonusMap.get(item.sku);
      const customQuantity = customQuantityMap.get(item.sku);

      updatedItems.push({
        ...item,
        promo: true,
        promoInfo: {
          pesan: `Mendapatkan promo ${
            bestPromo.judulPromo
          }, sehingga mendapatkan bonus quantity ${
            customQuantity || bestPromo.quantityBonus
          }`,
          promoId: bestPromo._id,
          judulPromo: bestPromo.judulPromo,
          skuBarangBonus: customBonus || bestPromo.skuBarangBonus,
          quantityBonus: customQuantity || bestPromo.quantityBonus,
        },
      });
    }

    return updatedItems;
  };

  const fetchPromo = async () => {
    try {
      let promoDB = promoOffline;
      if (!promoDB?.length) {
        const promoStorage = JSON.parse(await AsyncStorage.getItem("promo"));
        if (!promoStorage) {
          return;
        }
        setPromoOffline(promoStorage);
        promoDB = promoStorage;
      }
      const promoParticularDB = promoDB.filter((promo) => {
        return promo.mode == "particular" || promo.mode == undefined;
      });
      const promoSimpleTotal = promoDB.filter((promo) => {
        return promo.mode == "simple_total";
      });

      const mergedPromoAnditsBonus = await applyPromoParticular(
        promoParticularDB,
        currentBill
      );

      const resultPromoSimpleTotal = await applyPromoSimpleTotal(
        promoSimpleTotal,
        currentBill
      );
      setPromo([...mergedPromoAnditsBonus, ...resultPromoSimpleTotal]);
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil promo:", error);
      ToastAndroid?.show("Terjadi kesalahan", ToastAndroid.SHORT);
    }
  };

  const debounceTimeout = useRef(null);
  useEffect(() => {
    if (!currentBill || !promoEnabled) return;

    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchPromo();
    }, debounceTime);

    return () => clearTimeout(debounceTimeout.current);
  }, [currentBill]);

  const handleSaveQuantity = (newQuantity) => {
    const updatedPromo = promo.map((p) => {
      const samePromo =
        p.promoInfo?.promoId === selectedPromo?.promoInfo?.promoId &&
        p.promoInfo?.kategori === selectedPromo?.promoInfo?.kategori;

      if (samePromo) {
        return {
          ...p,
          promoInfo: {
            ...p.promoInfo,
            quantityBonus: newQuantity,
          },
        };
      }
      return p;
    });

    setPromo(updatedPromo);
    setShowEditModal(false);
  };

  const handleDeletePromoCurrentBill = (promToDeleteArr) => {
    if (done) return Alert?.alert("Transaksi sudah selesai");
    const updatedPromo = promo.filter((p) => !promToDeleteArr.includes(p._id));
    setPromo(updatedPromo);
    setShowEditModal(false);
  };


  return (
    <>
      {promoEnabled && promo?.length > 0 ? (
        <View className="py-1">
          <Text className="text-xs text-gray-500 font-bold font-aldrich mb-1">
            Fitur Promo(Active)
          </Text>
          <View>
            {promo.map((prom, index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-1 border-b border-gray-100"
              >
                <View className="flex-1 flex-row gap-x-2">
                  <Text className="text-xs text-gray-500 font-aldrich">
                    {prom?.description || ""}
                  </Text>
                </View>

                <View className="flex-row items-center w-1/2 justify-end gap-x-2">
                  <Text className="text-xs text-gray-500 font-aldrich mr-2">
                    {prom?.promoInfo?.judulPromo || ""}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (done) {
                        Alert.alert(
                          "Transaksi sudah selesai",
                          ToastAndroid.SHORT
                        );
                        return;
                      }
                      setSelectedPromo(prom);
                      setShowEditModal(true);
                    }}
                    className="flex-row items-center gap-x-2 bg-green-500 text-white px-2 py-1 rounded-full"
                  >
                    <Pencil size={14} color="white" />
                    <Text className="text-xs text-white">
                      {prom.promoInfo?.quantityBonus || "no set"} x
                    </Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-x-1">
                    <Gift size={12} color={"green"} />

                    <TouchableOpacity
                      onPress={() => handleOpenPromoBonusModalChange(prom)}
                    >
                      <Text className="text-xs font-extrabold underline font-aldrich text-blue-600">
                        {prom.promoInfo?.skuBarangBonus}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeletePromoCurrentBill([prom._id])}
                  >
                    <Text>
                      <Delete size={23} color="red" />
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <PilihInventoryModal
        visible={pilihPromoShow}
        setVisible={setPilihPromoShow}
        onClose={closePilihPromo}
        inventoryList={inventoryList}
        favoritesLength={favoritesLength}
        handleGantiBarangBonus={handleGantiBarangBonus}
        setSelectedSkuTemp={setSelectedSkuTemp}
        tempPromoEditing={tempPromoEditing}
        setTempPromoEditing={setTempPromoEditing}
      />
      <EditBonusQuantity
        isVisible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveQuantity}
        selectedPromo={selectedPromo}
        setSelectedPromo={setSelectedPromo}
      />
    </>
  );
}
