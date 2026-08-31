import  { useCallback, memo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { CircleX, ArrowBigRightDash, Pencil } from "lucide-react-native";
import { useCurrentBill } from "../store";

const formatRp = (value) =>
  Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );

const BillItem = memo(
  ({ item, onRemove, onEdit, isPaid }) => {
    const lineTotal = (Number(item?.RpHargaDasar) || 0) * (item?.quantity || 0);
    const overLimit = item.quantity > item.limitQuantity;

    return (
      <View style={styles.row}>
        <View style={styles.leftActions}>
          {!isPaid && (
            <Pressable onPress={() => onRemove(item)} hitSlop={8}>
              <CircleX size={20} color="red" />
            </Pressable>
          )}
        </View>

        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={styles.skuText} numberOfLines={1}>
              {item?.sku || item?.description || "Item Description"}
            </Text>
            {item.quantity > 0 && (
              <View
                style={[
                  styles.qtyBadge,
                  overLimit ? styles.qtyBadgeDanger : styles.qtyBadgeOk,
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
              <Text style={styles.priceText}>
                Rp {formatRp(item?.RpHargaDasar)}
              </Text>
              <ArrowBigRightDash size={16} color="#2A4B8D" />
            </View>
          )}
          <Text style={styles.priceText}>Rp {formatRp(lineTotal)}</Text>
          {!isPaid && (
            <Pressable onPress={() => onEdit(item)} hitSlop={8}>
              <Pencil size={20} color="#3B82F6" />
            </Pressable>
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
    prev.item?.limitQuantity === next.item?.limitQuantity
);

export const BillItems = memo(({ onEditItem }) => {
  const currentBill = useCurrentBill((state) => state.currentBill);
  const removeFromCurrentBill = useCurrentBill(
    (state) => state.removeFromCurrentBill
  );
  const isPaid = useCurrentBill((state) => state.done);

  const handleRemoveItem = useCallback(
    (item) => {
      removeFromCurrentBill(item);
    },
    [removeFromCurrentBill]
  );

  const handleEditItem = useCallback(
    (item) => {
      onEditItem?.(item);
    },
    [onEditItem]
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
    [handleRemoveItem, handleEditItem, isPaid]
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
    <View style={styles.listWrap}>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  leftActions: {
    width: 24,
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
