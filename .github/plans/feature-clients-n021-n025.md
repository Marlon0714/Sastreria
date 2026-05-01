# Plan de Implementación: Pantallas de Medidas — N-021 a N-025

**Track D — Feature `clients`**
**Rama:** `feature/clients/n021-n025-screens`
**Fecha de plan:** 2026-04-30
**Estado:** Listo para Builder

---

## Contexto

El análisis del repositorio muestra el siguiente estado real de las pre-condiciones:

| Necesidad                                                                 | Estado verificado                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-016 — Domain types + schemas                                            | ✅ Completo (`types.ts`, `schemas.ts`)                                                                                                                                                                                                                      |
| N-017 — SQLite migration v2                                               | ⚠️ No verificado directamente (leer `migrations.ts`)                                                                                                                                                                                                        |
| N-018 — `MeasurementRepository` interface + impl                          | ❌ **BLOQUEANTE**: `domain/repository.ts` todavía expone solo `addMeasurement` y `findMeasurementsByClientId`. Los métodos `upsertCamisa`, `upsertPantalon`, `findCamisaByClientId`, `findPantalonByClientId` que los hooks llaman no están en la interfaz. |
| N-019 — Hooks `useUpsertCamisa/Pantalon`, `useCamisa/PantalonMeasurement` | ⚠️ Archivos existen en `hooks/` pero no compilan hasta que N-018 esté completo                                                                                                                                                                              |
| N-020 — Navigation types                                                  | ✅ Completo (`navigation/types.ts` tiene todas las rutas nuevas)                                                                                                                                                                                            |
| N-028 — `CamisaMeasurementForm`, `PantalonMeasurementForm`                | ✅ Completo (ambos componentes en `features/clients/components/`)                                                                                                                                                                                           |
| N-026 — `ClientDetailScreen` refactoring                                  | ❌ Pendiente: sigue navegando a rutas deprecated (`MeasurementCreate`, `MeasurementHistory`)                                                                                                                                                                |

**Consecuencia:** El Builder debe completar N-018 como **Tarea 0** antes de cualquier screen. Esto desbloquea la compilación de los hooks ya escritos.

---

## Pre-condición: Tarea 0 — Completar N-018 (Bloqueante)

> Esta tarea no es parte del scope N-021..N-025 pero la compilación TypeScript fallará sin ella. Si el Builder de Track B ya la completó en una rama paralela, hacer rebase antes de arrancar.

**Archivos a modificar:**

### `src/features/clients/domain/repository.ts`

Reemplazar la interfaz `MeasurementRepository` obsoleta por:

```ts
// Agregar imports al inicio:
import type {
  AddMeasurementDTO,
  CamisaMeasurement,
  Client,
  CreateClientDTO,
  Measurement,
  PantalonMeasurement,
  UpsertCamisaDTO,
  UpsertPantalonDTO,
} from "./types";

export interface MeasurementRepository {
  /** @deprecated Reemplazado por upsertCamisa/upsertPantalon. Eliminar con N-019 cleanup. */
  addMeasurement(input: AddMeasurementDTO): Promise<Measurement>;
  /** @deprecated Reemplazado por findCamisaByClientId/findPantalonByClientId. */
  findMeasurementsByClientId(clientId: string): Promise<Measurement[]>;

  upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement>;
  upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement>;
  findCamisaByClientId(clientId: string): Promise<CamisaMeasurement | null>;
  findPantalonByClientId(clientId: string): Promise<PantalonMeasurement | null>;
}
```

### `src/data/local/MeasurementRepositoryImpl.ts`

Agregar las cuatro implementaciones usando el patrón `INSERT ... ON CONFLICT(client_id) DO UPDATE`. Ver plan `sprint-clients-polish.md` §N-018 para el SQL completo.

---

## Tarea 1 — Factories de test para CamisaMeasurement y PantalonMeasurement

**Tipo:** Datos / Test infrastructure  
**Archivos a crear/modificar:**

- **Crear** `src/__tests__/factories/camisaMeasurementFactory.ts`
- **Crear** `src/__tests__/factories/pantalonMeasurementFactory.ts`
- **Modificar** `src/__tests__/factories/index.ts` — re-exportar las dos nuevas factories

