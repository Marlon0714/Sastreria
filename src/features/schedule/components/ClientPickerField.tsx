import { colors } from "../../../shared/theme/colors";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client } from "../../clients/domain/types";
import { normalizeDigitsInput } from "../../../shared/domain/textPatterns";
import {
  findDuplicateByName,
  normalizePhone,
  normalizeText,
} from "../../../shared/utils/textSearch";

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

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addClientError, setAddClientError] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

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

  const resetAddClientState = (): void => {
    setIsAddingClient(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setAddClientError(null);
  };

  const closePicker = (): void => {
    setSearchTerm("");
    resetAddClientState();
    setIsOpen(false);
  };

  const createNewClient = async (): Promise<void> => {
    setIsCreatingClient(true);
    setAddClientError(null);
    try {
      const created = await clientRepository.create({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim() ? normalizeDigitsInput(newPhone.trim()) : "",
      });
      setClients((prev) => [...prev, created]);
      onChange(created.id);
      closePicker();
    } catch {
      setAddClientError("No se pudo crear el cliente. Intenta nuevamente.");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSaveNewClient = (): void => {
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();

    if (!firstName || !lastName) {
      setAddClientError("Nombre y apellido son obligatorios.");
      return;
    }

    const duplicate = findDuplicateByName(clients, firstName, lastName);
    if (duplicate) {
      Alert.alert(
        "Cliente existente",
        `Ya existe un cliente con este nombre${
          duplicate.phone ? `: ${duplicate.phone}` : ""
        }. ¿Es la misma persona?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Usar este cliente",
            onPress: () => {
              onChange(duplicate.id);
              closePicker();
            },
          },
          {
            text: "Crear de todos modos",
            onPress: () => void createNewClient(),
          },
        ],
      );
      return;
    }

    void createNewClient();
  };

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

  if (isAddingClient) {
    return (
      <View style={styles.container}>
        <Text style={styles.addClientTitle}>Cliente nuevo</Text>

        <TextInput
          accessibilityLabel="Nombre del cliente nuevo"
          placeholder="Nombre"
          placeholderTextColor="#94a3b8"
          value={newFirstName}
          onChangeText={setNewFirstName}
          style={styles.searchInput}
          autoFocus
        />
        <TextInput
          accessibilityLabel="Apellido del cliente nuevo"
          placeholder="Apellido"
          placeholderTextColor="#94a3b8"
          value={newLastName}
          onChangeText={setNewLastName}
          style={styles.searchInput}
        />
        <TextInput
          accessibilityLabel="Teléfono del cliente nuevo"
          placeholder="Teléfono (opcional)"
          placeholderTextColor="#94a3b8"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
          style={styles.searchInput}
        />

        {addClientError ? (
          <Text style={styles.errorText}>{addClientError}</Text>
        ) : null}

        <Pressable
          accessibilityLabel="Guardar cliente nuevo"
          style={[
            styles.saveNewClientButton,
            isCreatingClient ? styles.disabledButton : null,
          ]}
          onPress={handleSaveNewClient}
          disabled={isCreatingClient}
        >
          <Text style={styles.saveNewClientButtonText}>
            {isCreatingClient ? "Guardando..." : "Guardar cliente nuevo"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Cancelar cliente nuevo"
          style={styles.cancelButton}
          onPress={resetAddClientState}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Buscar cliente"
        placeholder="Buscar por nombre o telefono"
        placeholderTextColor="#94a3b8"
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
        autoFocus
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {filteredClients.length === 0 ? (
          <Text style={styles.emptyText}>No hay clientes que coincidan.</Text>
        ) : (
          filteredClients.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`Elegir a ${item.firstName} ${item.lastName} (${
                item.phone || item.id
              })`}
              style={styles.option}
              onPress={() => {
                onChange(item.id);
                closePicker();
              }}
            >
              <Text style={styles.optionText}>
                {item.firstName} {item.lastName}
              </Text>
              {item.phone ? (
                <Text style={styles.optionSubtext}>{item.phone}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable
        accessibilityLabel="Crear cliente nuevo"
        style={styles.addClientButton}
        onPress={() => {
          setNewFirstName(searchTerm.trim());
          setIsAddingClient(true);
        }}
      >
        <Text style={styles.addClientButtonText}>+ Crear cliente nuevo</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Cancelar selección de cliente"
        style={styles.cancelButton}
        onPress={closePicker}
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
    borderColor: colors.danger,
  },
  selectorText: {
    color: "#0f172a",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#0f172a",
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
  optionSubtext: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    padding: 16,
  },
  addClientButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  addClientButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  addClientTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  saveNewClientButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveNewClientButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
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
