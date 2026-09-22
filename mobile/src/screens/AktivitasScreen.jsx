import {
  SquareChevronRight,
  Calendar,
  TrendingUp,
  Filter,
  X,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  AppState,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DrawerActions } from "@react-navigation/native";
import SettlementPrint from "../components/SettlementPrint";
import { useOnlineSync } from "../hooks/useOnlineSync";
import { endOfDayBySku, voidBillStateless } from "../api";
import { useOutlet } from "../store";
import { filterBillsForOutlet } from "../utils/reconcileOutletSession";

const AktivitasScreen = ({ navigation }) => {
  const { outlet } = useOutlet();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState({
    totalPendapatan: 0,
    totalTerjual: 0,
    totalTransaksi: 0,
    belumBayar: 0,
    today: "",
  });
  const [filterStatus, setFilterStatus] = useState("all"); // all, done, pending, void, requestingVoid
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState("start"); // 'start' or 'end'
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().toISOString().split("T")[0]),
    endDate: new Date(new Date().toISOString().split("T")[0]),
  });
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const { handleSinkronisasi } = useOnlineSync();

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const billsData = await AsyncStorage.getItem("bills");

      if (billsData) {
        const parsedBills = filterBillsForOutlet(
          JSON.parse(billsData),
          outlet?.kodeOutlet
        );
        // Sort by createdAt in descending order (newest first)
        const sortedBills = parsedBills.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        setTransactions(sortedBills);

        // Apply initial filter
        applyFilter(sortedBills, filterStatus);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, outlet?.kodeOutlet]);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadTransactions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadTransactions]);

  // Initial load and setup listener
  useEffect(() => {
    loadTransactions();

    // Set up interval to refresh data every 120 seconds
    const intervalId = setInterval(() => {
      loadTransactions();
    }, 120000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const applyFilter = (bills, status) => {
    let filtered = [...bills];

    // Apply status filter
    if (status === "done") {
      filtered = filtered.filter((bill) => bill.done && !bill.isVoid);
    } else if (status === "pending") {
      filtered = filtered.filter((bill) => !bill.done && !bill.isVoid);
    } else if (status === "void") {
      filtered = filtered.filter((bill) => bill.isVoid);
    } else if (status === "requestingVoid") {
      filtered = filtered.filter((bill) => bill.requestingVoid);
    }

    // Apply date filter
    if (dateFilter.startDate && dateFilter.endDate) {
      const startDateObj = new Date(dateFilter.startDate);
      startDateObj.setHours(0, 0, 0, 0);

      const endDateObj = new Date(dateFilter.endDate);
      endDateObj.setHours(23, 59, 59, 999);

      filtered = filtered.filter((bill) => {
        try {
          // Gunakan tanggalBayar untuk transaksi yang sudah bayar
          const dateField =
            bill.done && bill.tanggalBayar ? bill.tanggalBayar : bill.createdAt;
          const billDate = new Date(dateField);
          return billDate >= startDateObj && billDate <= endDateObj;
        } catch (error) {
          return false;
        }
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerType === "start") {
        // Jika start date lebih besar dari end date, reset end date
        if (dateFilter.endDate && selectedDate > dateFilter.endDate) {
          setDateFilter({
            startDate: selectedDate,
            endDate: null,
          });
        } else {
          setDateFilter((prev) => ({
            ...prev,
            startDate: selectedDate,
          }));
        }
      } else {
        // Jika end date lebih kecil dari start date, reset start date
        if (dateFilter.startDate && selectedDate < dateFilter.startDate) {
          setDateFilter({
            startDate: null,
            endDate: selectedDate,
          });
        } else {
          setDateFilter((prev) => ({
            ...prev,
            endDate: selectedDate,
          }));
        }
      }
    }
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: null,
      endDate: null,
    });
    applyFilter(transactions, filterStatus);
  };

  const applyDateFilter = () => {
    applyFilter(transactions, filterStatus);
    setShowDateFilterModal(false);
  };

  useEffect(() => {
    applyFilter(transactions, filterStatus);
  }, [filterStatus, transactions, dateFilter]);

  // Efek untuk menghitung statistik berdasarkan filteredTransactions
  useEffect(() => {
    if (filteredTransactions.length > 0) {
      // Hitung total pendapatan dari transaksi yang sudah selesai
      const totalPendapatan = filteredTransactions
        .filter((bill) => bill.done)
        .reduce((sum, bill) => {
          const billTotal = Number(bill.total) || 0;
          return sum + billTotal;
        }, 0);

      // Hitung total item terjual
      const totalItems = filteredTransactions
        .filter((bill) => bill.done)
        .flatMap((bill) => bill.currentBill || [])
        .reduce((sum, item) => {
          const quantity = Number(item.quantity) || 0;
          return sum + quantity;
        }, 0);

      // Hitung berbagai statistik
      const totalTransaksi = filteredTransactions.length;
      const belumBayar = filteredTransactions.filter(
        (bill) => !bill.done,
      ).length;
      const dibatalkan = filteredTransactions.filter(
        (bill) => bill.isVoid,
      ).length;

      // Update statsData
      setStatsData({
        totalPendapatan,
        totalTerjual: totalItems,
        totalTransaksi,
        belumBayar,
        dibatalkan,
        today: new Date().toISOString().split("T")[0],
      });
    }
  }, [filteredTransactions]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTransactionItem = ({ item }) => {
    const totalItems = item.currentBill.reduce(
      (sum, product) => sum + product.quantity,
      0,
    );

    let statusColor = "bg-gray-100 text-gray-700";
    let statusText = "Belum Bayar";

    if (item.isVoid) {
      statusColor = "bg-red-100 text-red-700";
      statusText = "Void";
    } else if (item.requestingVoid) {
      statusColor = "bg-orange-100 text-orange-700";
      statusText = "Requesting Void";
    } else if (item.done) {
      statusColor = "bg-green-100 text-green-700";
      statusText = "Lunas";
    }

    const handleToggleRequestingVoid = async (id) => {
      // Stateless: void goes to NAV (GetSalesShipmentLines → WsUndoShipment), not syncMobileRoute
      if (outlet?.mode === "stateless") {
        Alert.alert(
          "Void Transaksi",
          "Batalkan seluruh SKU di bill ini di NAV (WsUndoShipment)?",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Void",
              style: "destructive",
              onPress: async () => {
                try {
                  await voidBillStateless({ invoiceId: id });
                  const updatedTransactions = transactions.map((bill) =>
                    bill._id === id
                      ? {
                          ...bill,
                          isVoid: true,
                          requestingVoid: false,
                          isChanged: true,
                          sync: true,
                        }
                      : bill,
                  );
                  setTransactions(updatedTransactions);
                  await AsyncStorage.setItem(
                    "bills",
                    JSON.stringify(updatedTransactions),
                  );
                } catch (error) {
                  Alert.alert(
                    "Gagal Void",
                    error?.response?.data?.message || error?.message || "Error",
                  );
                }
              },
            },
          ],
        );
        return;
      }

      const updatedTransactions = transactions.map((bill) =>
        bill._id === id
          ? { ...bill, requestingVoid: !bill?.requestingVoid, isChanged: true }
          : bill,
      );
      setTransactions(updatedTransactions);
      await AsyncStorage.setItem(
        "bills",
        JSON.stringify(updatedTransactions),
      ).then(async () => {
        await handleSinkronisasi();
      });
    };

    return (
      <View className="bg-white p-4 mb-2 rounded-lg shadow-sm border border-gray-100">
        <Text className="text-lg font-semibold text-gray-800 mb-1">
          Catatan: Maksimum Invoice yang disimpan offline saat ini hanya 50
          untuk menjaga kelancaran aplikasi
        </Text>
        <View className="flex-row justify-between mb-1">
          <Text
            className="font-bold text-gray-800"
            style={{ fontFamily: "gilroyRegular" }}
          >
            {item.kodeInvoice}
          </Text>

          <View className="flex-row gap-x-2">
            {item?.tanggalBayar && (
              <View className={`px-2 py-1 rounded-full ${statusColor}`}>
                <Text className="text-xs font-medium">
                  Tanggal Bayar {formatDate(item.tanggalBayar)}
                </Text>
              </View>
            )}
            <View className={`px-2 py-1 rounded-full ${statusColor}`}>
              <Text className="text-xs font-medium">{statusText}</Text>
            </View>
          </View>
        </View>

        <View className="mb-2">
          <Text
            className="text-gray-600 text-sm"
            style={{ fontFamily: "gilroyRegular" }}
          >
            <Calendar size={12} className="mr-1" /> {formatDate(item.createdAt)}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">{totalItems} item</Text>
          <Text
            className="font-bold text-gray-800"
            style={{ fontFamily: "gilroyRegular" }}
          >
            Rp {item.total.toLocaleString("id-ID")}
          </Text>
        </View>

        {item.paymentMethod && (
          <Text
            className="text-gray-500 text-xs mt-1"
            style={{ fontFamily: "gilroyRegular" }}
          >
            Pembayaran: {item.paymentMethod}
          </Text>
        )}

        {!item.sync && (
          <View className="mt-2">
            <Text
              className="text-xs text-red-500"
              style={{ fontFamily: "gilroyRegular" }}
            >
              Belum disinkronkan
            </Text>
          </View>
        )}
        {item?.done && !item?.isVoid && (
          <TouchableOpacity
            onPress={() => handleToggleRequestingVoid(item._id)}
            className="bg-blue-950 p-2 rounded-md"
          >
            <Text className="text-white text-sm text-center">
              {!item?.requestingVoid ? "Request Void" : "Cancel Request"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const DateFilterModal = () => (
    <Modal
      visible={showDateFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDateFilterModal(false)}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Filter Tanggal</Text>
            <TouchableOpacity onPress={() => setShowDateFilterModal(false)}>
              <X size={24} color="gray" />
            </TouchableOpacity>
          </View>

          <View className="gap-y-4 ">
            <View>
              <Text className="text-gray-600 mb-2">Tanggal Mulai</Text>
              <TouchableOpacity
                onPress={() => {
                  setDatePickerType("start");
                  setShowDatePicker(true);
                }}
                className="border border-gray-300 rounded-lg p-3"
              >
                <Text>
                  {dateFilter.startDate
                    ? dateFilter.startDate.toLocaleDateString("id-ID")
                    : "Pilih tanggal mulai"}
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-gray-600 mb-2">Tanggal Akhir</Text>
              <TouchableOpacity
                onPress={() => {
                  setDatePickerType("end");
                  setShowDatePicker(true);
                }}
                className="border border-gray-300 rounded-lg p-3"
              >
                <Text>
                  {dateFilter.endDate
                    ? dateFilter.endDate.toLocaleDateString("id-ID")
                    : "Pilih tanggal akhir"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-x-2">
              <TouchableOpacity
                onPress={clearDateFilter}
                className="flex-1 bg-gray-200 p-3 rounded-lg"
              >
                <Text className="text-center">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyDateFilter}
                className="flex-1 bg-blue-950 p-3 rounded-lg"
              >
                <Text className="text-center text-white">Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Overview Horizontal Scroll (Mobile Friendly) */}
      {!isLoading && (
        <View className="bg-white border-b border-gray-200 shadow-sm z-10">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, gap: 12 }}
          >
            <View className="bg-blue-50 border border-blue-100 p-3 rounded-xl min-w-[140px]">
              <Text className="text-xs text-blue-600 font-medium mb-1 font-gilroyRegular">
                Total Pendapatan
              </Text>
              <Text className="font-bold text-[15px] text-gray-800 font-gilroyBold">
                Rp {statsData.totalPendapatan.toLocaleString("id-ID")}
              </Text>
            </View>
            <View className="bg-green-50 border border-green-100 p-3 rounded-xl min-w-[110px]">
              <Text className="text-xs text-green-600 font-medium mb-1 font-gilroyRegular">
                Item Terjual
              </Text>
              <Text className="font-bold text-[15px] text-gray-800 font-gilroyBold">
                {statsData.totalTerjual}
              </Text>
            </View>
            <View className="bg-purple-50 border border-purple-100 p-3 rounded-xl min-w-[110px]">
              <Text className="text-xs text-purple-600 font-medium mb-1 font-gilroyRegular">
                Total Transaksi
              </Text>
              <Text className="font-bold text-[15px] text-gray-800 font-gilroyBold">
                {statsData.totalTransaksi}
              </Text>
            </View>
            <View className="bg-orange-50 border border-orange-100 p-3 rounded-xl min-w-[110px]">
              <Text className="text-xs text-orange-600 font-medium mb-1 font-gilroyRegular">
                Belum Bayar
              </Text>
              <Text className="font-bold text-[15px] text-gray-800 font-gilroyBold">
                {statsData.belumBayar}
              </Text>
            </View>
            <View className="bg-red-50 border border-red-100 p-3 rounded-xl min-w-[110px]">
              <Text className="text-xs text-red-600 font-medium mb-1 font-gilroyRegular">
                Transaksi Void
              </Text>
              <Text className="font-bold text-[15px] text-gray-800 font-gilroyBold">
                {statsData?.dibatalkan || 0}
              </Text>
            </View>
          </ScrollView>
        </View>
      )}

      <View className="flex-1">
        {/* Filter section */}
        <View className="flex-col justify-between px-4 pt-3 pb-1 bg-white border-b border-gray-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Filter size={14} color="#6B7280" className="mr-1" />
              <Text className="text-gray-600 text-sm font-semibold font-gilroyRegular">
                Filter Transaksi
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDateFilterModal(true)}
              className="bg-blue-100 px-3 py-1.5 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-bold font-gilroyRegular">
                {dateFilter.startDate && dateFilter.endDate
                  ? `${dateFilter.startDate.toLocaleDateString(
                      "id-ID",
                    )} - ${dateFilter.endDate.toLocaleDateString("id-ID")}`
                  : "Filter Tanggal"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap">
            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                filterStatus === "all" ? "bg-blue-950" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("all")}
            >
              <Text
                className={
                  filterStatus === "all"
                    ? "text-white text-xs"
                    : "text-gray-700 text-xs"
                }
              >
                Semua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                filterStatus === "done" ? "bg-green-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("done")}
            >
              <Text
                className={
                  filterStatus === "done"
                    ? "text-white text-xs"
                    : "text-gray-700 text-xs"
                }
              >
                Selesai
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                filterStatus === "pending" ? "bg-yellow-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("pending")}
            >
              <Text
                className={
                  filterStatus === "pending"
                    ? "text-white text-xs"
                    : "text-gray-700 text-xs"
                }
              >
                Belum Selesai
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                filterStatus === "void" ? "bg-red-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("void")}
            >
              <Text
                className={
                  filterStatus === "void"
                    ? "text-white text-xs"
                    : "text-gray-700 text-xs"
                }
              >
                Void
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                filterStatus === "requestingVoid"
                  ? "bg-orange-500"
                  : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("requestingVoid")}
            >
              <Text
                className={
                  filterStatus === "requestingVoid"
                    ? "text-white text-xs"
                    : "text-gray-700 text-xs"
                }
              >
                Requesting Void
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction list */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center ">
            <ActivityIndicator size="large" color="#0000ff" />
            <Text
              className="mt-2 text-gray-600"
              style={{ fontFamily: "gilroyRegular" }}
            >
              Memuat data transaksi...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20 ">
                <Text
                  className="text-gray-500"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Tidak ada transaksi ditemukan
                </Text>
              </View>
            }
            ListHeaderComponent={
              <View className="flex-row justify-between mb-2">
                <Text
                  className="text-gray-500 text-sm"
                  style={{ fontFamily: "gilroyRegular" }}
                >
                  Menampilkan {filteredTransactions.length} dari{" "}
                  {transactions.length} transaksi
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerType === "start"
              ? dateFilter.startDate || new Date()
              : dateFilter.endDate || new Date()
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Date Filter Modal */}
      <DateFilterModal />

      <View className="absolute bottom-14 left-0">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="px-2 bg-blue-300 py-4 rounded-r-lg items-center justify-center"
        >
          <Text>
            <SquareChevronRight size={20} color={"white"} />
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AktivitasScreen;