**Justificación:** Las factories son requeridas por los tests de N-022, N-023, N-024 y N-025. Crearlas una sola vez aquí evita duplicación.

**Contrato de las factories:**

```ts
// camisaMeasurementFactory.ts
import type { CamisaMeasurement } from "../../features/clients/domain/types";

const DEFAULT_CAMISA: CamisaMeasurement = {
  id: "33333333-3333-4333-8333-333333333333",
  clientId: "11111111-1111-4111-8111-111111111111",
  espalda: 42,
  hombro: 38,
  talleDelantero: 65,
  talleTrasero: 63,
  distancia: 22,
  separacion: 18,
  pecho: 96,
  cintura: 80,
  base: 94,
  largo: 70,
  largoManga: 58,
  anchoManga: 14,
  escote: 16,
  notes: "Medida inicial",
  createdAt: "2026-01-03T10:00:00.000Z",
  updatedAt: "2026-01-03T10:00:00.000Z",
  syncStatus: "synced",
};

export function camisaMeasurementFactory(
  overrides: Partial<CamisaMeasurement> = {},
): CamisaMeasurement {
  return { ...DEFAULT_CAMISA, ...overrides };
}
```

```ts
// pantalonMeasurementFactory.ts
import type { PantalonMeasurement } from "../../features/clients/domain/types";

const DEFAULT_PANTALON: PantalonMeasurement = {
  id: "44444444-4444-4444-8444-444444444444",
  clientId: "11111111-1111-4111-8111-111111111111",
  largo: 100,
  cintura: 82,
  base: 50,
  tiro: 27,
  pierna: 22,
  rodilla: 19,
  bota: 18,
  notes: null,
  createdAt: "2026-01-03T10:00:00.000Z",
  updatedAt: "2026-01-03T10:00:00.000Z",
  syncStatus: "synced",
};

export function pantalonMeasurementFactory(
  overrides: Partial<PantalonMeasurement> = {},
): PantalonMeasurement {
  return { ...DEFAULT_PANTALON, ...overrides };
}
```

---

## Tarea 2 — Registrar rutas en `ClientsStackNavigator` (N-020 pendiente)

**Tipo:** Navegación  
**Archivo a modificar:** `src/navigation/ClientsStackNavigator.tsx`

**Estado actual:** El navigator solo registra `ClientList`, `ClientCreate`, `ClientDetail`, `MeasurementCreate` (deprecated), `MeasurementHistory` (deprecated). Las rutas `MeasurementTypeSelect`, `CamisaMeasurementCreate`, `PantalonMeasurementCreate`, `CamisaMeasurementDetail`, `PantalonMeasurementDetail` existen en `types.ts` pero no están registradas.

**Cambios requeridos:**

1. Agregar imports de las 5 screens nuevas.
2. Registrar las 5 rutas en el `Stack.Navigator`.
3. Mantener `MeasurementCreate` y `MeasurementHistory` mientras `ClientDetailScreen` siga usando esas rutas (se eliminarán en N-026).

**Títulos de las rutas nuevas:**

| Ruta                        | `options.title`              |
| --------------------------- | ---------------------------- |
| `MeasurementTypeSelect`     | `"Tipo de medida"`           |
| `CamisaMeasurementCreate`   | `"Nueva medida de camisa"`   |
| `PantalonMeasurementCreate` | `"Nueva medida de pantalón"` |
| `CamisaMeasurementDetail`   | `"Medida de camisa"`         |
| `PantalonMeasurementDetail` | `"Medida de pantalón"`       |

---

## Tarea 3 — N-021: Completar `MeasurementTypeSelectScreen`

**Tipo:** UI / Screen  
**Archivo a modificar:** `src/features/clients/screens/MeasurementTypeSelectScreen.tsx`  
**Archivo a crear:** `src/features/clients/screens/MeasurementTypeSelectScreen.test.tsx`

### Comportamiento requerido

#### `mode = "create"`

