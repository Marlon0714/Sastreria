# Plan N-035 — Agregar medidas de cuello, brazo y puño a CamisaMeasurement

**Fecha:** 2026-05-04  
**Tipo:** Feature / Ampliación de modelo  
**Rama sugerida:** `feature/clients/n035-camisa-extra-measurements`

---

## Contexto

El modelo `CamisaMeasurement` tiene actualmente 13 campos numéricos opcionales
(`espalda`, `hombro`, `talleDelantero`, `talleTrasero`, `distancia`, `separacion`,
`pecho`, `cintura`, `base`, `largo`, `largoManga`, `anchoManga`, `escote`).
Se agregan tres nuevos campos: `cuello`, `brazo`, `puno` — todos `number | null`,
opcionales, siguiendo exactamente el mismo patrón que los campos existentes.

El nombre SQL es `cuello`, `brazo`, `puno` (sin tilde en `puño`) para evitar
problemas de encoding en SQLite y Supabase. El nombre en TypeScript es el mismo.

La migración SQLite sube de `TARGET_SCHEMA_VERSION = 2` a `3`.
La idempotencia está garantizada por el mecanismo ya existente: `PRAGMA user_version`
controla si la migración se re-aplica; `schema_migrations` actúa como log de auditoría.
Ambos mecanismos son suficientes; no se requieren guardas extras en los statements.

Supabase: las columnas ya existen en el esquema remoto. Solo se actualizan los
queries locales (SELECT en pull, upsert payload en push).

---

## Archivos impactados (resumen)

| Archivo                                                          | Operación |
| ---------------------------------------------------------------- | --------- |
| `src/features/clients/domain/types.ts`                           | Modificar |
| `src/features/clients/domain/schemas.ts`                         | Modificar |
| `src/features/clients/hooks/useUpsertCamisa.ts`                  | Modificar |
| `src/features/clients/components/CamisaMeasurementForm.tsx`      | Modificar |
| `src/features/clients/screens/CamisaMeasurementDetailScreen.tsx` | Modificar |
| `src/data/local/migrations.ts`                                   | Modificar |
| `src/data/local/MeasurementRepositoryImpl.ts`                    | Modificar |
| `src/data/sync/SupabaseSyncTransport.ts`                         | Modificar |
| `src/data/sync/SupabasePullSync.ts`                              | Modificar |
| `src/data/local/MeasurementRepositoryImpl.test.ts`               | Modificar |
| `src/features/clients/hooks/useUpsertCamisa.test.ts`             | Modificar |

---

## Tareas

### T-01 — Dominio: tipos

**Tipo:** Dominio  
**Archivo:** `src/features/clients/domain/types.ts`  
**Dependencias previas:** ninguna

**Cambios exactos:**

1. En `interface CamisaMeasurement`, después de `escote: number | null;` y antes de `notes: string | null;`, agregar:

   ```
   cuello: number | null;
   brazo: number | null;
   puno: number | null;
   ```

2. En `interface UpsertCamisaDTO`, después de `escote?: number | null;` y antes de `notes?: string | null;`, agregar:
   ```
   cuello?: number | null;
   brazo?: number | null;
   puno?: number | null;
   ```

**Criterio de salida:** `tsc --noEmit` sin errores en `types.ts`.

---

### T-02 — Dominio: schema Zod

**Tipo:** Dominio  
**Archivo:** `src/features/clients/domain/schemas.ts`  
**Dependencias previas:** T-01 (los tipos exportados son independientes del schema,
pero es buena práctica mantener el orden dominio → capas superiores)

**Cambios exactos:**

En `upsertCamisaSchema`, después de `escote: optionalMeasurementField.optional(),`
y antes de `notes: optionalNotesField,`, agregar:

```ts
cuello: optionalMeasurementField.optional(),
brazo: optionalMeasurementField.optional(),
puno: optionalMeasurementField.optional(),
```

Los tipos derivados `UpsertCamisaSchemaInput` y `UpsertCamisaSchemaOutput` ya se
infieren de `upsertCamisaSchema`; no requieren cambios adicionales.

