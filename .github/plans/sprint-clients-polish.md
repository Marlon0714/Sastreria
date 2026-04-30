# Sprint Plan: Clients Module Polish + Architecture Quality

**Fecha:** 2026-04-30  
**Objetivo:** Refactorizar el módulo de clientes para soportar medidas reales (camisa/pantalón) con flujo completo de registro, visualización y edición. Paralelo: estabilizar calidad de CI.

---

## Contexto técnico

El modelo actual de `Measurement` es genérico (`pechoCm, cinturaCm, caderaCm, largoCm`) y no refleja los campos reales de negocio. Toda la capa de datos, dominio, hooks y pantallas actuales deben refactorizarse o reemplazarse.

**Impacto de la refactorización:**

- La tabla `measurements` en SQLite queda obsoleta → se reemplaza con `camisa_measurements` y `pantalon_measurements`.
- `MeasurementHistoryScreen` y `MeasurementCreateScreen` quedan obsoletas → se reemplazan.
- El modelo de navegación actual (`MeasurementCreate`, `MeasurementHistory`) se actualiza con las nuevas rutas.

---

## Tracks de trabajo

```
TRACK A — Arquitectura CI (independiente, paralelizable)
  └── N-006: PR quality gate automation
  └── N-011: Coverage signal restoration

TRACK B — Domain + Data (bloquea tracks C, D, E)
  └── N-016: Refactor domain model (CamisaMeasurement + PantalonMeasurement)
      └── N-017: SQLite migration v2 (tablas camisa + pantalón)
          └── N-018: MeasurementRepository interface + impl (upsert por tipo)
              └── N-019: Hooks de medidas (useUpsertCamisa, useUpsertPantalon, etc.)

TRACK C — Navigation (depende de N-016, paralelo a N-017/N-018)
  └── N-020: Actualizar navigation types + ClientsStackNavigator

TRACK C.5 — Shared form components (depende de N-016, paralelo a N-017/N-018)
  └── N-028: CamisaMeasurementForm + PantalonMeasurementForm (componentes reutilizables)

TRACK D — Screens (depende de N-019 + N-020 + N-028)
  └── N-026: Refactor ClientDetailScreen + fix DI bug + fix syncStatus visible  ← P0, arranca con N-020
  └── N-021: MeasurementTypeSelectScreen
  └── N-022: CamisaMeasurementCreateScreen  (usa CamisaMeasurementForm)
  └── N-023: PantalonMeasurementCreateScreen  (usa PantalonMeasurementForm)
  └── N-024: CamisaMeasurementDetailScreen   (usa CamisaMeasurementForm)
  └── N-025: PantalonMeasurementDetailScreen  (usa PantalonMeasurementForm)

TRACK E — Tests (distribuidos por PR; N-027 solo integración end-to-end)
  └── Tests por PR: cada N-016..N-026 incluye sus propios tests como criterio de salida
  └── N-027: Tests de integración: flujo completo crear cliente → medidas → editar
```

---

## Tareas detalladas

---

### N-016 — Refactor domain model

**Prioridad:** P0 (bloquea todo lo demás)  
**Owner:** Architect + Builder  
**Track:** B

**Archivos a modificar:**

- `src/features/clients/domain/types.ts`
- `src/features/clients/domain/schemas.ts`

**Cambios:**

```typescript
// types.ts — reemplazar Measurement por dos tipos específicos
export interface CamisaMeasurement extends BaseEntity {
  clientId: string;
  espalda: number | null;
  hombro: number | null;
  talleDelantero: number | null;
  talleTrasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largoManga: number | null;
  anchoManga: number | null;
  escote: number | null;
  notes: string | null;
}

export interface PantalonMeasurement extends BaseEntity {
  clientId: string;
  largo: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
}

// DTOs para upsert (todos los campos opcionales porque usuario puede omitir)
export interface UpsertCamisaDTO {
  clientId: string;
  espalda?: number | null;
  hombro?: number | null;
  talleDelantero?: number | null;
  talleTrasero?: number | null;
  distancia?: number | null;
  separacion?: number | null;
  pecho?: number | null;
  cintura?: number | null;
  base?: number | null;
  largo?: number | null;
  largoManga?: number | null;
  anchoManga?: number | null;
  escote?: number | null;
  notes?: string | null;
}

export interface UpsertPantalonDTO {
  clientId: string;
  largo?: number | null;
  cintura?: number | null;
  base?: number | null;
  tiro?: number | null;
  pierna?: number | null;
  rodilla?: number | null;
  bota?: number | null;
  notes?: string | null;
}
```

