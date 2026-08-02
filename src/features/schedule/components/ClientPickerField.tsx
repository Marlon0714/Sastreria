import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { normalizePhone, normalizeText } from "../../../shared/utils/textSearch";

interface ClientPickerFieldProps {
  value: string;
  onChange: (clientId: string) => void;
  errorMessage?: string;
}

export function ClientPickerField({
  value,
  onChange,
  errorMessage,
}: ClientPickerFieldProps) {
  const clientRepository = useClientRepository();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    clientRepository
      .findAll()
      .then((result) => {
        if (!cancelled) {
          setClients(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientRepository]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value],
  );

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    if (!normalizedQuery) {
      return clients;
    }
    const numericQuery = normalizePhone(searchTerm);
    return clients.filter((client) => {
      const normalizedName = normalizeText(
        `${client.firstName} ${client.lastName}`,
      );
      return (
        normalizedName.includes(normalizedQuery) ||
        (numericQuery
          ? normalizePhone(client.phone).includes(numericQuery)
          : false)
      );
    });
  }, [clients, searchTerm]);

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Cargando clientes" />;
  }

  if (!isOpen) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Seleccionar cliente"
          style={[styles.selector, errorMessage ? styles.selectorError : null]}
          onPress={() => setIsOpen(true)}
        >
          <Text style={styles.selectorText}>
            {selectedClient
              ? `${selectedClient.firstName} ${selectedClient.lastName}`
              : "Toca para elegir un cliente"}
          </Text>
        </Pressable>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Buscar cliente"
        placeholder="Buscar por nombre o telefono"
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
        autoFocus
      />
      <FlatList
        style={styles.list}
        data={filteredClients}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay clientes que coincidan.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Elegir a ${item.firstName} ${item.lastName}`}
            style={styles.option}
            onPress={() => {
              onChange(item.id);
              setSearchTerm("");
              setIsOpen(false);
            }}
          >
            <Text style={styles.optionText}>
              {item.firstName} {item.lastName}
            </Text>
          </Pressable>
        )}
      />
      <Pressable
        accessibilityLabel="Cancelar selección de cliente"
        style={styles.cancelButton}
        onPress={() => {
          setSearchTerm("");
          setIsOpen(false);
        }}
      >
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  selector: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  selectorError: {
    borderColor: "#ef4444",
  },
  selectorText: {
    color: "#0f172a",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  list: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionText: {
    color: "#0f172a",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    padding: 16,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
  },
});
