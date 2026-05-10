import React from "react";
import {
  View,
  FlatList,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import { usePricingServices } from "../hooks/usePricingServices";
import PricingItem from "../components/PricingItem";
import { pricingStrings } from "../domain/strings";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PricingStackParamList } from "../../../navigation/types";
import { useNavigation } from "@react-navigation/native";

type PricingListScreenNavProp = NativeStackNavigationProp<
  PricingStackParamList,
  "PricingList"
>;

export default function PricingListScreen() {
  const navigation = useNavigation<PricingListScreenNavProp>();
  const { services, loading, error, refresh, syncStatus, isOffline } =
    usePricingServices();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>{pricingStrings.title}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{pricingStrings.fetchError}</Text>
        <Text onPress={refresh} style={styles.link}>
          {pricingStrings.save}
        </Text>
      </View>
    );
  }

  if (!services.length) {
    return (
      <View style={styles.centered}>
        <Text>{pricingStrings.notFound}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {isOffline && (
        <Text style={{ color: "#b00020", margin: 8 }}>
          {pricingStrings.offlineBanner}
        </Text>
      )}
      {syncStatus === "pending" && !isOffline && (
        <Text style={{ color: "#b00020", margin: 8 }}>
          {pricingStrings.syncPending}
        </Text>
      )}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  error: {
    color: "#b00020",
    marginBottom: 8,
  },
  link: {
    color: "#1976d2",
    textDecorationLine: "underline",
    marginTop: 8,
  },
});
