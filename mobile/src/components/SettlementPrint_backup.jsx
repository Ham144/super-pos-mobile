// import React, { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Alert,
//   Platform,
//   ActivityIndicator,
//   RefreshControl,
//   ScrollView,
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Printer, RefreshCcw } from "lucide-react-native";
// import { printSettlement } from "../api";
// import { useFocusEffect } from "@react-navigation/native";

// const SettlementPrint = () => {
//   const [storeName, setStoreName] = useState("");
//   const [cashierName, setCashierName] = useState("");
//   const [settlementData, setSettlementData] = useState({});
//   const [totalAmount, setTotalAmount] = useState(0);
//   const [loadingPrinting, setLoadingPrinting] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [terakhirPrintSettlement, setTerakhirPrintSettlement] = useState("");

//   const loadData = async () => {
//     try {
//       setRefreshing(true);
//       // Load store name
//       const outlet = JSON.parse(await AsyncStorage.getItem("outlet"));
//       if (outlet) {
//         setStoreName(outlet.namaOutlet || "Nama Toko");
//       }

//       // Load cashier name
//       const userInfo = JSON.parse(await AsyncStorage.getItem("userInfo"));
//       if (userInfo) {
//         setCashierName(userInfo.username || "Kasir");
//       }

//       // Load and calculate settlement data
//       const bills = JSON.parse(await AsyncStorage.getItem("bills")) || [];
//       const today = new Date().toISOString().split("T")[0];

//       const todayBills = bills.filter((bill) => {
//         try {
//           if (!bill.tanggalBayar || !bill.sync) return false;

//           const date = new Date(bill.tanggalBayar);
//           if (isNaN(date.getTime())) return false;

//           const billDate = date.toISOString().split("T")[0];
//           return bill.done && billDate === today;
//         } catch (error) {
//           return false;
//         }
//       });

//       const data = {};
//       let total = 0;

//       todayBills.forEach((bill) => {
//         const amount = Number(bill.total) || 0;
//         const paymentMethod = bill.paymentMethod?.toLowerCase() || "lainnya";

//         if (!data[paymentMethod]) {
//           data[paymentMethod] = 0;
//         }

//         data[paymentMethod] += amount;
//         total += amount;
//       });

//       setSettlementData(data);
//       setTotalAmount(total);
//       setLoadingPrinting(false);
//       setRefreshing(false);
//       await getTerakhirPrintSettlement();
//     } catch (error) {
//       console.error("Error loading settlement data:", error);
//       setRefreshing(false);
//     }
//   };

//   const handlePrint = async () => {
//     try {
//       await printSettlement(
//         settlementData,
//         totalAmount,
//         storeName,
//         cashierName
//       );
//       await AsyncStorage.setItem(
//         "terakhirPrintSettlement",
//         new Date().toISOString().split("T")[0]
//       );
//       await getTerakhirPrintSettlement();
//     } catch (error) {
//       console.log(error);
//       Platform.OS === "android" || Platform.OS === "ios"
//         ? Alert.alert("Error", "Gagal mencetak settlement")
//         : alert("Gagal mencetak settlement");
//     }
//   };

//   const formatCurrency = (amount) => {
//     return `Rp ${amount.toLocaleString("id-ID")}`;
//   };

//   const getTerakhirPrintSettlement = async () => {
//     const terakhirPrintSettlement = await AsyncStorage.getItem(
//       "terakhirPrintSettlement"
//     );
//     if (terakhirPrintSettlement) {
//       setTerakhirPrintSettlement(terakhirPrintSettlement);
//     }
//   };

//   const onRefresh = useCallback(() => {
//     loadData();
//   }, []);

//   // Load data when component mounts
//   useEffect(() => {
//     setLoadingPrinting(true);
//     loadData();
//   }, []);

//   // Reload data when screen comes into focus
//   useFocusEffect(
//     useCallback(() => {
//       loadData();
//       return () => {};
//     }, [])
//   );

//   return (
//     <ScrollView
//       className="flex-1"
//       refreshControl={
//         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//       }
//     >
//       <View className="bg-white rounded-lg shadow-sm p-4 flex-1">
//         <View className="flex-row justify-between items-center border-b border-gray-200 pb-2">
//           <Text className="text-sm text-gray-600 font-medium">
//             Preview Print Simple Settlement
//           </Text>
//           <TouchableOpacity onPress={loadData} className="p-1">
//             <RefreshCcw size={16} color="#4b5563" />
//           </TouchableOpacity>
//         </View>
//         <Text className="text-sm text-gray-600 font-medium border-b border-gray-200 pb-2">
//           Transaksi yang dihitung adalah transaksi yang sudah bayar dan sudah
//           sync
//         </Text>
//         <Text className="text-lg font-bold text-center mb-2">{storeName}</Text>
//         <View
//           style={{
//             borderTopWidth: 1,
//             borderBottomWidth: 1,
//             borderColor: "#e5e7eb",
//             paddingVertical: 8,
//             marginBottom: 8,
//             flexDirection: "row",
//             justifyContent: "space-between",
//           }}
//         >
//           {terakhirPrintSettlement ? (
//             <Text style={{ fontSize: 14, color: "#4b5563" }}>
//               Print terakhir: {terakhirPrintSettlement}
//             </Text>
//           ) : (
//             <Text style={{ fontSize: 14, color: "#4b5563" }}>
//               Tanggal Print muncul disini
//             </Text>
//           )}
//         </View>

//         <View
//           style={{
//             borderTopWidth: 1,
//             borderBottomWidth: 1,
//             borderColor: "#e5e7eb",
//             paddingVertical: 8,
//             marginBottom: 8,
//             flexDirection: "row",
//             justifyContent: "space-between",
//           }}
//         >
//           <Text style={{ fontSize: 14, color: "#4b5563" }}>Kasir:</Text>
//           <Text style={{ fontSize: 14, color: "#4b5563" }}>
//             {cashierName || "-"}
//           </Text>
//         </View>

//         <Text className="font-semibold mb-2">Metode Pembayaran dan Total</Text>
//         <View className="border-t border-b border-gray-200 py-2 space-y-1">
//           {Object.entries(settlementData).map(([method, amount]) => (
//             <View key={method} className="flex-row justify-between">
//               <Text className="text-sm">
//                 {method.charAt(0).toUpperCase() + method.slice(1)}
//               </Text>
//               <Text className="text-sm">{formatCurrency(amount)}</Text>
//             </View>
//           ))}
//         </View>

//         <View className="mt-2 border-t border-gray-200 pt-2">
//           <View className="flex-row justify-between">
//             <Text className="font-semibold">Total: </Text>
//             <Text className="font-semibold">{formatCurrency(totalAmount)}</Text>
//           </View>
//         </View>

//         <TouchableOpacity
//           onPress={handlePrint}
//           className="mt-4 bg-blue-950 py-2 rounded-lg flex-row items-center justify-center"
//         >
//           {loadingPrinting ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <>
//               <Printer size={16} color="white" className="mr-2" />
//               <Text className="text-white font-medium">Print Settlement</Text>
//             </>
//           )}
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default SettlementPrint;
