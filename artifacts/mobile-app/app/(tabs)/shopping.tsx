import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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
  aisle: string;
  recipeTitle?: string;
}

interface ShoppingListData {
  id: number;
  date: string;
  itemsJson: ShoppingItem[];
  checkedItems: string[];
}

interface StoreData {
  name: string;
  address: string;
  rating: number;
  distance?: number;
  isOpen?: boolean;
}

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();
  const todayDate = new Date().toISOString().split("T")[0];

  const { data: shoppingData, isLoading } = useQuery<ShoppingListData>({
    queryKey: ["shoppingList", todayDate],
    queryFn: () => apiGet(`/api/shopping-list?date=${todayDate}`),
  });

  const toggleMutation = useMutation({
    mutationFn: (body: { date: string; itemName: string }) =>
      apiPatch("/api/shopping-list/check", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
  });

  const items = shoppingData?.itemsJson || [];
  const checkedItems = new Set(shoppingData?.checkedItems || []);

  const grouped = items.reduce(
    (acc, item) => {
      const aisle = item.aisle || "Other";
      if (!acc[aisle]) acc[aisle] = [];
      acc[aisle].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>
  );

  const totalItems = items.length;
  const checkedCount = items.filter((i) => checkedItems.has(i.name)).length;

  const handleToggle = async (itemName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMutation.mutate({ date: todayDate, itemName });
  };

  const handleCopyAll = async () => {
    const text = items.map((i) => `${i.name} - ${i.amount} ${i.unit}`).join("\n");
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Shopping list copied to clipboard");
  };

  const aisleIcons: Record<string, string> = {
    Produce: "leaf",
    Protein: "nutrition",
    "Grains & Legumes": "grid",
    Pantry: "cube",
    Dairy: "water",
    Other: "ellipsis-horizontal",
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
                {
                  width: totalItems > 0
                    ? `${(checkedCount / totalItems) * 100}%` as any
                    : "0%",
                },
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

            {Object.entries(grouped).map(([aisle, aisleItems]) => {
              const aisleChecked = aisleItems.filter((i) =>
                checkedItems.has(i.name)
              ).length;
              return (
                <View key={aisle} style={styles.aisleSection}>
                  <View style={styles.aisleHeader}>
                    <View style={styles.aisleIconContainer}>
                      <Ionicons
                        name={aisleIcons[aisle] as any || "ellipsis-horizontal"}
                        size={16}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.aisleTitle}>{aisle}</Text>
                    <Text style={styles.aisleCount}>
                      {aisleChecked}/{aisleItems.length}
                    </Text>
                  </View>
                  {aisleItems.map((item, idx) => {
                    const isChecked = checkedItems.has(item.name);
                    return (
                      <Pressable
                        key={`${aisle}-${idx}`}
                        onPress={() => handleToggle(item.name)}
                        style={[
                          styles.itemRow,
                          isChecked && styles.itemRowChecked,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            isChecked && styles.checkboxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Feather name="check" size={12} color="#fff" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.itemName,
                              isChecked && styles.itemNameChecked,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.recipeTitle && (
                            <Text style={styles.itemRecipe}>
                              {item.recipeTitle}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.itemAmount}>
                          {item.amount} {item.unit}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
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
  itemRecipe: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
});
