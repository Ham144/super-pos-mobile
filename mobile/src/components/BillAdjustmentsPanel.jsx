import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import CheckDiskonOffline from "./checkDiskonOffline";
import CheckPromoOffline from "./checkPromoOffline";
import VoucherOfflineCreationOnly from "./VoucherOfflineCreationOnly";

/**
 * Shrink-wraps adjustment UIs. Each checker always mounts (for matching logic)
 * but returns null when disabled or when its list is empty — so BillItems keeps
 * the vertical space when nothing applies.
 */
export const BillAdjustmentsPanel = memo(() => (
  <View style={styles.wrap}>
    <CheckPromoOffline />
    <CheckDiskonOffline />
    <VoucherOfflineCreationOnly />
  </View>
));

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
});