**Criterio de salida:** `tsc --noEmit` sin errores. Los nuevos campos aparecen
como `number | null | undefined` en `UpsertCamisaSchemaInput`.

---

### T-03 — Datos: migración SQLite v3

**Tipo:** Datos  
**Archivo:** `src/data/local/migrations.ts`  
**Dependencias previas:** ninguna (SQL puro, no depende del dominio TypeScript)

**Cambios exactos:**

1. Cambiar `const TARGET_SCHEMA_VERSION = 2;` → `const TARGET_SCHEMA_VERSION = 3;`

2. Agregar el siguiente objeto al final del array `MIGRATIONS` (después de la
   migración `v2_measurements_by_garment`):

```ts
{
  version: 3,
  name: "v3_camisa_extra_measurements",
  statements: [
    `ALTER TABLE camisa_measurements ADD COLUMN cuello REAL;`,
    `ALTER TABLE camisa_measurements ADD COLUMN brazo REAL;`,
    `ALTER TABLE camisa_measurements ADD COLUMN puno REAL;`,
  ],
},
```

**Notas de implementación:**

- `ALTER TABLE ADD COLUMN` en SQLite solo permite columnas nullable o con DEFAULT,
  y `REAL` sin `NOT NULL` cumple esa condición. No se necesita `DEFAULT NULL`.
- El guard `if (currentVersion >= TARGET_SCHEMA_VERSION) return;` del `runMigrations`
  existente garantiza idempotencia; no correr el `ALTER` dos veces en el mismo dispositivo.
- Para dispositivos nuevos (instalación limpia), la migración v2 crea la tabla y
  v3 agrega las columnas en la misma sesión inicial, lo cual es correcto.

**Criterio de salida:** App lanza sin crash. Inspeccionando el SQLite con
`db.getAllAsync("SELECT * FROM schema_migrations")` se observa `version=3`.

---

### T-04 — Datos: MeasurementRepositoryImpl

**Tipo:** Datos  
**Archivo:** `src/data/local/MeasurementRepositoryImpl.ts`  
**Dependencias previas:** T-01, T-03

**Cambios exactos:**

#### 4a — Interface `CamisaMeasurementRow`

Después de `escote: number | null;` y antes de `notes: string | null;`, agregar:

```ts
cuello: number | null;
brazo: number | null;
puno: number | null;
```

#### 4b — Función `mapCamisaRow`

Después de `escote: row.escote,` y antes de `notes: row.notes,`, agregar:

```ts
cuello: row.cuello,
brazo: row.brazo,
puno: row.puno,
```

#### 4c — Objeto `camisaMeasurement` en `upsertCamisa`

Después de `escote: normalizeNullableNumber(input.escote),` y antes de `notes,`, agregar:

```ts
cuello: normalizeNullableNumber(input.cuello),
brazo: normalizeNullableNumber(input.brazo),
puno: normalizeNullableNumber(input.puno),
```

#### 4d — SQL INSERT en `upsertCamisa`

La lista de columnas en el INSERT debe incluir `cuello, brazo, puno` después de
`escote` y antes de `notes`. El placeholder `?` correspondiente debe agregarse
en la misma posición en el `VALUES (...)`.

Columnas actuales (19 columnas → 22 columnas con los 3 nuevos campos):