**Schemas Zod** — todos los campos de medida: `z.preprocess(...)` que acepta string vacío → `null`; número positivo max 300 → `number | null`.

```typescript
const optionalMeasurementField = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v === "string") return v.trim().replace(",", ".");
  return v;
}, z.coerce.number().positive().max(300).nullable().optional());
```

**Decisión de no eliminar el tipo `Measurement` antiguo aún:** se mantiene como deprecated hasta que N-017 y N-018 pasen a Done. Luego se elimina en cleanup.

---

### N-017 — SQLite migration v2

**Prioridad:** P0 (bloquea N-018)  
**Owner:** Builder  
**Track:** B  
**Depende de:** N-016

**Archivos a modificar:**

- `src/data/local/migrations.ts`
- `src/data/local/migrations.web.ts`

**Cambios:**

- Incrementar `TARGET_SCHEMA_VERSION = 2`
- Agregar migration v2 con dos tablas:

```sql
-- camisa_measurements: un registro por cliente (upsert por client_id)
CREATE TABLE IF NOT EXISTS camisa_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL UNIQUE,  -- UNIQUE: máximo una camisa por cliente
  espalda REAL,
  hombro REAL,
  talle_delantero REAL,
  talle_trasero REAL,
  distancia REAL,
  separacion REAL,
  pecho REAL,
  cintura REAL,
  base REAL,
  largo REAL,
  largo_manga REAL,
  ancho_manga REAL,
  escote REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);

-- pantalon_measurements: un registro por cliente
CREATE TABLE IF NOT EXISTS pantalon_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL UNIQUE,  -- UNIQUE: máximo un pantalón por cliente
  largo REAL,
  cintura REAL,
  base REAL,
  tiro REAL,
  pierna REAL,
  rodilla REAL,
  bota REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);
```

**Nota:** La tabla `measurements` existente se mantiene (no se elimina) para preservar datos históricos. La app nueva no la usa pero la migración no la toca.

---

### N-018 — MeasurementRepository interface + impl

**Prioridad:** P0  
**Owner:** Builder  
**Track:** B  
**Depende de:** N-016, N-017

**Archivos a modificar:**

- `src/features/clients/domain/repository.ts`
- `src/data/local/MeasurementRepositoryImpl.ts`

**Interface nueva:**

```typescript
export interface MeasurementRepository {
  // Camisa
  upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement>;
  findCamisaByClientId(clientId: string): Promise<CamisaMeasurement | null>;
  // Pantalón
  upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement>;
  findPantalonByClientId(clientId: string): Promise<PantalonMeasurement | null>;
}
```

**Patrón upsert en SQLite:**

```sql
INSERT INTO camisa_measurements (id, client_id, ...) VALUES (?, ?, ...)
ON CONFLICT(client_id) DO UPDATE SET
  espalda = excluded.espalda,
  updated_at = excluded.updated_at,
  sync_status = 'pending',
  ...;
```

---

### N-019 — Hooks de medidas

**Prioridad:** P1  
**Owner:** Builder  
**Track:** B  
**Depende de:** N-018

**Archivos nuevos/modificados:**

- `src/features/clients/hooks/useUpsertCamisa.ts` (nuevo)
- `src/features/clients/hooks/useUpsertPantalon.ts` (nuevo)
- `src/features/clients/hooks/useCamisaMeasurement.ts` (nuevo)
- `src/features/clients/hooks/usePantalonMeasurement.ts` (nuevo)
- **Eliminar** (no deprecar): `useAddMeasurement.ts`, `useClientMeasurementHistory.ts`
- **Eliminar** (no deprecar): `MeasurementCreateScreen.tsx`, `MeasurementHistoryScreen.tsx`
- Actualizar: `src/features/clients/repository/clientsDependencies.ts`

> **Ajuste Architect:** los hooks y pantallas obsoletos se eliminan en este mismo PR. Las pantallas nuevas (N-022–N-025) los reemplazan por completo; mantenerlos como deprecated genera deuda de cleanup sin ningún consumidor activo.

Cada hook nuevo sigue el patrón existente: recibe dependencias vía DI, expone `{ data, isLoading, error, submit/fetch }`.

**Tests incluidos en este PR:**

- `useUpsertCamisa`: happy path, error path, estado loading
- `useUpsertPantalon`: happy path, error path, estado loading
- `useCamisaMeasurement`: carga datos, maneja null cuando no existe
- `usePantalonMeasurement`: carga datos, maneja null cuando no existe

---

### N-028 — Shared form components (nuevo)

