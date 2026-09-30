import { View, Text, TextInput, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDebouceTime } from "../store";

const PengaturanInputBill = () => {
  //states
  const { debounceTime, setDebounceTime } = useDebouceTime();
  const [debounceTimeState, setDebounceTimeState] = useState(debounceTime);

  console.log(debounceTime);

  const handleSave = async () => {
    setDebounceTime(debounceTimeState);
    await AsyncStorage.setItem(
      "debounceTime",
      JSON.stringify(debounceTimeState),
    );
  };

  useEffect(() => {
    setDebounceTimeState(debounceTime);
  }, []);

  return (
    <View className="border rounded-xl p-4 bg-white shadow-md">
      <View className="p-4 rounded-lg bg-gray-100 shadow-sm gap-3">
        <Text className="text-lg font-semibold text-gray-700">
          Debouncing (1000ms = 1 detik)
        </Text>
        <TextInput
          className="border rounded-lg p-2 text-lg bg-white"
          value={String(debounceTimeState)}
          keyboardType="numeric"
          onChangeText={(e) => setDebounceTimeState(Number(e))}
          placeholder="Masukkan waktu debounce"
        />
      </View>
      <View className="mt-4">
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-950 py-3 rounded-lg shadow-md active:bg-blue-700"
        >
          <Text className="text-center text-white text-lg font-semibold">
            Update
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PengaturanInputBill;