```sql
INSERT INTO camisa_measurements (
  id, client_id,
  espalda, hombro, talle_delantero, talle_trasero,
  distancia, separacion, pecho, cintura, base, largo,
  largo_manga, ancho_manga, escote,
  cuello, brazo, puno,        -- NUEVO
  notes, created_at, updated_at, sync_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### 4e — Cláusula ON CONFLICT DO UPDATE

Después de `escote = excluded.escote,` y antes de `notes = excluded.notes,`, agregar:

```sql
cuello = excluded.cuello,
brazo = excluded.brazo,
puno = excluded.puno,
```

#### 4f — Lista de parámetros del `db.runAsync`

Después de `camisaMeasurement.escote,` y antes de `camisaMeasurement.notes,`, agregar:

```ts
camisaMeasurement.cuello,
camisaMeasurement.brazo,
camisaMeasurement.puno,
```

**Criterio de salida:** `tsc --noEmit` sin errores. El número de `?` en el SQL
coincide exactamente con el número de parámetros pasados a `db.runAsync` (22 en total).

---

### T-05 — Sync: SupabaseSyncTransport

**Tipo:** Sync  
**Archivo:** `src/data/sync/SupabaseSyncTransport.ts`  
**Dependencias previas:** T-01

**Cambios exactos:**

En el método `syncCamisaMeasurement`, dentro del objeto pasado a `.upsert(...)`,
después de `escote: measurement.escote,` y antes de `notes: measurement.notes,`,
agregar:

```ts
cuello: measurement.cuello,
brazo: measurement.brazo,
puno: measurement.puno,
```

**Criterio de salida:** `tsc --noEmit` sin errores. Los tres campos nuevos se
envían a Supabase en cada push de camisa.

---

### T-06 — Sync: SupabasePullSync

**Tipo:** Sync  
**Archivo:** `src/data/sync/SupabasePullSync.ts`  
**Dependencias previas:** T-03 (columnas deben existir en SQLite antes de que
el pull intente escribirlas)

**Cambios exactos:**

#### 6a — SELECT string

Cambiar la cadena de columnas en el `.select(...)` de `pullCamisaMeasurements`:

```ts
// Antes
"id, client_id, espalda, hombro, talle_delantero, talle_trasero, " +
  "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
  "ancho_manga, escote, notes, created_at, updated_at";

// Después
"id, client_id, espalda, hombro, talle_delantero, talle_trasero, " +
  "distancia, separacion, pecho, cintura, base, largo, largo_manga, " +
  "ancho_manga, escote, cuello, brazo, puno, notes, created_at, updated_at";
```

#### 6b — Type `CamisaRow`

Después de `escote: number | null;` y antes de `notes: string | null;`, agregar:

```ts
cuello: number | null;
brazo: number | null;
puno: number | null;
```

#### 6c — INSERT SQL del pull

La lista de columnas del `INSERT INTO camisa_measurements` debe incluir
`cuello, brazo, puno` después de `ancho_manga, escote,` y antes de `notes,`.
El `VALUES (...)` debe agregar tres `?` extra en la misma posición.

#### 6d — ON CONFLICT DO UPDATE del pull

Después de `ancho_manga = excluded.ancho_manga,` y antes de `escote = excluded.escote,`:
_(verificar el orden exacto en el archivo actual y mantener consistencia)_

Agregar después de `escote = excluded.escote,`:

```sql
cuello     = excluded.cuello,
brazo      = excluded.brazo,
puno       = excluded.puno,
```

#### 6e — Lista de parámetros del `db.runAsync`

Después de `row.escote ?? null,` y antes de `row.notes ?? null,`, agregar:

```ts
row.cuello ?? null,
row.brazo ?? null,
row.puno ?? null,
```

**Criterio de salida:** `tsc --noEmit` sin errores. Número de `?` en el SQL del
pull coincide con los parámetros (22 en total).

---

### T-07 — Hook: useUpsertCamisa

**Tipo:** Lógica  
**Archivo:** `src/features/clients/hooks/useUpsertCamisa.ts`  
**Dependencias previas:** T-02

**Cambios exactos:**

En la función `mapValidationErrors`, dentro del objeto de retorno, después de la
entrada `escote:` y antes de `notes:`, agregar:

```ts
cuello: fieldErrors.cuello?.[0]
  ? { type: "zod", message: fieldErrors.cuello[0] }
  : undefined,
brazo: fieldErrors.brazo?.[0]
  ? { type: "zod", message: fieldErrors.brazo[0] }
  : undefined,
puno: fieldErrors.puno?.[0]
  ? { type: "zod", message: fieldErrors.puno[0] }
  : undefined,
