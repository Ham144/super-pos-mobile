import React, { memo } from "react";
import { View, Text } from "react-native";
import { ArrowBigRightDash } from "lucide-react-native";
import { BillActions } from "./BillActions";

export const BillTotalsFooter = memo(
  ({
    cebelumDiskon,
    setelahDiskon,
    isCalculating,
    billActionsProps,
  }) => (
    <View className="border-t border-gray-200">
      <View className="flex-row gap-x-2 justify-end items-center py-2 border-b border-gray-100">
        <Text
          className="text-sm text-gray-800 font-gilroyRegular"
          style={{ fontFamily: "gilroyRegular" }}
        >
          Sub Total
        </Text>
        <Text
          className="text-sm text-gray-800"
          style={{ fontFamily: "gilroyRegular" }}
        >
          Rp {cebelumDiskon?.toLocaleString("id")}
        </Text>
      </View>

      <View className="flex-row justify-between items-center py-2">
        <Text
          className="text-sm font-semibold"
          style={{ fontFamily: "gilroyRegular" }}
        >
          Total
        </Text>
        <View className="flex-row items-center gap-x-1">
          {setelahDiskon !== cebelumDiskon && (
            <>
              <Text className="text-xs text-gray-800">
                Rp {cebelumDiskon?.toLocaleString("id")}
              </Text>
              <ArrowBigRightDash size={16} color="#2A4B8D" />
            </>
          )}
          <Text
            className="text-sm font-semibold"
            style={{ fontFamily: "gilroyRegular" }}
          >
            RP {setelahDiskon?.toLocaleString("id")}
          </Text>
        </View>
      </View>

      <BillActions {...billActionsProps} isCalculating={isCalculating} />
    </View>
  )
);
