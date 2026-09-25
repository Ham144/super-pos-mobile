import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from "react-native";
import RegisterInvoice from "../components/RegisterInvoice";
import AddItemLockOverlay from "../components/AddItemLockOverlay";
import { useCurrentBill } from "../store";

export default function CustomsScreen() {
  // State untuk menyimpan input dan daftar tambahan
  const [inputValue, setInputValue] = useState(0);
  const [additionalItems, setAdditionalItems] = useState([]);

  //tanstack

  //zustand
  const { currentBill, createCurrentBill, addToCurrentBill, _id } =
    useCurrentBill();

  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';

  // Fungsi untuk menambahkan angka ke input
  const handleButtonPress = (value) => {
    if (value === "C") {
      setInputValue("0"); // Clear input
    } else if (value === "del") {
      if (inputValue.length < 2) {
        setInputValue("0");
      } else {
        setInputValue(inputValue.slice(0, -1)); // Menghapus karakter terakhir
      }
    } else {
      if (inputValue == "0") {
        setInputValue(value);
      } else {
        setInputValue(inputValue + value); // Menambahkan angka ke input
      }
    }
  };

  const handleAddToCurrentBill = () => {
    if (inputValue == 0) return;
    if (!_id) {
      const bill = {
        sku:
          `custom-` + new Date().getTime() + Math.floor(Math.random() * 1000),
        description: "Produk tanpa sku",
        quantity: 1,
        RpHargaDasar: parseFloat(inputValue),
        limitQuantity: 10,
      };
      createCurrentBill(bill);
    } else {
      const bill = {
        sku:
          `custom-` + new Date().getTime() + Math.floor(Math.random() * 1000),
        description: "Produk tanpa sku",
        quantity: 1, //+1
        RpHargaDasar: inputValue,
        limitQuantity: 10,
      };
      addToCurrentBill(bill);
    }
    setInputValue(0);
  };

  return (
    <View className={`flex-1 bg-white pt-1 ${orientation === 'portrait' ? 'flex-col' : 'flex-row'}`}>
      
      {orientation === 'portrait' ? (
        // PORTRAIT MODE
        <View className="flex-1 w-full">
          {/* Numpad Section */}
          <View className="flex-1 justify-end px-3 pb-2 pt-2 bg-gray-50 border-b border-gray-200">
            <View className="flex-row justify-end items-end mb-2">
              <Text className="text-5xl text-blue-700 font-semibold font-aldrich py-2" numberOfLines={1} adjustsFontSizeToFit>
                {inputValue?.toLocaleString("id-ID")}
              </Text>
            </View>
            <View className="flex-row flex-wrap w-full flex-1 justify-between items-stretch">
              {[
                "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "000", "C", "del", "+"
              ].map((button, index) => (
                <TouchableOpacity
                  key={button}
                  onPress={() => button === "+" ? handleAddToCurrentBill() : handleButtonPress(button)}
                  className={`
                    ${button === "del" ? "bg-orange-50 active:bg-orange-100" : ""} 
                    ${button === "+" ? "bg-green-500 active:bg-green-600" : "bg-white active:bg-gray-100"} 
                    ${button === "C" ? "bg-red-50 active:bg-red-100" : ""}
                    h-[17%] w-[32%] justify-center items-center rounded-2xl mb-[2%] shadow-sm border border-gray-200
                  `}
                >
                  <Text className={`text-2xl font-bold font-aldrich ${button === "+" ? "text-white" : (button === "C" || button === "del" ? "text-red-500" : "text-gray-800")}`}>
                    {button}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AddItemLockOverlay />
          </View>
          
          {/* Invoice Section */}
          <View className="w-full pt-1" style={{ height: '60%' }}>
            <RegisterInvoice fullWidth />
          </View>
        </View>
      ) : (
        // LANDSCAPE MODE
        <>
          {/* Layout Kiri: Tombol Input */}
          <View className="w-1/2 px-3 py-1 border-r border-gray-300 bg-gray-50">
            <View className="flex-row justify-end items-end w-full mb-4">
              <Text className="text-6xl text-blue-700 font-semibold font-aldrich py-2" numberOfLines={1} adjustsFontSizeToFit>
                {inputValue?.toLocaleString("id-ID")}
              </Text>
            </View>
            <View className="flex-row flex-wrap flex-1 w-full justify-between items-stretch">
              {[
                "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "000", "C", "del", "+"
              ].map((button, index) => (
                <TouchableOpacity
                  key={button}
                  onPress={() => button === "+" ? handleAddToCurrentBill() : handleButtonPress(button)}
                  className={`
                    ${button === "del" ? "bg-orange-50 active:bg-orange-100" : ""} 
                    ${button === "+" ? "bg-green-500 active:bg-green-600" : "bg-white active:bg-gray-100"} 
                    ${button === "C" ? "bg-red-50 active:bg-red-100" : ""}
                    w-[32%] h-[18%] mb-[2%] justify-center items-center rounded-2xl shadow-sm border border-gray-200
                  `}
                >
                  <Text className={`text-3xl font-bold font-aldrich ${button === "+" ? "text-white" : (button === "C" || button === "del" ? "text-red-500" : "text-gray-800")}`}>
                    {button}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AddItemLockOverlay />
          </View>

          {/* Layout Kanan: Daftar Tambahan dan Total */}
          <View className="w-[450px] h-full">
             <RegisterInvoice fullWidth />
          </View>
        </>
      )}
    </View>
  );
}