```

**Criterio de salida:** `tsc --noEmit` sin errores. La validación de campos
nuevos es consistente con los existentes.

---

### T-08 — UI: CamisaMeasurementForm

**Tipo:** UI  
**Archivo:** `src/features/clients/components/CamisaMeasurementForm.tsx`  
**Dependencias previas:** T-02

**Cambios exactos:**

#### 8a — Interface `CamisaFormValues`

Después de `escote: string;` y antes de `notes: string;`, agregar:

```ts
cuello: string;
brazo: string;
puno: string;
```

#### 8b — Constante `CAMISA_FORM_DEFAULTS`

Después de `escote: "",` y antes de `notes: "",`, agregar:

```ts
cuello: "",
brazo: "",
puno: "",
```

#### 8c — JSX del formulario

Después del bloque `<MeasurementNumberField name="escote" .../>` y antes del
bloque `<MeasurementNotesField .../>`, agregar:

```tsx
<MeasurementNumberField
  name="cuello"
  label="Cuello (cm)"
  control={control}
  errorMessage={errors.cuello?.message}
  disabled={disabled}
/>
<MeasurementNumberField
  name="brazo"
  label="Brazo (cm)"
  control={control}
  errorMessage={errors.brazo?.message}
  disabled={disabled}
/>
<MeasurementNumberField
  name="puno"
  label="Puño (cm)"
  control={control}
  errorMessage={errors.puno?.message}
  disabled={disabled}
/>
```

**Criterio de salida:** El formulario renderiza 16 campos numéricos + notas (17 total).
`tsc --noEmit` sin errores. Los campos nuevos aparecen debajo de "Escote".

---

### T-09 — UI: CamisaMeasurementDetailScreen

**Tipo:** UI  
**Archivo:** `src/features/clients/screens/CamisaMeasurementDetailScreen.tsx`  
**Dependencias previas:** T-01, T-08

**Cambios exactos:**

En la función `toFormValues`, después de:

```ts
escote: measurement.escote != null ? String(measurement.escote) : "",
```

y antes de:

```ts
notes: typeof measurement.notes === "string" ? measurement.notes : "",
```

agregar:

```ts
cuello: measurement.cuello != null ? String(measurement.cuello) : "",
brazo: measurement.brazo != null ? String(measurement.brazo) : "",
puno: measurement.puno != null ? String(measurement.puno) : "",
```

**Criterio de salida:** Al cargar medidas guardadas, los nuevos campos se
precargan correctamente en el formulario. `tsc --noEmit` sin errores.

---

### T-10 — Tests: MeasurementRepositoryImpl

**Tipo:** Test  
**Archivo:** `src/data/local/MeasurementRepositoryImpl.test.ts`  
**Dependencias previas:** T-04

**Cambios exactos:**

Hay tres tests que afectan a `camisa`:

#### 10a — Test "upserts camisa (insert) with pending sync status..."

1. El objeto mock retornado por el **primer** `mockGetFirstAsync` (fila existente)
   debe agregar los nuevos campos después de `escote: null,`:

   ```ts
   cuello: null,
   brazo: null,
   puno: null,
   ```

2. El objeto `expect(created).toEqual(...)` debe incluir después de `escote: null,`:

   ```ts
   cuello: null,
   brazo: null,
   puno: null,
   ```

3. El array `expect(params).toEqual([...])` debe incluir tres `null` adicionales
   en la posición correcta (después del `null` de `escote` y antes de
   `"Ajustar molde"`), quedando:
   ```ts
   // ...
   null,    // escote
   null,    // cuello  ← NUEVO
   null,    // brazo   ← NUEVO
   null,    // puno    ← NUEVO
   "Ajustar molde",
   // ...
   ```

#### 10b — Test "upserts camisa preserving id and createdAt on conflict"

Los dos objetos mock de `mockGetFirstAsync` (fila existente antes y después del
upsert) deben agregar `cuello: null, brazo: null, puno: null,` después de `escote: null,`.

#### 10c — Test "triggers onWriteCommitted after successful upsert"

El objeto mock de `mockGetFirstAsync` para la fila resultado debe agregar
`cuello: null, brazo: null, puno: null,` después de `escote: null,`.

**Criterio de salida:** `npm test -- MeasurementRepositoryImpl` pasa sin errores.

---

### T-11 — Tests: useUpsertCamisa

**Tipo:** Test  
**Archivo:** `src/features/clients/hooks/useUpsertCamisa.test.ts`  
**Dependencias previas:** T-01, T-07

**Cambios exactos:**

Todo objeto literal de tipo `CamisaMeasurement` en el archivo (al menos el que
se construye en el test "usa repositorio del provider...") debe agregar
después de `escote: null,` (o el último campo numérico presente):

```ts
cuello: null,
brazo: null,
puno: null,
```

**Criterio de salida:** `npm test -- useUpsertCamisa` pasa sin errores.

---

## Orden de ejecución con dependencias

```
T-01 (types)
  ├── T-02 (schemas) ──── T-07 (hook validate) ──── T-11 (test hook)
  │                   └── T-08 (form UI)
  ├── T-04 (repo impl) ── T-10 (test repo)
  │   └── requiere T-03 (migrations) en runtime
  ├── T-05 (sync push)
  └── T-09 (detail screen)
       └── requiere T-08

