import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { apiGet, apiPatch } from "@/lib/api";

interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
  category: string;
  checked: boolean;
}

interface ShoppingListData {
  id: number | null;
  date: string;
  items: ShoppingItem[];
}

interface StoreData {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  openNow: boolean | null;
  distance: number | null;
}

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const categoryIconMap: Record<string, IoniconsName> = {
  Produce: "leaf",
  Protein: "nutrition",
  "Grains & Legumes": "grid",
  Pantry: "cube",
  Dairy: "water",
};
const defaultCategoryIcon: IoniconsName = "ellipsis-horizontal";

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const todayDate = new Date().toISOString().split("T")[0];

  const { data: shoppingData, isLoading } = useQuery<ShoppingListData>({
    queryKey: ["shoppingList", todayDate],
    queryFn: () => apiGet(`/api/shopping-list?date=${todayDate}`),
  });

  const { data: storesData } = useQuery<{ stores: StoreData[] }>({
    queryKey: ["nearbyStores"],
    queryFn: () => apiGet("/api/shopping-list/stores"),
  });

  const toggleMutation = useMutation({
    mutationFn: (body: { date: string; itemName: string; checked: boolean }) =>
      apiPatch("/api/shopping-list/check", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
  });

  const items = shoppingData?.items || [];
  const stores = storesData?.stores || [];

  const grouped = items.reduce(
    (acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>
  );

  const totalItems = items.length;
  const checkedCount = items.filter((i) => i.checked).length;

  const handleToggle = async (item: ShoppingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMutation.mutate({
      date: todayDate,
      itemName: item.name,
      checked: !item.checked,
    });
  };

  const handleCopyAll = async () => {
    const text = items.map((i) => `${i.name} - ${i.amount} ${i.unit}`).join("\n");
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Shopping list copied to clipboard");
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: isWeb ? 67 : insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading shopping list...</Text>
        </View>
      </View>
    );
  }

  const progressPct = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <View style={[styles.container, { paddingTop: isWeb ? 67 : insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shopping List</Text>
          <Text style={styles.subtitle}>
            {checkedCount} of {totalItems} items checked
          </Text>
        </View>
        <Pressable onPress={handleCopyAll} style={styles.shareBtn}>
          <Feather name="share" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {totalItems > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[Colors.primary, "#4ADE80"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${progressPct}%` },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        {totalItems === 0 ? (
          <View style={styles.emptyState}>
            <Feather
              name="shopping-cart"
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No shopping list yet</Text>
            <Text style={styles.emptyDesc}>
              Generate recipes to auto-create your shopping list
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.bulkActions}>
              <Pressable onPress={handleCopyAll} style={styles.bulkButton}>
                <Feather name="clipboard" size={14} color={Colors.textSecondary} />
                <Text style={styles.bulkButtonText}>Copy all</Text>
              </Pressable>
            </View>

            {Object.entries(grouped).map(([category, catItems]) => {
              const catChecked = catItems.filter((i) => i.checked).length;
              const iconName = categoryIconMap[category] ?? defaultCategoryIcon;
              return (
                <View key={category} style={styles.aisleSection}>
                  <View style={styles.aisleHeader}>
                    <View style={styles.aisleIconContainer}>
                      <Ionicons
                        name={iconName}
                        size={16}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.aisleTitle}>{category}</Text>
                    <Text style={styles.aisleCount}>
                      {catChecked}/{catItems.length}
                    </Text>
                  </View>
                  {catItems.map((item, idx) => (
                    <Pressable
                      key={`${category}-${idx}`}
                      onPress={() => handleToggle(item)}
                      style={[
                        styles.itemRow,
                        item.checked && styles.itemRowChecked,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          item.checked && styles.checkboxChecked,
                        ]}
                      >
                        {item.checked && (
                          <Feather name="check" size={12} color="#fff" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.itemName,
                            item.checked && styles.itemNameChecked,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.itemAmount}>
                        {item.amount} {item.unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}

            {stores.length > 0 && (
              <View style={styles.storesSection}>
                <Text style={styles.storesSectionTitle}>Nearby Stores</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storesScrollContent}
                >
                  {stores.slice(0, 5).map((store) => (
                    <View key={store.id} style={styles.storeCard}>
                      <View style={styles.storeIconContainer}>
                        <Ionicons name="storefront" size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                      <Text style={styles.storeAddress} numberOfLines={2}>
                        {store.address}
                      </Text>
                      <View style={styles.storeFooter}>
                        {store.rating != null && (
                          <View style={styles.ratingBadge}>
                            <Feather name="star" size={10} color={Colors.accent} />
                            <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                          </View>
                        )}
                        {store.openNow != null && (
                          <Text style={[styles.openText, { color: store.openNow ? Colors.primary : Colors.error }]}>
                            {store.openNow ? "Open" : "Closed"}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  bulkActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bulkButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  aisleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  aisleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  aisleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  aisleTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    flex: 1,
  },
  aisleCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
  },
  itemRowChecked: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  itemAmount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  storesSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  storesSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  storesScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  storeCard: {
    width: 160,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  storeAddress: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  storeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  openText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
