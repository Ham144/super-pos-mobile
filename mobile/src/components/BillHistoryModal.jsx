import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCheck, Info, MousePointer2, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
} from "react-native";
import { useCurrentBill, useOutlet } from "../store";
import {
  filterBillsForOutlet,
} from "../utils/reconcileOutletSession";

const BillHistoryModal = ({
  allBillTersimpan,
  isShowBillTersimpan,
  setIsShowBillTersimpan,
  handlePickSavedBill,
}) => {
  const [activeTab, setActiveTab] = useState("BillTersimpan"); // BillDibatalkan | ProdukDibatalkan
  const [allBillTersimpanState, setAllBillTersimpanState] = useState();
  const [searchQuery, setSearchQuery] = useState("");
  const [kwitansiTertunda, setKwitansiTertunda] = useState([]);

  //zustand
  const clearSale = useCurrentBill((state) => state.clearSale);
  const { outlet } = useOutlet();
  const kodeOutlet = outlet?.kodeOutlet;

  const handleDeleteBillOffline = async (_id) => {
    try {
      const billsOffline = JSON.parse(await AsyncStorage.getItem("bills"));

      // Update bill dengan menambahkan isDeleted: true
      const updatedBills = billsOffline?.map((bill) => {
        if (bill._id === _id) {
          return {
            ...bill,
            isDeleted: true,
            isChanged: true, // Add isChanged flag to ensure it's synced with server
          };
        }
        return bill;
      });

      await AsyncStorage.setItem("bills", JSON.stringify(updatedBills));

      const scopedBills = filterBillsForOutlet(updatedBills || [], kodeOutlet);
      const sortedBills = [...scopedBills].sort((a, b) => {
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

      setAllBillTersimpanState(sortedBills);

      if (Platform.OS === "android") {
        ToastAndroid.show("Bill berhasil dihapus", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat menghapus bill dari AsyncStorage:",
        error
      );
      if (Platform.OS === "android") {
        ToastAndroid.show("Gagal menghapus bill", ToastAndroid.SHORT);
      }
    }
  };
  const [spgList, setSpgList] = useState([]);

  useEffect(() => {
    setAllBillTersimpanState(
      filterBillsForOutlet(allBillTersimpan || [], kodeOutlet)
    );

    const fetchingSpgFromOffline = async () => {
      try {
        const spgData = await AsyncStorage.getItem("spg");
        if (!spgData) {
          console.log("No SPG data found in AsyncStorage");
          return setSpgList([]);
        }

        const parsedData = JSON.parse(spgData);
        console.log(
          "SPG data loaded successfully:",
          parsedData?.length || 0,
          "items"
        );

        if (Array.isArray(parsedData)) {
          setSpgList(parsedData);
        } else {
          console.log("SPG data is not an array:", typeof parsedData);
          setSpgList([]);
        }
      } catch (error) {
        console.error("Error loading SPG data:", error);
        setSpgList([]);
      }
    };

    const fetchKwitansiTertunda = async () => {
      try {
        const billsData = await AsyncStorage.getItem("bills");
        if (billsData) {
          const parsedData = JSON.parse(billsData);
          const pendingReceipts = filterBillsForOutlet(
            parsedData,
            kodeOutlet
          ).filter(
            (bill) =>
              bill.done === true &&
              bill.isPrintedKwitansi === false &&
              !bill.isDeleted
          );
          setKwitansiTertunda(pendingReceipts);
        } else {
          setKwitansiTertunda([]);
        }
      } catch (error) {
        console.error("Error loading pending receipts:", error);
        setKwitansiTertunda([]);
      }
    };

    fetchingSpgFromOffline();
    fetchKwitansiTertunda();
  }, [allBillTersimpan, kodeOutlet]);

  // Filter bill berdasarkan query pencarian
  const filteredBillTersimpan = allBillTersimpanState
    ? allBillTersimpanState.filter((bill) => {
        const searchLower = searchQuery.toLowerCase();
        // Filter bill yang tidak dibatalkan (isVoid != true) dan tidak dihapus (isDeleted != true)
        return (
          !bill.isVoid &&
          !bill.isDeleted && // Tambahkan filter untuk isDeleted
          (bill.kodeInvoice?.toLowerCase().includes(searchLower) ||
            bill._id.toLowerCase().includes(searchLower) ||
            (bill.salesPerson &&
              bill.salesPerson.toLowerCase().includes(searchLower)) ||
            (bill.spg &&
              spgList
                ?.find((spg) => spg?._id === bill?.spg?._id)
                ?.name?.toLowerCase()
                .includes(searchLower)))
        );
      })
    : [];

  // Tambahkan filter untuk bill yang dihapus
  const filteredBillDeleted = allBillTersimpanState
    ? allBillTersimpanState.filter((bill) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          bill.isDeleted === true &&
          (bill.kodeInvoice?.toLowerCase().includes(searchLower) ||
            (bill.salesPerson &&
              bill.salesPerson.toLowerCase().includes(searchLower)) ||
            (bill.spg &&
              spgList
                ?.find((spg) => spg?._id === bill?.spg?._id)
                ?.name?.toLowerCase()
                .includes(searchLower)))
        );
      })
    : [];

  const filteredBillVoid = allBillTersimpanState
    ? allBillTersimpanState.filter((bill) => {
        const searchLower = searchQuery.toLowerCase();
        // Filter bill yang dibatalkan (isVoid == true)
        return (
          bill.isVoid === true &&
          (bill.kodeInvoice?.toLowerCase().includes(searchLower) ||
            (bill.salesPerson &&
              bill.salesPerson.toLowerCase().includes(searchLower)) ||
            (bill.spg &&
              spgList
                ?.find((spg) => spg?._id === bill?.spg?._id)
                ?.name?.toLowerCase()
                .includes(searchLower)))
        );
      })
    : [];

  // Filter kwitansi tertunda berdasarkan query pencarian
  const filteredKwitansiTertunda = kwitansiTertunda.filter((kwitansi) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      kwitansi.kodeInvoice?.toLowerCase().includes(searchLower) ||
      (kwitansi.customer?.name &&
        kwitansi.customer.name.toLowerCase().includes(searchLower)) ||
      (kwitansi.customer?.email &&
        kwitansi.customer.email.toLowerCase().includes(searchLower)) ||
      (kwitansi.customer?.phone &&
        kwitansi.customer.phone.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isShowBillTersimpan}
    >
      {/* Dark background overlay */}
      <View style={Styles.ModalOverlay}>
        {/* Modal content */}
        <View style={[Styles.ModalContent, { height: "85vh", flex: 1 }]}>
          {/* Header Section */}
          <View style={Styles.header}>
            {/* Close Button */}
            <TouchableOpacity
              hitSlop={20}
              onPress={() => setIsShowBillTersimpan(false)}
              style={{
                backgroundColor: "#6D6D6D",
                paddingVertical: 10,
                borderRadius: 8,
                alignSelf: "center",
                marginTop: 16,
                padding: 20,
              }}
            >
              <Text style={{ color: "white" }}>Tutup</Text>
            </TouchableOpacity>

            {/* Modal Title */}
            <Text
              style={{ fontSize: 18, fontWeight: "600", marginVertical: 8 }}
            >
              Daftar Bill
            </Text>

            {/* Bill Baru Button */}
            <TouchableOpacity
              style={Styles.billBaru}
              onPress={() => {
                clearSale();
                setIsShowBillTersimpan(false);
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Bill Baru
              </Text>
            </TouchableOpacity>
          </View>
          {/* Tab Bar */}
          <View style={Styles.tabBar}>
            {["BillTersimpan", "BillVoid", "KwitansiTertunda"]?.map(
              (tab, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: activeTab === tab ? "#A7C7E7" : "#F2F2F2",
                    alignItems: "center",
                  }}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={{ color: activeTab === tab ? "#2A4B8D" : "#6D6D6D" }}
                  >
                    {tab === "BillTersimpan"
                      ? "Bill Tersimpan"
                      : tab === "BillVoid"
                      ? "Bill Void"
                      : "Kwitansi Tertunda"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
          {/* Search Input */}
          <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
            <TextInput
              placeholder="Cari Bill..."
              style={{
                backgroundColor: "#F5F5F5",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                fontSize: 14,
              }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
          {activeTab === "BillTersimpan" && (
            <ScrollView>
              {/* Header Row */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#F0F0F0",
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                {[
                  "Kode Invoice",
                  "Item",
                  "Sales",
                  "SPG",
                  "Ext doc",
                  "Total",
                  "Printed Billing",
                  "Paid(done)",
                  "Sync",
                  "Action",
                ]?.map((title, index) => (
                  <Text
                    key={index}
                    style={{
                      flex: 1,
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#333",
                      textAlignVertical: "center", // Ensures vertical alignment
                      fontFamily: "gilroyBold",
                    }}
                  >
                    {title}
                  </Text>
                ))}
              </View>

              {/* Bill List */}
              <ScrollView>
                {!allBillTersimpanState ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#6D6D6D",
                      paddingVertical: 20,
                      fontFamily: "gilroyRegular",
                    }}
                  >
                    Belum Ada Bill Tersimpan
                  </Text>
                ) : filteredBillTersimpan.length > 0 ||
                  filteredBillDeleted.length > 0 ? (
                  <>
                    {/* Tampilkan bill yang tidak dihapus */}
                    {filteredBillTersimpan?.map((bill, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          backgroundColor:
                            index % 2 === 0 ? "#F9F9F9" : "#F0F0F0",
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          paddingRight: 30,
                          borderRadius: 8,
                          marginBottom: 10,
                          alignItems: "center",
                          height: 50,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill.kodeInvoice}
                        </Text>

                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill.currentBill.length}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill.salesPerson ? bill.salesPerson : "not set"}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {(() => {
                            if (!bill?.spg) return "not set";
                            if (!spgList || spgList.length === 0)
                              return "loading...";

                            const spgId =
                              typeof bill.spg === "object"
                                ? bill.spg._id
                                : bill.spg;
                            const foundSpg = spgList.find(
                              (s) => s._id === spgId
                            );

                            return foundSpg?.name || `bukan SPG MyOutlet`;
                          })()}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill._id}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill.total?.$numberDecimal
                            ? bill?.total?.$numberDecimal
                            : bill.total}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill.isPrintedCustomerBilling ? (
                            <CheckCheck size={20} color={"green"} />
                          ) : (
                            <Info size={20} color={"grey"} />
                          )}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill?.done ? (
                            <CheckCheck size={20} color={"green"} />
                          ) : (
                            <Info size={20} color={"grey"} />
                          )}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontFamily: "gilroyRegular",
                          }}
                        >
                          {bill?.sync ? (
                            <CheckCheck size={20} color={"green"} />
                          ) : (
                            <Info size={20} color={"grey"} />
                          )}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                            justifyContent: "center",
                            gap: 12,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => handlePickSavedBill(bill._id)}
                          >
                            <Text style={{ color: "#6D6D6D" }}>
                              <MousePointer2 color="#6D6D6D" size={30} />
                            </Text>
                          </TouchableOpacity>
                          <Text>
                            {!bill?.done && (
                              <TouchableOpacity
                                onPress={() =>
                                  Platform.OS === "android"
                                    ? Alert.alert(
                                        "Membatalkan Transaksi ini? ",
                                        "Transaksi ini tidak akan sync ke DB",
                                        [
                                          { text: "Batal", style: "cancel" },
                                          {
                                            text: "Hapus",
                                            onPress: () =>
                                              handleDeleteBillOffline(bill._id),
                                          },
                                        ]
                                      )
                                    : handleDeleteBillOffline(bill._id)
                                }
                              >
                                <Text style={{ color: "#6D6D6D" }}>
                                  <Trash2 color="#6D6D6D" size={30} />
                                </Text>
                              </TouchableOpacity>
                            )}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Tampilkan bill yang dihapus */}
                    {filteredBillDeleted.length > 0 && (
                      <>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: "#FF0000",
                            marginVertical: 10,
                            paddingHorizontal: 10,
                          }}
                        >
                          Bill yang Dihapus
                        </Text>
                        {filteredBillDeleted.map((bill, index) => (
                          <View
                            key={index}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              backgroundColor: "#FFE6E6", // Warna merah muda untuk bill yang dihapus
                              paddingVertical: 10,
                              paddingHorizontal: 10,
                              paddingRight: 30,
                              borderRadius: 8,
                              marginBottom: 10,
                              alignItems: "center",
                              height: 50,
                            }}
                          >
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {bill.kodeInvoice}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {bill.currentBill.length}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {bill.salesPerson ? bill.salesPerson : "not set"}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {(() => {
                                // Debug para el primer elemento (para no sobrecargar la consola)

                                // Manejo más robusto del SPG
                                if (!bill?.spg) return "not set";
                                if (!spgList || spgList.length === 0)
                                  return "loading...";

                                // El SPG puede estar como objeto completo o solo como ID
                                const spgId =
                                  typeof bill.spg === "object"
                                    ? bill.spg._id
                                    : bill.spg;
                                const foundSpg = spgList.find(
                                  (s) => s._id === spgId
                                );

                                return (
                                  foundSpg?.name ||
                                  `not found (${spgId?.substring(0, 5)}...)`
                                );
                              })()}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {bill.total?.$numberDecimal
                                ? bill?.total?.$numberDecimal
                                : bill.total}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                textAlign: "center",
                                fontFamily: "gilroyRegular",
                              }}
                            >
                              {bill?.done ? (
                                <CheckCheck size={20} color={"green"} />
                              ) : (
                                <Info size={20} color={"grey"} />
                              )}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#6D6D6D",
                      paddingVertical: 20,
                    }}
                  >
                    {searchQuery
                      ? "Tidak ada hasil pencarian"
                      : "Tidak ada data Bill"}
                  </Text>
                )}
              </ScrollView>
            </ScrollView>
          )}

          {/* Bill Void */}
          {activeTab === "BillVoid" && (
            <ScrollView>
              {/* Header Row */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#F0F0F0",
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                {[
                  "Kode Invoice",
                  "Item",
                  "Sales",
                  "SPG",
                  "Total",
                  "Paid(done)",
                ].map((title, index) => (
                  <Text
                    key={index}
                    style={{
                      flex: 1,
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#333",
                      textAlignVertical: "center",
                      fontFamily: "gilroyRegular",
                    }}
                  >
                    {title}
                  </Text>
                ))}
              </View>

              {/* Bill List */}
              <ScrollView>
                {!allBillTersimpanState ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#6D6D6D",
                      paddingVertical: 20,
                      fontFamily: "gilroyRegular",
                    }}
                  >
                    Belum Ada Bill Void
                  </Text>
                ) : filteredBillVoid.length > 0 ? (
                  filteredBillVoid.map((bill, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor:
                          index % 2 === 0 ? "#F9F9F9" : "#F0F0F0",
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        marginBottom: 10,
                        alignItems: "center",
                        height: 50,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {bill.kodeInvoice}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {bill.currentBill.length}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {bill.salesPerson ? bill.salesPerson : "not set"}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {(() => {
                          // Debug para el primer elemento (para no sobrecargar la consola)

                          // Manejo más robusto del SPG
                          if (!bill?.spg) return "not set";
                          if (!spgList || spgList.length === 0)
                            return "loading...";

                          // El SPG puede estar como objeto completo o solo como ID
                          const spgId =
                            typeof bill.spg === "object"
                              ? bill.spg._id
                              : bill.spg;
                          const foundSpg = spgList.find((s) => s._id === spgId);

                          return (
                            foundSpg?.name ||
                            `not found (${spgId?.substring(0, 5)}...)`
                          );
                        })()}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {bill.total?.$numberDecimal
                          ? bill?.total?.$numberDecimal
                          : bill.total}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {bill?.done ? (
                          <CheckCheck size={20} color={"green"} />
                        ) : (
                          <Info size={20} color={"grey"} />
                        )}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#6D6D6D",
                      paddingVertical: 20,
                    }}
                  >
                    {searchQuery
                      ? "Tidak ada hasil pencarian"
                      : "Tidak ada data Bill Void"}
                  </Text>
                )}
              </ScrollView>
            </ScrollView>
          )}
          {/* Kwitansi Tertunda  */}
          {activeTab === "KwitansiTertunda" && (
            <ScrollView style={{ flex: 1 }}>
              {!kwitansiTertunda || kwitansiTertunda.length === 0 ? (
                <Text className="text-center font-gilroyRegular font-bold text-gray-500">
                  Belum Ada Kwitansi Pengiriman Tertunda
                </Text>
              ) : filteredKwitansiTertunda.length > 0 ? (
                <>
                  {/* Header Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      backgroundColor: "#F0F0F0",
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      marginBottom: 10,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {[
                      "Kode Invoice",
                      "Customer",
                      "Total",
                      "Tanggal",
                      "Status",
                    ].map((title, index) => (
                      <Text
                        key={index}
                        style={{
                          flex: 1,
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#333",
                          textAlignVertical: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {title}
                      </Text>
                    ))}
                  </View>

                  {/* Kwitansi List */}
                  {filteredKwitansiTertunda.map((kwitansi, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor:
                          index % 2 === 0 ? "#F9F9F9" : "#F0F0F0",
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        marginBottom: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {kwitansi.kodeInvoice}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {kwitansi.customer?.name || "N/A"}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {kwitansi.total?.$numberDecimal ||
                          kwitansi.total ||
                          "N/A"}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {new Date(kwitansi.createdAt).toLocaleDateString() ||
                          "N/A"}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "gilroyRegular",
                        }}
                      >
                        {kwitansi.done ? "Paid" : "Unpaid"}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text
                  style={{
                    textAlign: "center",
                    color: "#9E9E9E",
                    paddingVertical: 16,
                    fontFamily: "Aldrich",
                  }}
                >
                  {searchQuery
                    ? "Tidak ada hasil pencarian"
                    : "Tidak ada data Kwitansi Tertunda"}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BillHistoryModal;

const Styles = StyleSheet.create({
  ModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    fontFamily: "gilroyRegular",
  },
  ModalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    minWidth: 1000,
  },

  billBaru: {
    backgroundColor: "#2A4B8D",
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 16,
    padding: 20,
  },
  header: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },

  ModalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  tabBarItem: {
    flex: 1,
    paddingVertical: 8,
    textAlign: "center",
  },
  activeTab: {
    color: "#2A4B8D",
  },
});