- Botón primario **"Camisa"** → navega a `CamisaMeasurementCreate({ clientId })`
- Botón primario **"Pantalón"** → navega a `PantalonMeasurementCreate({ clientId })`
- Botón secundario **"Continuar sin medidas"** → navega a `ClientDetail({ clientId })`

#### `mode = "view"`

- Botón primario **"Ver medidas de camisa"** → navega a `CamisaMeasurementDetail({ clientId })`
- Botón primario **"Ver medidas de pantalón"** → navega a `PantalonMeasurementDetail({ clientId })`
- Sin botón "Continuar sin medidas"

### Estructura de la screen (pseudocódigo)

```tsx
export default function MeasurementTypeSelectScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isCreate = mode === "create";

  const handleCamisa = () =>
    isCreate
      ? navigation.navigate("CamisaMeasurementCreate", { clientId })
      : navigation.navigate("CamisaMeasurementDetail", { clientId });

  const handlePantalon = () =>
    isCreate
      ? navigation.navigate("PantalonMeasurementCreate", { clientId })
      : navigation.navigate("PantalonMeasurementDetail", { clientId });

  const handleSkip = () => navigation.navigate("ClientDetail", { clientId });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tipo de medida</Text>

      <Pressable
        accessibilityLabel={
          isCreate ? "Registrar medidas de camisa" : "Ver medidas de camisa"
        }
        style={styles.primaryButton}
        onPress={handleCamisa}
      >
        <Text style={styles.primaryButtonText}>Camisa</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={
          isCreate ? "Registrar medidas de pantalón" : "Ver medidas de pantalón"
        }
        style={styles.primaryButton}
        onPress={handlePantalon}
      >
        <Text style={styles.primaryButtonText}>Pantalón</Text>
      </Pressable>

      {isCreate && (
        <Pressable
          accessibilityLabel="Continuar sin medidas"
          style={styles.secondaryButton}
          onPress={handleSkip}
        >
          <Text style={styles.secondaryButtonText}>Continuar sin medidas</Text>
        </Pressable>
      )}
    </View>
  );
}
```

### Estilos

Extender los estilos existentes (`container`, `title`, `primaryButton`, `primaryButtonText`, `secondaryButton`, `secondaryButtonText`) ya definidos en el placeholder. No inventar nueva paleta.

### Tests — `MeasurementTypeSelectScreen.test.tsx`

| #   | Escenario                                          | Qué verificar                                                                                  |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `mode="create"` — renderiza los 3 botones          | `getByText("Camisa")`, `getByText("Pantalón")`, `getByText("Continuar sin medidas")` presentes |
| 2   | `mode="view"` — NO muestra "Continuar sin medidas" | `queryByText("Continuar sin medidas")` → `null`                                                |
| 3   | `mode="create"`, presiona "Camisa"                 | `navigate` llamado con `("CamisaMeasurementCreate", { clientId: "..." })`                      |
| 4   | `mode="create"`, presiona "Pantalón"               | `navigate` llamado con `("PantalonMeasurementCreate", { clientId: "..." })`                    |
| 5   | `mode="create"`, presiona "Continuar sin medidas"  | `navigate` llamado con `("ClientDetail", { clientId: "..." })`                                 |
| 6   | `mode="view"`, presiona "Camisa"                   | `navigate` llamado con `("CamisaMeasurementDetail", { clientId: "..." })`                      |
| 7   | `mode="view"`, presiona "Pantalón"                 | `navigate` llamado con `("PantalonMeasurementDetail", { clientId: "..." })`                    |

**Patrón de mock:** No hay hooks propios que mockear. Solo mockear `navigation.navigate`. Usar `buildProps(navigate, mode)` helper para construir props.

---

## Tarea 4 — N-022: `CamisaMeasurementCreateScreen`

**Tipo:** UI / Screen  
**Archivo a crear:** `src/features/clients/screens/CamisaMeasurementCreateScreen.tsx`  
**Archivo a crear:** `src/features/clients/screens/CamisaMeasurementCreateScreen.test.tsx`

### Comportamiento requerido

