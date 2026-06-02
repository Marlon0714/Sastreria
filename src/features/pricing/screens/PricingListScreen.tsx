import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { usePricingServices } from "../hooks/usePricingServices";
import PricingItem from "../components/PricingItem";
import { pricingStrings } from "../domain/strings";
import {
  PRICING_CATEGORY_LABELS,
  type PricingCategory,
} from "../domain/pricingService";
import { LoadingView, ErrorView } from "../../../shared/components";
import type { PricingStackParamList } from "../../../navigation/types";

type PricingListScreenNavProp = NativeStackNavigationProp<
  PricingStackParamList,
  "PricingList"
>;

const CATEGORIES: PricingCategory[] = ["arreglo", "confeccion"];
const CATEGORY_ICONS: Record<PricingCategory, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};
const CATEGORY_EMPTY_SUBTITLE: Record<PricingCategory, string> = {
  arreglo: "Agrega servicios de arreglos como dobladillos, ruedos, etc.",
  confeccion: "Agrega servicios de confección como camisas, pantalones, etc.",
};

export default function PricingListScreen() {
  const navigation = useNavigation<PricingListScreenNavProp>();
  const { services, loading, error, refresh, syncStatus, isOffline } =
    usePricingServices();
  const [activeCategory, setActiveCategory] =
    useState<PricingCategory>("arreglo");
  const [query, setQuery] = useState("");

  const categoryServices = useMemo(
    () => services.filter((s) => s.category === activeCategory),
    [services, activeCategory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoryServices;
    return categoryServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q),
    );
  }, [categoryServices, query]);

  const countByCategory = useMemo(
    () => ({
      arreglo: services.filter((s) => s.category === "arreglo").length,
      confeccion: services.filter((s) => s.category === "confeccion").length,
    }),
    [services],
  );

  if (loading) return <LoadingView message="Cargando precios..." />;
  if (error)
    return <ErrorView message={pricingStrings.fetchError} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠ {pricingStrings.offlineBanner}
          </Text>
        </View>
      )}
      {syncStatus === "pending" && !isOffline && (
        <View style={[styles.banner, styles.bannerSync]}>
          <Text style={styles.bannerText}>↑ {pricingStrings.syncPending}</Text>
        </View>
      )}

      {/* Segmented control */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmented}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => {
                  setActiveCategory(cat);
                  setQuery("");
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {CATEGORY_ICONS[cat]} {PRICING_CATEGORY_LABELS[cat]}
                </Text>
                {countByCategory[cat] > 0 && (
                  <View
                    style={[
                      styles.badge,
                      isActive ? styles.badgeActive : styles.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isActive && styles.badgeTextActive,
                      ]}
                    >
                      {countByCategory[cat]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Buscador — solo visible si hay servicios en la categoría activa */}
      {categoryServices.length > 0 && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={`Buscar en ${PRICING_CATEGORY_LABELS[activeCategory].toLowerCase()}...`}
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Buscar servicio por nombre"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery("")}
                style={styles.clearButton}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            )}
          </View>
          {query.length > 0 && (
            <Text style={styles.resultsCount}>
              {filtered.length === 0
                ? "Sin resultados"
                : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.listContent
        }
        renderItem={({ item }) => (
          <PricingItem
            service={item}
            onPress={() =>
              navigation.navigate("PricingDetail", { id: item.id })
            }
          />
        )}
        onRefresh={refresh}
        refreshing={loading}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {query.length > 0 ? (
              <>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptySubtitle}>
                  No hay servicios que coincidan con "{query}".
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>
                  {CATEGORY_ICONS[activeCategory]}
                </Text>
                <Text style={styles.emptyTitle}>
                  Sin {PRICING_CATEGORY_LABELS[activeCategory].toLowerCase()}{" "}
                  aún
                </Text>
                <Text style={styles.emptySubtitle}>
                  {CATEGORY_EMPTY_SUBTITLE[activeCategory]}
                </Text>
              </>
            )}
          </View>
        }
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() =>
          navigation.navigate("PricingForm", { category: activeCategory })
        }
        accessibilityLabel={`Agregar ${PRICING_CATEGORY_LABELS[activeCategory].toLowerCase()}`}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  segmentedWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#1e40af",
    fontWeight: "700",
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: "#dbeafe",
  },
  badgeInactive: {
    backgroundColor: "#cbd5e1",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  badgeTextActive: {
    color: "#1e40af",
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 13,
    color: "#94a3b8",
  },
  resultsCount: {
    fontSize: 12,
    color: "#64748b",
    paddingLeft: 4,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  banner: {
    backgroundColor: "#fef2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerSync: {
    backgroundColor: "#fffbeb",
    borderBottomColor: "#fde68a",
  },
  bannerText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: "#1e3a8a",
    transform: [{ scale: 0.96 }],
  },
  fabIcon: {
    fontSize: 28,
    color: "#fff",
    lineHeight: 32,
  },
});