T-03 (migrations) ── T-06 (sync pull)
```

**Secuencia recomendada para el Builder:**

| Paso | Tarea(s)                     | Motivo                                                 |
| ---- | ---------------------------- | ------------------------------------------------------ |
| 1    | T-01                         | Base de tipos: todo depende de esto                    |
| 2    | T-02, T-03                   | Pueden hacerse en paralelo: schema Zod y migración SQL |
| 3    | T-04, T-05, T-06, T-07, T-08 | Con tipos y schema listos, sin dependencias entre sí   |
| 4    | T-09                         | Depende de T-08 (CamisaFormValues actualizado)         |
| 5    | T-10, T-11                   | Con impl y hook listos                                 |

---

## Decisiones de Diseño

1. **Nombre sin tilde (`puno` vs `puño`):** consistencia con el esquema SQL donde
   los caracteres especiales generan encoding issues en SQLite y en nombres de
   columna Supabase. El label en la UI (`"Puño (cm)"`) sí usa la tilde porque es
   texto visible, no un identificador.

2. **Posición en el formulario:** los tres campos van después de `escote` y antes
   de `notes`. Esto mantiene el orden lógico: primero medidas de cuerpo, luego
   medidas de extremidades/detalles, finalmente notas.

3. **`number | null` no `number | undefined`:** consistente con todos los demás
   campos. `undefined` se descarta en la capa de normalización de `upsertCamisa`.

4. **No se modifica `CamisaMeasurementCreateScreen`:** el screen obtiene sus
   valores por defecto de `CAMISA_FORM_DEFAULTS` (que sí se actualiza en T-08)
   y pasa todo a través del hook `useUpsertCamisa` → schema Zod. No tiene
   lógica hardcoded de campos.

5. **`mapValidationErrors` en `useUpsertCamisa.ts`:** aunque los nuevos campos
   raramente tendrán errores de validación (son opcionales), la función debe ser
   exhaustiva para mantener la consistencia con el patrón existente y para que
   TypeScript no se queje si en el futuro se añaden reglas.

---

## Riesgos y Consideraciones

| Riesgo                                                                                                                                 | Mitigación                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dispositivo con BD en v2: `ALTER TABLE` falla si columna ya existe                                                                     | El guard `PRAGMA user_version` impide re-ejecutar; en instancia limpia no existe el problema                                    |
| Test snapshots en `CamisaMeasurementCreateScreen.test.tsx` o `CamisaMeasurementDetailScreen.test.tsx` con mocks de `CamisaMeasurement` | Revisar ambos archivos; si contienen objetos `CamisaMeasurement` completos deben actualizarse con los 3 nuevos campos en `null` |
| Supabase retorna `null` para columnas nuevas en filas antiguas (antes de migración remota)                                             | `row.cuello ?? null` en el pull ya maneja este caso correctamente                                                               |
| Número de `?` en SQL no coincide con params                                                                                            | Contar explícitamente tras cada cambio: INSERT camisa debe tener 22 columnas y 22 `?`                                           |