1. Formulario `CamisaMeasurementForm` con `disabled=false`.
2. Todos los campos vacíos son válidos (valores opcionales → `null`).
3. Botón **"Guardar medidas"** deshabilitado mientras `isSubmitting=true` (cambiar texto a "Guardando...").
4. On submit: llamar `upsertCamisa({ clientId, ...formValues })`.
5. On success (`result !== null`): navegar a `CamisaMeasurementDetail({ clientId })` usando `navigation.replace` (reemplaza la pantalla en el stack para evitar back loop Create → Detail → Create).
6. On error: mostrar `ErrorView` inline con el `error` del hook. El formulario permanece editable para que el usuario corrija y reintente.

### Estructura de la screen (pseudocódigo)

```tsx
export default function CamisaMeasurementCreateScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const { upsertCamisa, isSubmitting, error } = useUpsertCamisa();
  const { control, handleSubmit, formState: { errors } } = useForm<CamisaFormValues>({
    defaultValues: CAMISA_FORM_DEFAULTS,
  });

  const onSubmit = async (values: CamisaFormValues) => {
    const result = await upsertCamisa({ clientId, ...values });
    if (result) {
      navigation.replace("CamisaMeasurementDetail", { clientId });
    }
  };

  return (
    <KeyboardAvoidingView ...>
      <ScrollView>
        {error && <ErrorView message={error} />}
        <CamisaMeasurementForm control={control} errors={errors} disabled={false} />
        <Pressable
          accessibilityLabel={isSubmitting ? "Guardando medidas" : "Guardar medidas"}
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>{isSubmitting ? "Guardando..." : "Guardar medidas"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

**Nota `KeyboardAvoidingView`:** `behavior="padding"` en iOS, `behavior="height"` en Android. Usar `Platform.OS`.

### Tests — `CamisaMeasurementCreateScreen.test.tsx`

Mockear `useUpsertCamisa` (jest.mock a nivel de módulo).

| #   | Escenario           | Qué verificar                                                                                                                                               |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Estado inicial      | Formulario presente (`getByLabelText("Espalda (cm)")`), botón "Guardar medidas" presente y habilitado                                                       |
| 2   | `isSubmitting=true` | Botón muestra "Guardando..." y tiene `accessibilityState.disabled=true`                                                                                     |
| 3   | `error` definido    | Mensaje de error visible en pantalla                                                                                                                        |
| 4   | Submit exitoso      | Simular `upsertCamisa` resolviendo con `camisaMeasurementFactory()`; verificar `navigation.replace` llamado con `("CamisaMeasurementDetail", { clientId })` |
| 5   | Submit falla        | Simular `upsertCamisa` resolviendo con `null`; `navigation.replace` NO llamado                                                                              |

---

## Tarea 5 — N-023: `PantalonMeasurementCreateScreen`

**Tipo:** UI / Screen  
**Archivo a crear:** `src/features/clients/screens/PantalonMeasurementCreateScreen.tsx`  
**Archivo a crear:** `src/features/clients/screens/PantalonMeasurementCreateScreen.test.tsx`

### Comportamiento requerido

Idéntico a N-022 pero usando:

- `PantalonMeasurementForm` con `PANTALON_FORM_DEFAULTS`
- `useUpsertPantalon` → `upsertPantalon({ clientId, ...values })`
- On success: `navigation.replace("PantalonMeasurementDetail", { clientId })`

### Tests — `PantalonMeasurementCreateScreen.test.tsx`

Mismos 5 escenarios que N-022, adaptados a pantalón. Usar `pantalonMeasurementFactory()`.

| #   | Escenario                                                               |
| --- | ----------------------------------------------------------------------- |
| 1   | Estado inicial — formulario presente con campo "Largo (cm)"             |
| 2   | `isSubmitting=true` — botón "Guardando..." deshabilitado                |
| 3   | `error` definido — mensaje visible                                      |
| 4   | Submit exitoso — `navigation.replace("PantalonMeasurementDetail", ...)` |
| 5   | Submit falla — `navigation.replace` no llamado                          |

---

## Tarea 6 — N-024: `CamisaMeasurementDetailScreen`

**Tipo:** UI / Screen  
**Archivo a crear:** `src/features/clients/screens/CamisaMeasurementDetailScreen.tsx`  
**Archivo a crear:** `src/features/clients/screens/CamisaMeasurementDetailScreen.test.tsx`

### Comportamiento requerido — 4 estados de la screen

La screen maneja un estado local `isEditing: boolean` (default `false`).

#### Estado 1 — Cargando

`isLoading=true` → `<LoadingView message="Cargando medidas de camisa..." />`

#### Estado 2 — Error

`error !== null` → `<ErrorView message={error} onRetry={() => void reload()} />`

#### Estado 3 — Vacío (no hay medida aún)

`measurement === null && !isLoading` →

```
EmptyView con message="No hay medidas de camisa registradas"
             actionLabel="Agregar medidas"
             onAction={() => navigation.navigate("CamisaMeasurementCreate", { clientId })}
