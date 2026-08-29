import { colors } from "../../../shared/theme/colors";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getDefaultProfilesCacheRepository } from "../../../data/local/profilesCacheDependencies";
import type { Profile } from "../../auth/domain/profile";
import { normalizeText } from "../../../shared/utils/textSearch";

interface OperarioPickerFieldProps {
  value?: string;
  onChange: (operarioId: string | undefined) => void;
  errorMessage?: string;
}

export function OperarioPickerField({
  value,
  onChange,
  errorMessage,
}: OperarioPickerFieldProps) {
  const [operarios, setOperarios] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Se incrementa desde "Reintentar" para forzar un nuevo intento de carga
  // sin duplicar la lógica del efecto.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    const repo = getDefaultProfilesCacheRepository();
    repo
      .getOperarios()
      .then((result) => {
        if (!cancelled) {
          setOperarios(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("No se pudo cargar la lista de operarios.");
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
  }, [retryToken]);

  const selectedOperario = useMemo(
    () => operarios.find((operario) => operario.id === value) ?? null,
    [operarios, value],
  );

  const filteredOperarios = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    if (!normalizedQuery) {
      return operarios;
    }
    return operarios.filter((operario) =>
      normalizeText(operario.displayName).includes(normalizedQuery),
    );
  }, [operarios, searchTerm]);

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Cargando operarios" />;
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable
          accessibilityLabel="Reintentar cargar operarios"
          style={styles.retryButton}
          onPress={() => setRetryToken((token) => token + 1)}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!isOpen) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Seleccionar operario"
          style={[styles.selector, errorMessage ? styles.selectorError : null]}
          onPress={() => setIsOpen(true)}
        >
          <Text style={styles.selectorText}>
            {selectedOperario
              ? selectedOperario.displayName
              : "Sin operario asignado"}
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
        accessibilityLabel="Buscar operario"
        placeholder="Buscar por nombre"
        placeholderTextColor="#94a3b8"
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
        autoFocus
      />
      <Pressable
        accessibilityLabel="Quitar operario asignado"
        style={styles.clearOption}
        onPress={() => {
          onChange(undefined);
          setSearchTerm("");
          setIsOpen(false);
        }}
      >
        <Text style={styles.clearOptionText}>Sin operario asignado</Text>
      </Pressable>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {filteredOperarios.length === 0 ? (
          <Text style={styles.emptyText}>No hay operarios que coincidan.</Text>
        ) : (
          filteredOperarios.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`Elegir a ${item.displayName}`}
              style={styles.option}
              onPress={() => {
                onChange(item.id);
                setSearchTerm("");
                setIsOpen(false);
              }}
            >
              <Text style={styles.optionText}>{item.displayName}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable
        accessibilityLabel="Cancelar selección de operario"
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
    borderColor: colors.danger,
  },
  selectorText: {
    color: "#0f172a",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  retryButtonText: {
    color: colors.primary,
    fontWeight: "600",
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
  clearOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearOptionText: {
    color: "#64748b",
    fontStyle: "italic",
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
