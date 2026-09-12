import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type PickerMode = "date" | "time";
type PickerVariant = "field" | "dayNavigator" | "iconTrigger";

interface ScheduleDateTimePickerFieldProps {
  mode: PickerMode;
  /** "YYYY-MM-DD" si mode="date", "HH:mm" si mode="time". */
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  accessibilityLabel: string;
  allowClear?: boolean;
  errorMessage?: string;
  /**
   * "field" (por defecto): look de campo de formulario, para usarse junto a
   * otros inputs (ej. ScheduleFormScreen). "dayNavigator": look de botón
   * destacado sin borde, para el selector de día de ScheduleDayViewScreen —
   * ahí la fecha es el elemento principal de la pantalla, no un campo más.
   * "iconTrigger": solo un ícono de calendario (sin mostrar la fecha) — para
   * abrir el selector de fecha exacta junto a la tira de 7 días, sin
   * duplicar la lógica de parseo/formato en otro componente.
   */
  variant?: PickerVariant;
}

function parseValue(mode: PickerMode, value?: string): Date {
  const now = new Date();
  if (!value) {
    return now;
  }

  if (mode === "date") {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? now.getFullYear(), (month ?? 1) - 1, day ?? 1);
  }

  const [hours, minutes] = value.split(":").map(Number);
  const result = new Date(now);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

function formatValue(mode: PickerMode, date: Date): string {
  if (mode === "date") {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

function formatDisplay(
  mode: PickerMode,
  variant: PickerVariant,
  value?: string,
): string | null {
  if (!value) {
    return null;
  }

  if (mode === "date") {
    const date = parseValue("date", value);

    if (variant === "dayNavigator") {
      return capitalize(
        date.toLocaleDateString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "short",
        }),
      );
    }

    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return value;
}

export function ScheduleDateTimePickerField({
  mode,
  value,
  onChange,
  placeholder,
  accessibilityLabel,
  allowClear = true,
  errorMessage,
  variant = "field",
}: ScheduleDateTimePickerFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    // Android cierra el diálogo solo y dispara este callback con
    // selectedDate=undefined si se cancela ("dismissed") — no hay nada que
    // guardar en ese caso, solo ocultar el picker.
    setIsPickerVisible(false);
    if (selectedDate) {
      onChange(formatValue(mode, selectedDate));
    }
  };

  const displayValue = formatDisplay(mode, variant, value);
  const isDayNavigator = variant === "dayNavigator";

  if (variant === "iconTrigger") {
    return (
      <View>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          style={styles.iconTriggerButton}
          onPress={() => setIsPickerVisible(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Pressable>
        {isPickerVisible ? (
          <DateTimePicker
            value={parseValue(mode, value)}
            mode={mode}
            display="default"
            onChange={handleChange}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          style={[
            isDayNavigator ? styles.selectorDayNavigator : styles.selector,
            errorMessage ? styles.selectorError : null,
          ]}
          onPress={() => setIsPickerVisible(true)}
        >
          <Text
            style={
              isDayNavigator ? styles.selectorTextDayNavigator : styles.selectorText
            }
          >
            {displayValue ?? placeholder}
          </Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityLabel={`Quitar ${accessibilityLabel.toLowerCase()}`}
            style={styles.clearButton}
            onPress={() => onChange(undefined)}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {isPickerVisible ? (
        <DateTimePicker
          value={parseValue(mode, value)}
          mode={mode}
          display="default"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconTriggerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  container: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selector: {
    flex: 1,
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
  selectorDayNavigator: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
  },
  selectorTextDayNavigator: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "700",
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