```

#### Estado 4a — Con datos, modo vista (`isEditing=false`)

- `CamisaMeasurementForm` con `disabled=true` y `defaultValues` mapeados desde `measurement`
- Botón **"Editar medidas"** (ícono lápiz + texto) → `setIsEditing(true)`

#### Estado 4b — Con datos, modo edición (`isEditing=true`)

- `CamisaMeasurementForm` con `disabled=false`
- Botón **"Guardar cambios"** → llama a `upsertCamisa({ clientId, ...values })` → on success: `reload()` + `setIsEditing(false)`
- Botón **"Cancelar"** → `reset(defaultValues actuales)` + `setIsEditing(false)`
- `isSubmitting=true` → botón "Guardando..." deshabilitado

### Hooks usados

```ts
const { measurement, isLoading, error, reload } =
  useCamisaMeasurement(clientId);
const { upsertCamisa, isSubmitting, error: saveError } = useUpsertCamisa();
```

**Nota sobre errores duales:** `error` viene del hook de lectura (carga inicial), `saveError` del hook de escritura (guardar). Mostrar `saveError` como banner inline sobre el formulario en modo edición.

### Mapeo `CamisaMeasurement` → `CamisaFormValues`

Los campos numéricos (`number | null`) deben convertirse a `string` para el formulario:

```ts
function measurementToFormValues(m: CamisaMeasurement): CamisaFormValues {
  return {
    espalda: m.espalda?.toString() ?? "",
    hombro: m.hombro?.toString() ?? "",
    // ... todos los campos numéricos igual
    notes: m.notes ?? "",
  };
}
```

Esta función es local a la screen (no exportada). Si se repite exactamente en N-025, evaluar extracción a `domain/` — pero NO hacerlo preventivamente.

### `useForm` con `defaultValues` dinámicos

Cuando `measurement` llega del hook (carga async), usar `reset()` para actualizar el formulario:

```ts
useEffect(() => {
  if (measurement) {
    reset(measurementToFormValues(measurement));
  }
}, [measurement, reset]);
```

### `useFocusEffect` para reload al volver

```ts
useFocusEffect(
  useCallback(() => {
    void reload();
  }, [reload]),
);
```

### Tests — `CamisaMeasurementDetailScreen.test.tsx`

Mockear `useCamisaMeasurement` y `useUpsertCamisa` a nivel de módulo.

| #   | Escenario                                       | Qué verificar                                                                                     |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `isLoading=true`                                | `getByText("Cargando medidas de camisa...")`                                                      |
| 2   | `error` definido                                | Mensaje de error visible; presionar "Reintentar" → `reload` llamado                               |
| 3   | `measurement=null` (vacío)                      | `getByText("No hay medidas de camisa registradas")` + botón "Agregar medidas" visible             |
| 4   | Vacío, presiona "Agregar medidas"               | `navigate` llamado con `("CamisaMeasurementCreate", { clientId })`                                |
| 5   | Con datos, `isEditing=false`                    | Formulario con campos deshabilitados (`editable=false`), botón "Editar medidas" visible           |
| 6   | Con datos, presiona "Editar medidas"            | `isEditing` pasa a `true`; formulario habilitado; botones "Guardar cambios" y "Cancelar" visibles |
| 7   | Con datos, modo edición, `upsertCamisa` exitoso | `reload` llamado; `isEditing` vuelve a `false`                                                    |
| 8   | Con datos, modo edición, `upsertCamisa` falla   | `saveError` visible; `isEditing` permanece `true`                                                 |
| 9   | Con datos, modo edición, presiona "Cancelar"    | `isEditing` vuelve a `false`; formulario deshabilitado de nuevo                                   |

---

## Tarea 7 — N-025: `PantalonMeasurementDetailScreen`

**Tipo:** UI / Screen  
**Archivo a crear:** `src/features/clients/screens/PantalonMeasurementDetailScreen.tsx`  
**Archivo a crear:** `src/features/clients/screens/PantalonMeasurementDetailScreen.test.tsx`

### Comportamiento requerido

Idéntico a N-024 pero usando:

- `usePantalonMeasurement(clientId)` → `measurement: PantalonMeasurement | null`
- `useUpsertPantalon()` → `upsertPantalon({ clientId, ...values })`
- `PantalonMeasurementForm` / `PANTALON_FORM_DEFAULTS` / `PantalonFormValues`
- Estado vacío: `"No hay medidas de pantalón registradas"` + `"Agregar medidas"` → navega a `PantalonMeasurementCreate`
- `LoadingView`: `"Cargando medidas de pantalón..."`

### Mapeo `PantalonMeasurement` → `PantalonFormValues`

```ts
function measurementToFormValues(m: PantalonMeasurement): PantalonFormValues {
  return {
    largo: m.largo?.toString() ?? "",
    cintura: m.cintura?.toString() ?? "",
    base: m.base?.toString() ?? "",
    tiro: m.tiro?.toString() ?? "",
    pierna: m.pierna?.toString() ?? "",
    rodilla: m.rodilla?.toString() ?? "",
    bota: m.bota?.toString() ?? "",
    notes: m.notes ?? "",
  };
}
```

### Tests — `PantalonMeasurementDetailScreen.test.tsx`

Mismos 9 escenarios que N-024, adaptados a pantalón.

| #   | Escenario                                                                                 |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | `isLoading=true` — `"Cargando medidas de pantalón..."`                                    |
| 2   | `error` definido — error visible + retry                                                  |
| 3   | `measurement=null` — `"No hay medidas de pantalón registradas"` + botón "Agregar medidas" |
| 4   | Vacío, presiona "Agregar medidas" → `navigate("PantalonMeasurementCreate", ...)`          |
| 5   | Con datos, `isEditing=false` — formulario deshabilitado + botón "Editar medidas"          |
| 6   | Presiona "Editar medidas" — formulario habilitado                                         |
| 7   | `upsertPantalon` exitoso — `reload` llamado + `isEditing=false`                           |
| 8   | `upsertPantalon` falla — `saveError` visible                                              |
| 9   | Presiona "Cancelar" — `isEditing=false`                                                   |

---

## Tarea 8 — Actualizar `ClientDetailScreen` para usar nuevas rutas (N-026 parcial)

**Tipo:** UI / Fix  
**Archivo a modificar:** `src/features/clients/screens/ClientDetailScreen.tsx`

> **Nota:** La issue N-026 incluye también el fix de DI y la eliminación de `syncStatus` visible en `ClientListScreen`. Este plan solo cubre la navegación desde `ClientDetailScreen`.

**Cambios:**

1. Reemplazar el botón **"Nueva medida"** → `navigate("MeasurementTypeSelect", { clientId: client.id, mode: "create" })`
2. Reemplazar el botón **"Ver historial"** → `navigate("MeasurementTypeSelect", { clientId: client.id, mode: "view" })`
3. Actualizar el test `ClientDetailScreen.test.tsx`: el escenario `"navigates to MeasurementCreate and MeasurementHistory"` debe actualizarse para verificar la navegación a `MeasurementTypeSelect`.

---

## Diagrama de Navegación

```
ClientDetail
    │
    ├─ "Nueva medida" ──────────────────────► MeasurementTypeSelect (mode="create")
    │                                              │
    │                                              ├─ "Camisa"       ──► CamisaMeasurementCreate
    │                                              │                          │ (replace, on success)
    │                                              │                          ▼
    │                                              │                    CamisaMeasurementDetail
    │                                              │                          │ (empty state)
    │                                              │                          └─ "Agregar medidas" ──► CamisaMeasurementCreate
    │                                              │
    │                                              ├─ "Pantalón"     ──► PantalonMeasurementCreate
    │                                              │                          │ (replace, on success)
    │                                              │                          ▼
    │                                              │                    PantalonMeasurementDetail
    │                                              │                          │ (empty state)
    │                                              │                          └─ "Agregar medidas" ──► PantalonMeasurementCreate
    │                                              │
    │                                              └─ "Continuar sin medidas" ──► ClientDetail
    │
    └─ "Ver historial" ─────────────────────► MeasurementTypeSelect (mode="view")
                                                   │
                                                   ├─ "Ver medidas de camisa"   ──► CamisaMeasurementDetail
                                                   └─ "Ver medidas de pantalón" ──► PantalonMeasurementDetail
