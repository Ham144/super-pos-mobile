import { View } from "react-native";
import React from "react";
import { TextInput } from "react-native-gesture-handler";

const FilterInventories = ({ filter, setFilter }) => {
  return (
    <View className="flex flex-row items-center w-1/2 z-20 bg-white py-2 px-1">
      {/* Search input */}
      <TextInput
        placeholder="SKU/Description"
        value={filter.searchKey}
        onChangeText={(text) =>
          setFilter((prev) => ({ ...prev, searchKey: text }))
        }
        className={`flex-1 bg-gray-200 p-4 rounded-lg border border-gray-300 mr-3 `}
      />
    </View>
  );
};

export default FilterInventories;
