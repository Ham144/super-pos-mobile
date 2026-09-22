import { useCallback, memo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import {
  CircleX,
  ArrowBigRightDash,
  Pencil,
  BadgeCheck,
  Lock,
} from "lucide-react-native";
import { useCurrentBill } from "../store";

export const formatRp = (value) =>
  Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );

const BillItem = memo(
  ({ item, onRemove, onEdit, isPaid }) => {
    const lineTotal = (Number(item?.RpHargaDasar) || 0) * (item?.quantity || 0);
    const overLimit = item.quantity > item.limitQuantity;

    return (
      <View style={[styles.row, isPaid && styles.rowPaid]}>
        <View style={styles.leftActions}>
          {!isPaid ? (
            <Pressable onPress={() => onRemove(item)} hitSlop={8}>
              <CircleX size={20} color="red" />
            </Pressable>
          ) : (
            <Lock size={16} color="#059669" />
          )}
        </View>

        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.skuText, isPaid && styles.skuTextPaid]}
              numberOfLines={1}
            >
              {item?.sku || item?.description || "Item Description"}
            </Text>
            {item.quantity > 0 && (
              <View
                style={[
                  styles.qtyBadge,
                  isPaid
                    ? styles.qtyBadgePaid
                    : overLimit
                      ? styles.qtyBadgeDanger
                      : styles.qtyBadgeOk,
                ]}
              >
                <Text style={styles.qtyText}>{item.quantity} pcs</Text>
              </View>
            )}
          </View>

          {item?.catatan ? (
            <Text style={styles.catatanText}>catatan: {item.catatan}</Text>
          ) : null}
        </View>

        <View style={styles.priceCol}>
          {item.quantity > 1 && (
            <View style={styles.unitPriceRow}>
              <Text style={[styles.priceText, isPaid && styles.priceTextPaid]}>
                Rp {formatRp(item?.RpHargaDasar)}
              </Text>
              <ArrowBigRightDash
                size={16}
                color={isPaid ? "#059669" : "#2A4B8D"}
              />
            </View>
          )}
          <Text style={[styles.priceText, isPaid && styles.priceTextPaid]}>
            Rp {formatRp(lineTotal)}
          </Text>
          {!isPaid ? (
            <Pressable onPress={() => onEdit(item)} hitSlop={8}>
              <Pencil size={20} color="#3B82F6" />
            </Pressable>
          ) : (
            <BadgeCheck size={18} color="#059669" />
          )}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.isPaid === next.isPaid &&
    prev.item?.sku === next.item?.sku &&
    prev.item?.quantity === next.item?.quantity &&
    prev.item?.catatan === next.item?.catatan &&
    prev.item?.RpHargaDasar === next.item?.RpHargaDasar &&
    prev.item?.limitQuantity === next.item?.limitQuantity,
);

export const BillItems = memo(({ onEditItem, onRemoveItem }) => {
  const currentBill = useCurrentBill((state) => state.currentBill);
  const removeFromCurrentBill = useCurrentBill(
    (state) => state.removeFromCurrentBill,
  );
  const isPaid = useCurrentBill((state) => state.done);

  const handleRemoveItem = useCallback(
    (item) => {
      if (typeof onRemoveItem === "function") {
        onRemoveItem(item);
        return;
      }
      removeFromCurrentBill(item);
    },
    [onRemoveItem, removeFromCurrentBill],
  );

  const handleEditItem = useCallback(
    (item) => {
      onEditItem?.(item);
    },
    [onEditItem],
  );

  const keyExtractor = useCallback((item) => item.sku, []);

  const renderItem = useCallback(
    ({ item }) => (
      <BillItem
        item={item}
        onRemove={handleRemoveItem}
        onEdit={handleEditItem}
        isPaid={isPaid}
      />
    ),
    [handleRemoveItem, handleEditItem, isPaid],
  );

  if (!currentBill?.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Belum ada yang dipilih</Text>
        <CircleX size={24} color="#6B7280" />
      </View>
    );
  }

  return (
    <View style={[styles.listWrap, isPaid && styles.listWrapPaid]}>
      {isPaid ? (
        <View style={styles.paidBanner}>
          <BadgeCheck size={18} color="#047857" />
          <View style={styles.paidBannerTextCol}>
            <Text style={styles.paidBannerTitle}>Bill Selesai</Text>
            <Text style={styles.paidBannerSub}>
              Item terkunci — edit & hapus tidak tersedia
            </Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={currentBill}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        windowSize={5}
        removeClippedSubviews
        extraData={isPaid}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  listWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
  },
  listWrapPaid: {
    borderTopColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
  },
  paidBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  paidBannerTextCol: {
    flex: 1,
  },
  paidBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857",
    fontFamily: "gilroyBold",
  },
  paidBannerSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#065F46",
    fontFamily: "gilroyRegular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowPaid: {
    borderBottomColor: "#D1FAE5",
    opacity: 0.92,
  },
  leftActions: {
    width: 24,
    alignItems: "center",
  },
  main: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  skuText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontFamily: "gilroyRegular",
  },
  skuTextPaid: {
    color: "#065F46",
  },
  catatanText: {
    fontSize: 14,
    marginTop: 4,
    color: "#1F2937",
    fontFamily: "gilroyRegular",
  },
  qtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyBadgeOk: {
    backgroundColor: "#3B82F6",
  },
  qtyBadgeDanger: {
    backgroundColor: "#EF4444",
  },
  qtyBadgePaid: {
    backgroundColor: "#059669",
  },
  qtyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    color: "#1F2937",
  },
  priceTextPaid: {
    color: "#065F46",
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    fontFamily: "gilroyRegular",
  },
});