```

---

## Tabla Maestra de Archivos

| #   | Operación | Archivo                                                                 | Tarea |
| --- | --------- | ----------------------------------------------------------------------- | ----- |
| 0a  | Modificar | `src/features/clients/domain/repository.ts`                             | T0    |
| 0b  | Modificar | `src/data/local/MeasurementRepositoryImpl.ts`                           | T0    |
| 1a  | Crear     | `src/__tests__/factories/camisaMeasurementFactory.ts`                   | T1    |
| 1b  | Crear     | `src/__tests__/factories/pantalonMeasurementFactory.ts`                 | T1    |
| 1c  | Modificar | `src/__tests__/factories/index.ts`                                      | T1    |
| 2   | Modificar | `src/navigation/ClientsStackNavigator.tsx`                              | T2    |
| 3a  | Modificar | `src/features/clients/screens/MeasurementTypeSelectScreen.tsx`          | T3    |
| 3b  | Crear     | `src/features/clients/screens/MeasurementTypeSelectScreen.test.tsx`     | T3    |
| 4a  | Crear     | `src/features/clients/screens/CamisaMeasurementCreateScreen.tsx`        | T4    |
| 4b  | Crear     | `src/features/clients/screens/CamisaMeasurementCreateScreen.test.tsx`   | T4    |
| 5a  | Crear     | `src/features/clients/screens/PantalonMeasurementCreateScreen.tsx`      | T5    |
| 5b  | Crear     | `src/features/clients/screens/PantalonMeasurementCreateScreen.test.tsx` | T5    |
| 6a  | Crear     | `src/features/clients/screens/CamisaMeasurementDetailScreen.tsx`        | T6    |
| 6b  | Crear     | `src/features/clients/screens/CamisaMeasurementDetailScreen.test.tsx`   | T6    |
| 7a  | Crear     | `src/features/clients/screens/PantalonMeasurementDetailScreen.tsx`      | T7    |
| 7b  | Crear     | `src/features/clients/screens/PantalonMeasurementDetailScreen.test.tsx` | T7    |
| 8a  | Modificar | `src/features/clients/screens/ClientDetailScreen.tsx`                   | T8    |
| 8b  | Modificar | `src/features/clients/screens/ClientDetailScreen.test.tsx`              | T8    |

**Total: 18 cambios** (6 modificaciones, 12 creaciones, 0 eliminaciones en este PR)

---

## Orden Seguro de Implementación

```
T0  → verificar/completar N-018 (desbloquea compilación de hooks ya escritos)
T1  → factories de test (no tiene dependencias, se puede hacer en paralelo con T2)
T2  → registrar rutas en navigator (habilita navegación real en el dispositivo)
T3  → MeasurementTypeSelectScreen completo + tests
T4  → CamisaMeasurementCreateScreen + tests
T5  → PantalonMeasurementCreateScreen + tests   ← paralelo con T4
T6  → CamisaMeasurementDetailScreen + tests
T7  → PantalonMeasurementDetailScreen + tests   ← paralelo con T6
T8  → Actualizar ClientDetailScreen + test
```

---

## Estrategia de Commits

```
chore(clients): add camisaMeasurement and pantalonMeasurement test factories
feat(navigation): register N-021..N-025 routes in ClientsStackNavigator
feat(clients): complete MeasurementTypeSelectScreen with camisa/pantalon routing (N-021)
feat(clients): add CamisaMeasurementCreateScreen (N-022)
feat(clients): add PantalonMeasurementCreateScreen (N-023)
feat(clients): add CamisaMeasurementDetailScreen with view/edit modes (N-024)
feat(clients): add PantalonMeasurementDetailScreen with view/edit modes (N-025)
fix(clients): update ClientDetailScreen to navigate to MeasurementTypeSelect (N-026 partial)
```

> Si T0 requiere cambios, agregar antes: `feat(clients): extend MeasurementRepository interface for camisa/pantalon (N-018)`

---

## Decisiones de Diseño

### `navigation.replace` en Create screens (N-022, N-023)

Usar `replace` en lugar de `navigate` para que al llegar al Detail, el botón "Back" del sistema no regrese a la pantalla de creación. El flujo esperado tras guardar es: Detail → [back] → MeasurementTypeSelect → [back] → ClientDetail.

### `isEditing` como estado local en Detail screens (N-024, N-025)

No se usa Zustand porque el estado de edición es puramente UI y no tiene relevancia global ni para la sync. Un `useState` local es suficiente.

### `useForm.reset()` reactivo al `measurement`

El formulario se inicializa con `CAMISA_FORM_DEFAULTS` (strings vacíos), y cuando el hook resuelve los datos, `reset()` puebla los campos. Esto evita un formulario vacío que flashed brevemente.

### `useFocusEffect` + `reload` en Detail screens

Garantiza que si el usuario navega desde `CamisaMeasurementCreate` → [back] → `CamisaMeasurementDetail`, los datos estén frescos sin depender de `navigation.replace` en todos los caminos.

### Función `measurementToFormValues` local, no compartida

Los campos son distintos entre camisa (13 campos) y pantalón (7 campos). Compartir una función genérica sería over-engineering y perdería type safety. Funciones locales privadas.

### `ErrorView` inline vs banner

En screens de Create: mostrar `ErrorView` sobre el formulario (bloquea el scroll visible, pero el formulario sigue editable debajo). En Detail modo edición: ídem con `saveError`. No usar alerts de sistema ni toasts — el patrón establecido en el proyecto es `ErrorView`.

---

## Riesgos y Consideraciones

| Riesgo                                                                                                                                   | Mitigación                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **N-018 no completado**: hooks no compilan → nada de T3..T7 funciona                                                                     | Verificar antes de arrancar. Si el Builder de Track B no lo terminó, completar en esta rama como T0.                          |
| **`KeyboardAvoidingView` en Android**: el formulario largo (13 campos en camisa) puede quedar oculto bajo el teclado                     | Probar en emulador Android. `behavior="height"` + `ScrollView` con `keyboardShouldPersistTaps="handled"` es el patrón seguro. |
| **Ciclo de re-renders en Detail**: `useEffect([measurement, reset])` puede dispararse en loop si `reset` no es estable                   | `react-hook-form` garantiza estabilidad referencial de `reset`. Sin riesgo.                                                   |
| **Estado vacío vs error**: `measurement=null` con `isLoading=false` y `error=null` debe mostrar estado vacío, no error                   | La condición guard debe evaluar en orden: `isLoading` → `error` → `measurement===null` → datos.                               |
| **Tests del navigator**: registrar nuevas rutas puede romper tests de `FeatureTabsNavigator` si estos mockean el stack                   | Revisar `FeatureTabsNavigator.test.tsx` y `PricingStackNavigator.test.tsx` post-cambio.                                       |
| **`ClientDetailScreen.test.tsx` desactualizado**: el test actual verifica `navigate("MeasurementCreate", ...)` que es la ruta deprecated | T8 incluye actualizar ese test.                                                                                               |
