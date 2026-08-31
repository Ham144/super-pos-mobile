import { View, Text } from "react-native";
import { useState } from "react";
import { useCurrentBill } from "../store";
import { FlatList } from "react-native";
import { ArrowBigRightDash, CircleX, Pencil } from "lucide-react-native";

const CurrentBill = () => {
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [tempEditItem, setTempEditItem] = useState({
    quantity: 0,
  });

  //zustand
  const { currentBill, removeFromCurrentBill } = useCurrentBill();
  
  return (
    <FlatList
      className="flex flex-col max-h-44 min-h-28 overflow-y-auto"
      data={Array.from(currentBill.values())}
      renderItem={({ item }) => (
        <View className="flex-row justify-between items-center gap-x-1 mb-2 ">
          <View className="flex-1 mr-2 flex-row items-center w-1/2 justify-between">
            <View>
              <Text
                className="text-sm text-gray-800 font-aldrich"
                numberOfLines={1}
              >
                {item?.description || "Item Description"}
              </Text>
              {item?.catatan && (
                <Text className="text-sm mt-1 text-gray-800 font-aldrich">
                  catatan : {item.catatan}
                </Text>
              )}
            </View>
            <Text className={`text-sm rounded  text-gray-800 font-aldrich`}>
              {item.quantity > 1 && (
                <View className="flex flex-row gap-x-1 rounded">
                  <Text className="text-sm p-1 bg-blue-600  rounded-md text-white font-bold font-aldrich">
                    X {item.quantity}
                  </Text>
                </View>
              )}
            </Text>
          </View>
          <View className={`flex-row gap-x-2`}>
            <Text className="text-sm text-gray-800 font-aldrich">
              {item.quantity > 1 && (
                <View className="flex flex-row gap-x-1">
                  <Text>Rp {item?.RpHargaDasar?.toLocaleString("id")}</Text>
                  <ArrowBigRightDash size={20} color={"#2A4B8D"} />
                </View>
              )}
            </Text>
            <Text className="text-sm text-gray-800 font-aldrich">
              {item.RpHargaDasar
                ? `Rp ${(item?.RpHargaDasar * item.quantity).toLocaleString(
                    "id"
                  )}`
                : "Rp 0"}
            </Text>
            <Text>
              <CircleX
                onPress={() => removeFromCurrentBill(item)}
                size={20}
                color={"red"}
              />
            </Text>
            <Text>
              <Pencil
                onPress={() => {
                  setShowEditItemModal(true);
                  setTempEditItem(item);
                }}
                className="fill-current "
                size={20}
                color={"#3B82F6"}
              />
            </Text>
          </View>
        </View>
      )}
    />
  );
};

export default CurrentBill;
