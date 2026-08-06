import { colors } from "../../../shared/theme/colors";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

const MAX_SUGGESTIONS = 5;

interface ClientPickerFieldProps {
  clientId?: string;
  unregisteredName?: string;
  onChangeClientId: (clientId: string | undefined) => void;
  onChangeUnregisteredName: (name: string | undefined) => void;
  errorMessage?: string;
}

export function ClientPickerField({
  clientId,
  unregisteredName,
  onChangeClientId,
  onChangeUnregisteredName,
  errorMessage,
}: ClientPickerFieldProps) {
  const clientRepository = useClientRepository();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameInput, setNameInput] = useState(unregisteredName ?? "");

  const [isRegistering, setIsRegistering] = useState(false);
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
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

  // Mantiene el texto sincronizado si el nombre "sin registrar" cambia desde
  // afuera (ej. al cargar un turno existente en el formulario de edición).
  useEffect(() => {
    if (!clientId) {
      setNameInput(unregisteredName ?? "");
    }
  }, [unregisteredName, clientId]);

  const selectedClient = useMemo(
    () => (clientId ? (clients.find((c) => c.id === clientId) ?? null) : null),
    [clients, clientId],
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeText(nameInput.trim());
    if (!normalizedQuery) {
      return [];
    }
    const numericQuery = normalizePhone(nameInput);
    return clients
      .filter((client) => {
        const normalizedName = normalizeText(
          `${client.firstName} ${client.lastName}`,
        );
        return (
          normalizedName.includes(normalizedQuery) ||
          (numericQuery
            ? normalizePhone(client.phone).includes(numericQuery)
            : false)
        );
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [clients, nameInput]);

  const resetRegisterState = (): void => {
    setIsRegistering(false);
    setNewLastName("");
    setNewPhone("");
    setRegisterError(null);
  };

  const selectClient = (client: Client): void => {
    onChangeClientId(client.id);
    onChangeUnregisteredName(undefined);
    setNameInput(`${client.firstName} ${client.lastName}`);
    resetRegisterState();
  };

  const createNewClient = async (
    firstName: string,
    lastName: string,
  ): Promise<void> => {
    setIsCreatingClient(true);
    setRegisterError(null);
    try {
      const created = await clientRepository.create({
        firstName,
        lastName,
        phone: newPhone.trim() ? normalizeDigitsInput(newPhone.trim()) : "",
      });
      setClients((prev) => [...prev, created]);
      selectClient(created);
    } catch {
      setRegisterError("No se pudo crear el cliente. Intenta nuevamente.");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleRegisterPress = (): void => {
    const firstName = nameInput.trim();
    const lastName = newLastName.trim();

    if (!firstName || !lastName) {
      setRegisterError("Nombre y apellido son obligatorios.");
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
            onPress: () => selectClient(duplicate),
          },
          {
            text: "Crear de todos modos",
            onPress: () => void createNewClient(firstName, lastName),
          },
        ],
      );
      return;
    }

    void createNewClient(firstName, lastName);
  };

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Cargando clientes" />;
  }

  if (selectedClient) {
    return (
      <View style={styles.container}>
        <View style={styles.selector}>
          <Text style={styles.selectorText}>
            {selectedClient.firstName} {selectedClient.lastName}
          </Text>
          {selectedClient.phone ? (
            <Text style={styles.optionSubtext}>{selectedClient.phone}</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Cambiar cliente"
          style={styles.cancelButton}
          onPress={() => {
            onChangeClientId(undefined);
            setNameInput("");
          }}
        >
          <Text style={styles.cancelButtonText}>Cambiar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Nombre del cliente"
        placeholder="Nombre de quien agenda"
        placeholderTextColor="#94a3b8"
        value={nameInput}
        onChangeText={(text) => {
          setNameInput(text);
          onChangeUnregisteredName(text.trim() ? text : undefined);
        }}
        style={[styles.searchInput, errorMessage ? styles.selectorError : null]}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`Elegir a ${item.firstName} ${item.lastName} (${
                item.phone || item.id
              })`}
              style={styles.option}
              onPress={() => selectClient(item)}
            >
              <Text style={styles.optionText}>
                {item.firstName} {item.lastName}
              </Text>
              {item.phone ? (
                <Text style={styles.optionSubtext}>{item.phone}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {isRegistering ? (
        <View style={styles.registerForm}>
          <Text style={styles.addClientTitle}>Registrar cliente</Text>
          <TextInput
            accessibilityLabel="Apellido del cliente nuevo"
            placeholder="Apellido"
            placeholderTextColor="#94a3b8"
            value={newLastName}
            onChangeText={setNewLastName}
            style={styles.searchInput}
            autoFocus
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

          {registerError ? (
            <Text style={styles.errorText}>{registerError}</Text>
          ) : null}

          <Pressable
            accessibilityLabel="Crear cliente"
            style={[
              styles.saveNewClientButton,
              isCreatingClient ? styles.disabledButton : null,
            ]}
            onPress={handleRegisterPress}
            disabled={isCreatingClient}
          >
            <Text style={styles.saveNewClientButtonText}>
              {isCreatingClient ? "Guardando..." : "Crear cliente"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Cancelar registro de cliente"
            style={styles.cancelButton}
            onPress={resetRegisterState}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Registrar cliente"
          style={styles.addClientButton}
          onPress={() => {
            setRegisterError(null);
            setIsRegistering(true);
          }}
        >
          <Text style={styles.addClientButtonText}>+ Registrar cliente</Text>
        </Pressable>
      )}
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
    fontSize: 13,
    marginTop: 2,
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
  registerForm: {
    gap: 6,
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