**Prioridad:** P1  
**Owner:** Builder  
**Track:** C.5  
**Depende de:** N-016

**Archivos nuevos:**

- `src/features/clients/components/CamisaMeasurementForm.tsx`
- `src/features/clients/components/PantalonMeasurementForm.tsx`

**Contrato de props:**

```typescript
// CamisaMeasurementForm
interface CamisaMeasurementFormProps {
  control: Control<CamisaFormValues>;
  errors: FieldErrors<CamisaFormValues>;
  disabled?: boolean; // true en modo vista, false en modo edición
}

// PantalonMeasurementForm
interface PantalonMeasurementFormProps {
  control: Control<PantalonFormValues>;
  errors: FieldErrors<PantalonFormValues>;
  disabled?: boolean;
}
```

> **Justificación Architect:** los 13 campos de camisa y 7 de pantalón se usan idénticamente en Create y Detail. Sin este componente compartido, cualquier cambio de label, helper text o estilo requiere edición en dos lugares. El prop `disabled` habilita reutilización directa para el modo vista.

**Tests incluidos en este PR:**

- Render con todos los campos habilitados
- Render con `disabled=true` (modo vista: inputs no editables)

---

### N-020 — Navigation types + ClientsStackNavigator

**Prioridad:** P1  
**Owner:** Builder  
**Track:** C  
**Depende de:** N-016

**Archivos a modificar:**

- `src/navigation/types.ts`
- `src/navigation/ClientsStackNavigator.tsx`

```typescript
export type ClientsStackParamList = {
  ClientList: undefined;
  ClientCreate: undefined;
  ClientDetail: { clientId: string };
  MeasurementTypeSelect: { clientId: string; mode: "create" | "view" };
  CamisaMeasurementCreate: { clientId: string };
  PantalonMeasurementCreate: { clientId: string };
  CamisaMeasurementDetail: { clientId: string };
  PantalonMeasurementDetail: { clientId: string };
  // Mantener temporalmente hasta cleanup:
  // MeasurementCreate, MeasurementHistory → marcar como @deprecated
};
```

---

### N-021 — MeasurementTypeSelectScreen

**Prioridad:** P1  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-019, N-020

**Archivo:** `src/features/clients/screens/MeasurementTypeSelectScreen.tsx`

**Comportamiento:**

- Recibe `{ clientId, mode: 'create' | 'view' }`
- Muestra dos tarjetas: "Camisa" y "Pantalón"
- `mode='create'` → navega a `CamisaMeasurementCreate` o `PantalonMeasurementCreate`
- `mode='view'` → navega a `CamisaMeasurementDetail` o `PantalonMeasurementDetail`
- Botón "Continuar sin medidas" (solo visible en `mode='create'`) → navega a `ClientList`

---

### N-022 — CamisaMeasurementCreateScreen

**Prioridad:** P1  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-019, N-020

**Archivo:** `src/features/clients/screens/CamisaMeasurementCreateScreen.tsx`

**Campos (todos opcionales):**
Espalda, Hombro, Talle delantero, Talle trasero, Distancia, Separación, Pecho, Cintura, Base, Largo, Largo manga, Ancho manga, Escote + Notas (textarea)

**Comportamiento:**

- Validación Zod: campos vacíos → null (no error), números fuera de rango → error
- Al guardar → `useUpsertCamisa.submit()` → on success navega a `CamisaMeasurementDetail`
- Botón "Guardar" siempre habilitado (aunque todos los campos estén vacíos)

---

### N-023 — PantalonMeasurementCreateScreen

**Prioridad:** P1  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-019, N-020

**Archivo:** `src/features/clients/screens/PantalonMeasurementCreateScreen.tsx`

**Campos (todos opcionales):**
Largo, Cintura, Base, Tiro, Pierna, Rodilla, Bota + Notas

**Comportamiento:** idéntico al patrón de N-022.

---

### N-024 — CamisaMeasurementDetailScreen (view + edit)

**Prioridad:** P1  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-019, N-020

**Archivo:** `src/features/clients/screens/CamisaMeasurementDetailScreen.tsx`

**Comportamiento:**

- Modo vista por defecto: muestra campos con valor o "—" si null
- Botón lápiz (ícono) en header o en la card → activa modo edición
- En modo edición: inputs habilitados con valores actuales, botón "Guardar cambios" visible
- Al guardar → `useUpsertCamisa.submit()` → on success vuelve a modo vista (misma pantalla, no navega)
- Si no hay medidas registradas aún → muestra estado vacío + botón "Registrar medidas"

---

### N-025 — PantalonMeasurementDetailScreen (view + edit)

