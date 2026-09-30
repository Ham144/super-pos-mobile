import { View, Text, TouchableOpacity, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native-gesture-handler";

const SpgSummary = () => {
  const [spgList, setSpgList] = useState();

  useEffect(() => {
    const fetchSpgList = async () => {
      const spgListFromStorage = await AsyncStorage.getItem("spg");
      if (spgListFromStorage) setSpgList(JSON.parse(spgListFromStorage));
    };
    fetchSpgList();
  }, [AsyncStorage]);

  const renderSpgItem = ({ item }) => (
    <View className={`flex   flex-row items-center p-4 border-b `}>
      <View className="flex-1 p-4 bg-white rounded-lg shadow-md ">
        <View className="mb-4 flex flex-row justify-between">
          <Text className="text-blue-600 font-semibold text-xl font-aldrich">
            Name
          </Text>
          <Text className="text-blue-600 font-medium text-xl font-aldrich">
            {item.name}
          </Text>
        </View>

        <Text className="text-gray-600 font-medium mb-2 font-aldrich">
          From this device
        </Text>

        {/* Total Harga Penjualan */}
        <View className="flex flex-row justify-between mb-4">
          <Text className="text-gray-800 font-medium font-aldrich">
            Total Harga Penjualan
          </Text>
          <Text className="text-gray-800 font-medium font-aldrich">
            {item?.totalHargaPenjualanFromApp || 0}
          </Text>
        </View>

        {/* Total Quantity Penjualan */}
        <View className="flex flex-row justify-between mb-4">
          <Text className="text-gray-800 font-medium font-aldrich">
            Total Quantity Penjualan
          </Text>
          <Text className="text-gray-800 font-medium font-aldrich">
            {item?.totalQuantityPenjualanFromApp || 0}
          </Text>
        </View>

        <Text className="text-gray-600 font-medium mb-2 font-aldrich">
          Target
        </Text>

        {/* Target Harga Penjualan */}
        <View className="flex flex-row justify-between mb-4">
          <Text className="text-gray-800 font-medium font-aldrich">
            Target Sale
          </Text>
          <Text className="text-gray-800 font-medium font-aldrich">
            {item?.targetHargaPenjualan?.$numberDecimal || 0}
          </Text>
        </View>

        {/* Target Quantity Penjualan */}
        <View className="flex flex-row justify-between mb-4">
          <Text className="text-gray-800 font-medium font-aldrich">
            Target Sale Quantity
          </Text>
          <Text className="text-gray-800 font-medium font-aldrich">
            {item?.targetQuantityPenjualan || 0}
          </Text>
        </View>

        {/* Progress Bars for Total Sale and Quantity */}
        <Text className="w-full">
          {item?.targetQuantityPenjualan &&
          item?.targetHargaPenjualan?.$numberDecimal ? (
            <View className="mb-6 w-full">
              <Text className="text-gray-800 font-medium mb-2 w-full font-aldrich">
                Progress
              </Text>

              {/* Sale Progress Bar */}
              <View className="w-full">
                <Text className="text-gray-800 font-medium mb-1 w-full font-aldrich">
                  Sale Progress
                </Text>
                <View className="w-full h-2 bg-gray-200 rounded-full">
                  <View
                    style={{
                      width: `${
                        item?.targetHargaPenjualan?.$numberDecimal &&
                        item?.targetHargaPenjualan?.$numberDecimal
                          ? Math.min(
                              (item?.totalHargaPenjualan?.$numberDecimal /
                                item?.targetHargaPenjualan?.$numberDecimal) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                    className="h-full bg-sky-500 rounded-full w-full"
                  />
                </View>
                <Text className="text-right text-gray-600 w-full font-aldrich">
                  {Math.min(
                    (item?.totalHargaPenjualan?.$numberDecimal /
                      item?.targetHargaPenjualan?.$numberDecimal) *
                      100,
                    100
                  ).toFixed(1)}
                  %
                </Text>
              </View>

              {/* Quantity Progress Bar */}
              <Text className="text-gray-800 font-medium mb-1 w-full font-aldrich">
                Quantity Progress
              </Text>
              <View className="w-full h-2 bg-gray-200 rounded-full">
                <View
                  style={{
                    width: `${
                      item?.targetQuantityPenjualan &&
                      item?.targetQuantityPenjualan
                        ? (item?.totalQuantityPenjualan /
                            item?.targetQuantityPenjualan) *
                          100
                        : 0
                    }%`,
                  }}
                  className="h-full bg-green-500 rounded-full w-full"
                />
              </View>
              <Text className="text-right text-gray-600 w-full font-aldrich">
                {Math.min(
                  (item?.totalQuantityPenjualan /
                    item?.targetQuantityPenjualan) *
                    100,
                  100
                ).toFixed(1)}
                %
              </Text>
            </View>
          ) : (
            "No target"
          )}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <ScrollView className="">
        <FlatList
          className=""
          data={spgList}
          renderItem={renderSpgItem}
          keyExtractor={(item) => item.name}
        />
      </ScrollView>
    </View>
  );
};

export default SpgSummary;
