import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { PricingStackParamList } from "../../../navigation/types";
import { usePricingDetail } from "../hooks/usePricingDetail";
import { pricingStrings, formatPrice } from "../domain/strings";
import { PricingServiceRepositoryImpl } from "../../../data/local/PricingServiceRepositoryImpl";
import { LoadingView, ErrorView } from "../../../shared/components";

type PricingDetailScreenRouteProp = RouteProp<
  PricingStackParamList,
  "PricingDetail"
>;
type PricingDetailScreenNavProp = NativeStackNavigationProp<
  PricingStackParamList,
  "PricingDetail"
>;

const repo = new PricingServiceRepositoryImpl();

export default function PricingDetailScreen() {
  const route = useRoute<PricingDetailScreenRouteProp>();
  const navigation = useNavigation<PricingDetailScreenNavProp>();
  const { id } = route.params;
  const { service, loading, error } = usePricingDetail(id);

  if (loading) return <LoadingView message="Cargando servicio..." />;
  if (error || !service)
    return <ErrorView message={error ?? pricingStrings.notFound} />;

  const handleDelete = () => {
    Alert.alert(pricingStrings.deletePricing, pricingStrings.confirmDelete, [
      { text: pricingStrings.cancel, style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await repo.delete(id);
            navigation.goBack();
          } catch {
            Alert.alert("Error", pricingStrings.deleteError);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
        {service.syncStatus === "pending" && (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>↑ Pendiente de sincronizar</Text>
          </View>
        )}
      </View>

      {/* Notas */}
      {service.notes ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Notas</Text>
          <Text style={styles.cardValue}>{service.notes}</Text>
        </View>
      ) : null}

      {/* Fechas */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Creado</Text>
        <Text style={styles.cardValue}>
          {new Date(service.createdAt).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        {service.updatedAt !== service.createdAt && (
          <>
            <Text style={[styles.cardLabel, { marginTop: 10 }]}>
              Última modificación
            </Text>
            <Text style={styles.cardValue}>
              {new Date(service.updatedAt).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </>
        )}
      </View>

      {/* Editar */}
      <Pressable
        style={({ pressed }) => [
          styles.editButton,
          pressed && styles.editButtonPressed,
        ]}
        onPress={() => navigation.navigate("PricingForm", { id: service.id })}
      >
        <Text style={styles.editButtonText}>✏ Editar servicio</Text>
      </Pressable>

      {/* Eliminar */}
      <Pressable
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.deleteButtonPressed,
        ]}
        onPress={handleDelete}
      >
        <Text style={styles.deleteButtonText}>🗑 Eliminar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    backgroundColor: "#1e40af",
    borderRadius: 16,
    padding: 24,
    gap: 6,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  servicePrice: {
    fontSize: 32,
    fontWeight: "800",
    color: "#bfdbfe",
    marginTop: 4,
  },
  syncBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  syncBadgeText: {
    fontSize: 12,
    color: "#e0f2fe",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    color: "#1e293b",
  },
  editButton: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  editButtonPressed: {
    backgroundColor: "#1e3a8a",
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  deleteButtonPressed: {
    backgroundColor: "#fef2f2",
  },
  deleteButtonText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
  },
});
