import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors } from "../theme/colors";

// Por debajo de este ancho lógico el menú no intenta anclarse "hacia la
// derecha" con ancho propio (podría no caber o quedar cortado contra el
// borde de la pantalla): cae a ancho completo (`left:0, right:0`). Umbral
// deliberadamente conservador — la gran mayoría de teléfonos reales superan
// los 360dp de ancho lógico (ver Decisión de Diseño 4 del plan).
const NARROW_SCREEN_WIDTH_THRESHOLD = 340;

export interface FilterChipDropdownOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel: string;
}

interface FilterChipDropdownProps<T extends string> {
  chipLabel: string;
  chipAccessibilityLabel: string;
  options: FilterChipDropdownOption<T>[];
  activeValue: T;
  onSelect: (value: T) => void;
}

/**
 * Chip colapsado + overlay de opciones anclado al mismo borde izquierdo
 * donde ya empieza el chip (gracias a `alignSelf:"flex-start"` del chip
 * dentro del wrapper `position:"relative"`), extendiéndose hacia la derecha
 * desde ahí — no al borde derecho del contenedor (bug corregido: anclar a
 * `right:0` del wrapper de ancho completo dejaba el menú pegado al borde
 * derecho de la PANTALLA, lejos del chip alineado a la izquierda; ver
 * Decisión de Diseño 3 del plan de N-110, corregida tras verificación visual
 * post-implementación). Genérico sobre `T extends string`: no conoce ningún
 * tipo de dominio (`FilterOption`, `PeriodMode`, etc.), solo recibe labels y
 * un callback. Reemplaza el bloque `filterWrapper`/`filterChip`/`filterMenu`
 * que antes vivía duplicado en `ScheduleDayViewScreen.tsx` y
 * `PeriodSelectorField.tsx`.
 *
 * El menú se renderiza con `position:"absolute"` (no `Modal`) sobre el
 * contenido de abajo, sin empujarlo — mismo patrón ya usado en `fabButton`/
 * `LogViewerToggle`/`SyncStatusBanner`. No hay backdrop de cierre al tocar
 * fuera (decisión explícita, ver plan): se cierra al elegir una opción o al
 * volver a tocar el chip.
 */
export function FilterChipDropdown<T extends string>({
  chipLabel,
  chipAccessibilityLabel,
  options,
  activeValue,
  onSelect,
}: FilterChipDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isNarrowScreen = width < NARROW_SCREEN_WIDTH_THRESHOLD;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel={chipAccessibilityLabel}
        accessibilityState={{ expanded: isOpen }}
        style={styles.chip}
        onPress={() => setIsOpen((open) => !open)}
      >
        <Text style={styles.chipText}>{chipLabel}</Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {isOpen ? (
        <View
          testID="filter-chip-dropdown-menu"
          style={[
            styles.menu,
            isNarrowScreen ? styles.menuFullWidth : styles.menuAnchoredLeft,
          ]}
        >
          {options.map((option) => {
            const isActive = option.value === activeValue;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive }}
                accessibilityLabel={option.accessibilityLabel}
                style={[styles.option, isActive && styles.optionActive]}
                onPress={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  menu: {
    position: "absolute",
    top: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    // El `zIndex` solo no garantiza el orden de pintado correcto en Android
    // en todas las versiones — se acompaña de `elevation` (mismo patrón ya
    // usado en otros overlays del proyecto, ver `fabButton`/`LogViewerToggle`).
    zIndex: 10,
    elevation: 6,
  },
  // Ancla el menú al mismo borde izquierdo donde ya empieza el chip
  // (`alignSelf:"flex-start"` dentro del wrapper `position:"relative"`),
  // extendiéndolo hacia la derecha desde ahí en vez de pegarlo al borde
  // derecho de la pantalla. Sin `right`, el ancho se ajusta al contenido —
  // `minWidth`/`maxWidth` evitan que quede demasiado angosto con labels
  // cortos ("Día") o que un label largo ("🧵 Confecciones (99)") empuje el
  // menú fuera del borde derecho de la pantalla.
  menuAnchoredLeft: {
    left: 0,
    minWidth: 180,
    maxWidth: 260,
  },
  menuFullWidth: {
    left: 0,
    right: 0,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