**Prioridad:** P1  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-019, N-020

**Archivo:** `src/features/clients/screens/PantalonMeasurementDetailScreen.tsx`

**Comportamiento:** idéntico al patrón de N-024.

---

### N-026 — Refactor ClientDetailScreen + flujo post-create

**Prioridad:** P0 ← elevado por Architect  
**Owner:** Builder  
**Track:** D  
**Depende de:** N-020

> **Ajuste Architect:** elevado a P0 porque `ClientDetailScreen` tiene dos bugs activos visibles para cualquier usuario: (1) instancia `ClientRepositoryImpl` directamente violando DI, (2) muestra `syncStatus: pending` en la UI del cliente. Estos no deben llegar al siguiente sprint sin resolver.

**Archivos a modificar:**

- `src/features/clients/screens/ClientDetailScreen.tsx`
- `src/features/clients/screens/ClientCreateScreen.tsx`

**ClientDetailScreen:**

- **Fix P0:** eliminar `const clientRepository = new ClientRepositoryImpl()` → reemplazar con hook que use DI
- **Fix P0:** eliminar `<Text>syncStatus: {client.syncStatus}</Text>` de la UI (campo interno, no visible al usuario)
- Reemplazar botones "Nueva medida" y "Ver historial" por un único botón "Ver / editar medidas"
- Navegar a `MeasurementTypeSelect` con `mode='view'`

**ClientCreateScreen post-success:**

- Después de crear cliente exitosamente → navegar a `MeasurementTypeSelect` con `mode='create'`

**Tests incluidos en este PR:**

- `ClientDetailScreen`: render sin syncStatus visible, carga con hook DI, navega a MeasurementTypeSelect

---

### N-027 — Tests de integración end-to-end (ajustado)

**Prioridad:** P1  
**Owner:** Tester  
**Track:** E  
**Depende de:** N-016 a N-026

> **Ajuste Architect:** los tests unitarios de cada módulo se escriben dentro del PR correspondiente (N-016..N-026) como criterio de salida. N-027 cubre únicamente flujos de integración que cruzan múltiples módulos.

**Cobertura en N-027 (solo integración):**

- Flujo completo crear cliente → navegar a MeasurementTypeSelect → guardar camisa → volver a detail → editar → guardar
- Flujo completo crear cliente → guardar pantalón → editar pantalón
- Flujo crear cliente → continuar sin medidas → llegar a ClientList
- ClientDetailScreen carga cliente y navega a MeasurementTypeSelect sin exponer syncStatus

**Tests ya cubiertos por PRs anteriores (no duplicar en N-027):**

- N-016: schemas camisa/pantalón (vacíos, null, fuera de rango)
- N-017/N-018: upsert crea, upsert actualiza, find null
- N-019: hooks upsert y load (happy/error/loading)
- N-028: CamisaMeasurementForm y PantalonMeasurementForm (render habilitado/disabled)
- N-026: ClientDetailScreen sin syncStatus, DI correcto

---

## Priorización del sprint (revisada por Architect)

| Prioridad | Tarea        | Puede arrancar cuando...                             | Tests en el mismo PR                           |
| --------- | ------------ | ---------------------------------------------------- | ---------------------------------------------- |
| P0        | N-016        | Inmediato                                            | Schemas camisa/pantalón                        |
| P0        | N-017        | Después de N-016                                     | Migraciones idempotentes                       |
| P0        | N-018        | Después de N-017                                     | Upsert crea, actualiza, find null              |
| P0        | N-026        | Después de N-020 (fix bugs activos en UI)            | ClientDetailScreen sin syncStatus, DI correcto |
| P0 ‖ P1   | N-006, N-011 | Inmediato (Track A, independiente)                   | —                                              |
| P1        | N-019        | Después de N-018 (elimina hooks/pantallas obsoletas) | Hooks upsert y load                            |
| P1        | N-020        | Después de N-016                                     | Navigation types compilan sin error            |
| P1        | N-028        | Después de N-016 (paralelo a N-017/N-018)            | Render habilitado/disabled                     |
| P1        | N-021–N-025  | Después de N-019 + N-020 + N-028 (paralelo entre sí) | Render, navegación, submit por pantalla        |
| P1        | N-027        | Después de N-016..N-026 (solo integración E2E)       | Flujos completos multi-módulo                  |

---

## Criterios de salida de cada PR

- TypeScript sin errores (`tsc --noEmit`)
- ESLint sin warnings nuevos
- Tests nuevos pasando, sin tests pre-existentes rotos
- No hay `any` ni secretos hardcodeados
- Revisión humana antes de merge
