# Plan: UI/UX + Múltiples Teléfonos + Tallas

**Fecha**: 14 de mayo de 2026  
**Rama sugerida**: `feature/clients/ui-phones-tallas`

---

## Resumen de cambios

Este plan cubre tres bloques funcionales independientes:

1. **REQ-1 – Mejoras UI/UX generales**: etiquetas de formularios con mayor tamaño de fuente, labels con íconos en `ClientDetailScreen`, y tarjetas con ícono en `MeasurementTypeSelectScreen`.
2. **REQ-2 – Múltiples teléfonos y cédula**: la columna `phones TEXT` y `cedula TEXT` ya existen en la DB (migración v9). Solo falta conectar dominio, esquemas, repositorio y pantallas de formulario.
3. **REQ-3 – Tallas por cliente**: feature nueva completa. Requiere migración v10 (tabla `client_tallas`), dominio, repositorio, hook, form, screen y navegación.

**Contexto relevante encontrado en el código:**

- `migrations.ts` v9 ya ejecuta `ALTER TABLE clients ADD COLUMN phones TEXT` y `ADD COLUMN cedula TEXT`. No se necesita nueva migración para esas columnas. `TARGET_SCHEMA_VERSION = 9`.
- `types.ts` declara `Client.phones?: string[]` y `Client.cedula?: string` pero `CreateClientDTO` y `UpdateClientDTO` NO los incluyen aún.
- `createClientSchema` y `updateClientSchema` en `schemas.ts` no tienen `phones` ni `cedula`.
- `ClientRepositoryImpl.ts` no lee ni escribe `phones` ni `cedula`.
- Los labels de `CamisaMeasurementForm`, `PantalonMeasurementForm`, `SacoMeasurementForm` ya son descriptivos ("Talle delantero (cm)", "Largo manga (cm)"). Solo se necesita aumentar el `fontSize` del label en `MeasurementFields.tsx` de `13` → `15`.
- La dependencias se inyectan vía `ClientsDependencies` context; hay que extender la interfaz para el nuevo `TallaRepository`.
- El migration runner itera el array `MIGRATIONS` en orden de declaración, aplicando solo las versiones `> currentVersion`. v10 debe añadirse **al inicio del array** (antes de v9) para que en upgrades de v9→v10 se aplique correctamente.

---

## Tareas

### Bloque 1 — Dominio y DB (sin UI)

#### T-1.1 — Migración v10: tabla `client_tallas`

**Archivos**: `src/data/local/migrations.ts`

**Descripción**:

1. Cambiar `TARGET_SCHEMA_VERSION` de `9` a `10`.
2. Insertar un nuevo objeto de migración **al inicio del array `MIGRATIONS`** (antes del objeto `version: 9`):

```ts
{
  version: 10,
  name: "v10_client_tallas",
  statements: [
    `
    CREATE TABLE IF NOT EXISTS client_tallas (
      id TEXT PRIMARY KEY NOT NULL,
      client_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('camisa', 'pantalon', 'saco', 'chaleco')),
      value TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
      UNIQUE(client_id, type),
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
    );
    `,
    `CREATE INDEX IF NOT EXISTS idx_client_tallas_client_id
     ON client_tallas (client_id);`,
  ],
},
```

**Dependencias**: ninguna.

---

#### T-1.2 — Tipos de dominio: DTOs y `ClientTalla`

**Archivos**: `src/features/clients/domain/types.ts`

**Descripción**:

1. Actualizar `CreateClientDTO`: añadir `phones?: string[]` y `cedula?: string`.
2. Actualizar `UpdateClientDTO`: añadir `phones?: string[]` y `cedula?: string`.
3. Añadir al final del archivo:

```ts
export type TallaType = "camisa" | "pantalon" | "saco" | "chaleco";

export interface ClientTalla extends BaseEntity {
  clientId: string;
  type: TallaType;
  value: string;
  notes: string | null;
}

export interface CreateTallaDTO {
  clientId: string;
  type: TallaType;
  value: string;
  notes?: string;
}

export interface UpdateTallaDTO {
  id: string;
  clientId: string;
  type: TallaType;
  value: string;
  notes?: string;
}
```

**Dependencias**: ninguna.

---

#### T-1.3 — Schemas Zod: phones/cedula + tallas

**Archivos**: `src/features/clients/domain/schemas.ts`

**Descripción**:

1. Añadir helper `optionalPhoneField`:

```ts
const optionalPhoneField = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v === "" ? undefined : v));
```

2. Añadir helper `optionalCedulaField`:

```ts
const optionalCedulaField = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v === "" ? undefined : v));
```

3. Actualizar `createClientSchema` para añadir los nuevos campos:

```ts
export const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  phone: z.string().trim().min(7, "El teléfono no es válido").max(30),
  phone2: optionalPhoneField,
  phone3: optionalPhoneField,
  cedula: optionalCedulaField,
  notes: z.string().trim().max(500).optional(),
});
```

4. Actualizar `updateClientSchema` de forma equivalente (añadir `phone2`, `phone3`, `cedula` opcionales).

5. Actualizar el `export type CreateClientSchemaInput` y `CreateClientSchemaOutput` (se actualizan automáticamente al ser `z.input<>` / `z.output<>`).

6. Añadir al final del archivo:

```ts
export const createTallaSchema = z.object({
  clientId: z.string().uuid("El cliente es inválido"),
  type: z.enum(["camisa", "pantalon", "saco", "chaleco"]),
  value: z.string().trim().min(1, "La talla es obligatoria").max(20),
  notes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const updateTallaSchema = createTallaSchema.extend({
  id: z.string().uuid("El id de talla es inválido"),
});

export type CreateTallaSchemaInput = z.input<typeof createTallaSchema>;
export type CreateTallaSchemaOutput = z.output<typeof createTallaSchema>;
export type UpdateTallaSchemaInput = z.input<typeof updateTallaSchema>;
export type UpdateTallaSchemaOutput = z.output<typeof updateTallaSchema>;
```

**Dependencias**: T-1.2.

---

#### T-1.4 — Interfaz `TallaRepository` + actualizar `ClientsDependencies`

**Archivos**: `src/features/clients/domain/repository.ts`

**Descripción**:

1. Importar `ClientTalla`, `CreateTallaDTO`, `UpdateTallaDTO` desde `./types`.
2. Añadir interfaz:

```ts
export interface TallaRepository {
  upsert(input: CreateTallaDTO | UpdateTallaDTO): Promise<ClientTalla>;
  findByClientId(clientId: string): Promise<ClientTalla[]>;
  delete(id: string): Promise<void>;
}
```

3. Añadir `tallaRepository: TallaRepository` a `ClientsDependencies`.
4. Añadir `tallaRepository?: TallaRepository` a `ClientsDependenciesOverrides`.

**Dependencias**: T-1.2.

---

### Bloque 2 — Datos (Repositorios)

#### T-2.1 — `ClientRepositoryImpl`: phones (JSON) y cedula

**Archivos**: `src/data/local/ClientRepositoryImpl.ts`

**Descripción**:

1. Actualizar interfaz `ClientRow` para incluir:

```ts
phones: string | null; // JSON array de teléfonos adicionales
cedula: string | null;
```

2. Actualizar `mapClientRow` para parsear phones:

```ts
function mapClientRow(row: ClientRow): Client {
  return {
    // ...campos existentes...
    phones: row.phones ? (JSON.parse(row.phones) as string[]) : undefined,
    cedula: row.cedula ?? undefined,
    // ...
  };
}
```

3. Actualizar todos los `SELECT` statements de `findAll`, `findById` y el `SELECT` post-update en `update` para incluir `phones, cedula`.

4. Actualizar el `INSERT INTO clients` en `create` para incluir los nuevos campos:
   - Agregar `phones` y `cedula` a la lista de columnas.
   - Agregar al array de valores: `JSON.stringify(input.phones ?? []) || null` para phones, `input.cedula ?? null` para cedula.

5. Actualizar el `UPDATE clients SET` en `update` para incluir `phones = ?, cedula = ?` con sus valores correspondientes.

6. Actualizar el objeto `Client` que se construye en `update` (para el fallback cuando `row` es null) para incluir `phones` y `cedula`.

**Lógica de phones**: `phones` en el DTO representa los teléfonos ADICIONALES (phone2, phone3). El primary `phone` sigue en su propia columna. Almacenar como JSON: `JSON.stringify(input.phones?.filter(Boolean) ?? []) || null`.

**Dependencias**: T-1.2.

---

#### T-2.2 — `TallaRepositoryImpl`: CRUD SQLite

**Archivos**: `src/data/local/TallaRepositoryImpl.ts` _(crear nuevo)_

**Descripción**: Crear la clase `TallaRepositoryImpl implements TallaRepository`.

Estructura interna:

```ts
interface TallaRow {
  id: string;
  client_id: string;
  type: "camisa" | "pantalon" | "saco" | "chaleco";
  value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: "pending" | "synced" | "error";
}

function mapTallaRow(row: TallaRow): ClientTalla {
  /* mapeo directo */
}
```

Métodos a implementar:

**`upsert(input)`**: INSERT OR REPLACE. Si `input` tiene `id` (UpdateTallaDTO), usar ese id; si no, generar con `generateDomainUuid()`. El `sync_status` siempre se establece en `'pending'`.

```sql
INSERT OR REPLACE INTO client_tallas
  (id, client_id, type, value, notes, created_at, updated_at, sync_status)
VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');
```

Para upsert por `(client_id, type)`: usar `INSERT OR REPLACE` aprovechando la constraint `UNIQUE(client_id, type)`. Siempre pasar el `id` generado; el OR REPLACE eliminará la fila anterior con el mismo (client_id, type).

**`findByClientId(clientId)`**:

```sql
SELECT * FROM client_tallas WHERE client_id = ? ORDER BY type ASC;
```

**`delete(id)`**: `DELETE FROM client_tallas WHERE id = ?;` + insertar en `sync_delete_log` dentro de una transacción.

El constructor acepta `{ onWriteCommitted?: () => void }` (patrón igual que `ClientRepositoryImpl`).

**Dependencias**: T-1.1, T-1.2, T-1.4.

---

#### T-2.3 — `clientsDependencies.ts`: registrar `TallaRepository`

**Archivos**: `src/data/local/clientsDependencies.ts`

**Descripción**:

1. Importar `TallaRepository` desde el dominio.
2. Añadir variable singleton `let defaultTallaRepository: TallaRepository | null = null`.
3. Añadir función `getDefaultTallaRepository()` con lazy require a `TallaRepositoryImpl`, análogo a `getDefaultMeasurementRepository()`.
4. Actualizar `resolveTallaRepository`, `getClientsDependencies`, y `createClientsDependencies` para incluir `tallaRepository`.

**Dependencias**: T-1.4, T-2.2.

---

#### T-2.4 — `ClientsDependenciesProvider`: exponer `useTallaRepository()`

**Archivos**: `src/features/clients/hooks/ClientsDependenciesProvider.tsx`

**Descripción**:

1. Importar `TallaRepository` desde `../domain/repository`.
2. Añadir hook exportado:

```ts
export function useTallaRepository(): TallaRepository {
  return useClientsDependencies().tallaRepository;
}
```

**Dependencias**: T-1.4.

---

### Bloque 3 — UI/UX mejoras generales

#### T-3.1 — `MeasurementFields.tsx`: aumentar tamaño de label

**Archivos**: `src/features/clients/components/MeasurementFields.tsx`

**Descripción**:
En el objeto `styles` (StyleSheet.create), cambiar:

```ts
label: {
  fontSize: 13,  // → cambiar a 15
  color: "#334155",
  fontWeight: "600",
},
```

Solo ese cambio. No modificar más estilos.

**Dependencias**: ninguna.

---

#### T-3.2 — `ClientDetailScreen`: labels con ícono y layout mejorado

**Archivos**: `src/features/clients/screens/ClientDetailScreen.tsx`

**Descripción**:

1. En la card del cliente, reemplazar los `<Text>` planos de teléfono y notas por filas con label explícito:

```tsx
<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>📱 Teléfono</Text>
  <Text style={styles.infoValue}>{client.phone}</Text>
</View>;
{
  client.notes ? (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>📋 Notas</Text>
      <Text style={styles.infoValue}>{client.notes}</Text>
    </View>
  ) : null;
}
```

2. Añadir estilos:

```ts
infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', minWidth: 90 },
infoValue: { flex: 1, fontSize: 15, color: '#0f172a' },
```

3. Renombrar el botón "Medidas" a "Ver / Registrar medidas" y darle accesibilidad más clara.

**Nota**: los campos adicionales de phones y cedula se añaden en T-4.4 (no aquí).

**Dependencias**: ninguna.

---

#### T-3.3 — `MeasurementTypeSelectScreen`: tarjetas con ícono

**Archivos**: `src/features/clients/screens/MeasurementTypeSelectScreen.tsx`

**Descripción**:
Reemplazar la lista de `Pressable` planos por tarjetas con ícono usando la siguiente estructura por tipo:

| type     | emoji | label    |
| -------- | ----- | -------- |
| Camisa   | 👔    | Camisa   |
| Pantalón | 👖    | Pantalón |
| Saco     | 🧥    | Saco     |
| Chaleco  | 🦺    | Chaleco  |

Extraer un array de configuración local y renderizar con `.map()`:

```ts
const GARMENT_OPTIONS = [
  {
    key: "camisa",
    emoji: "👔",
    label: "Camisa",
    createRoute: "CamisaMeasurementDetail",
    viewRoute: "CamisaMeasurementDetail",
  },
  {
    key: "pantalon",
    emoji: "👖",
    label: "Pantalón",
    createRoute: "PantalonMeasurementDetail",
    viewRoute: "PantalonMeasurementDetail",
  },
  {
    key: "saco",
    emoji: "🧥",
    label: "Saco",
    createRoute: "SacoMeasurementCreate",
    viewRoute: "SacoMeasurementEdit",
  },
  {
    key: "chaleco",
    emoji: "🦺",
    label: "Chaleco",
    createRoute: "ChalecoMeasurementCreate",
    viewRoute: "ChalecoMeasurementEdit",
  },
] as const;
```

Cada tarjeta renderiza un `Pressable` con layout `row`, ícono grande (fontSize: 28), nombre de prenda (fontSize: 17, fontWeight "600"), y flecha "›" al final. Estilos de card con `backgroundColor: '#fff'`, `borderRadius: 12`, `borderWidth: 1`, `borderColor: '#e2e8f0'`, `padding: 16`.

Eliminar `<Text style={styles.description}>` — no es necesario.

**Dependencias**: ninguna.

---

### Bloque 4 — Múltiples teléfonos y cédula

#### T-4.1 — Hooks `useCreateClient` y `useUpdateClient`: phones y cedula

**Archivos**:

- `src/features/clients/hooks/useCreateClient.ts`
- `src/features/clients/hooks/useUpdateClient.ts`

**Descripción para `useCreateClient`**:

1. Actualizar `mapValidationErrors` para incluir errores de `phone2`, `phone3`, `cedula`.
2. Actualizar el `reset()` al final de `createClient` para vaciar también `phone2`, `phone3`, `cedula`.
3. En `createClient`, antes de pasar al repositorio, construir el array `phones`:

```ts
const phones = [values.phone2, values.phone3].filter((p): p is string =>
  Boolean(p?.trim()),
);
const payload = {
  ...createClientSchema.parse(values),
  phones: phones.length > 0 ? phones : undefined,
};
```

Nota: `createClientSchema.parse(values)` ya incluye los nuevos campos `phone2`, `phone3`, `cedula` del schema actualizado (T-1.3). El mapeo a `phones[]` se hace en el hook (no en el schema) para mantener el DTO limpio.

**Descripción para `useUpdateClient`**:

1. Actualizar `mapValidationErrors` de forma análoga para `phone2`, `phone3`, `cedula`.
2. Misma lógica de construcción de `phones[]` en `updateClient`.

**Dependencias**: T-1.2, T-1.3.

---

#### T-4.2 — `ClientCreateScreen`: campos phone2, phone3, cedula

**Archivos**: `src/features/clients/screens/ClientCreateScreen.tsx`

**Descripción**:

1. Actualizar `useForm<CreateClientSchemaInput>` con `defaultValues` para incluir `phone2: '', phone3: '', cedula: ''`.
2. Actualizar el array de keys de validación para incluir `'phone2', 'phone3', 'cedula'`.
3. Añadir tres nuevos `<View style={styles.fieldGroup}>` después del campo `phone`:
   - `phone2`: label "Teléfono 2 (opcional)", `keyboardType="phone-pad"`, no required.
   - `phone3`: label "Teléfono 3 (opcional)", `keyboardType="phone-pad"`, no required.
   - `cedula`: label "Cédula (opcional)", `keyboardType="number-pad"`, no required.
4. Agrupar los tres campos de teléfono bajo un separador visual sutil (e.g., `<Text style={styles.sectionLabel}>Contacto</Text>`) para dejar claro que son relacionados.

**Dependencias**: T-1.3, T-4.1.

---

#### T-4.3 — `ClientEditScreen`: campos phone2, phone3, cedula + pre-fill

**Archivos**: `src/features/clients/screens/ClientEditScreen.tsx`

**Descripción**:

1. Actualizar `useForm<UpdateClientSchemaInput>` con `defaultValues` para incluir `phone2: '', phone3: '', cedula: ''`.
2. Actualizar el `useEffect` que hace `reset(...)` para pre-poblar los nuevos campos:

```ts
reset({
  id: client.id,
  firstName: client.firstName,
  lastName: client.lastName,
  phone: client.phone,
  phone2: client.phones?.[0] ?? "",
  phone3: client.phones?.[1] ?? "",
  cedula: client.cedula ?? "",
  notes: client.notes ?? "",
});
```

3. Añadir los mismos tres campos de formulario que en `ClientCreateScreen` (T-4.2).
4. Actualizar el array de keys de validación.

**Dependencias**: T-1.3, T-4.1.

---

#### T-4.4 — `ClientDetailScreen`: mostrar phones adicionales y cedula

**Archivos**: `src/features/clients/screens/ClientDetailScreen.tsx`

**Descripción**:
Dentro de la card del cliente (después de la fila de teléfono primario añadida en T-3.2), añadir renders condicionales:

```tsx
{
  client.phones?.map((phone, idx) => (
    <View key={idx} style={styles.infoRow}>
      <Text style={styles.infoLabel}>📱 Tel. {idx + 2}</Text>
      <Text style={styles.infoValue}>{phone}</Text>
    </View>
  ));
}
{
  client.cedula ? (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>🪪 Cédula</Text>
      <Text style={styles.infoValue}>{client.cedula}</Text>
    </View>
  ) : null;
}
```

**Dependencias**: T-2.1, T-3.2.

---

### Bloque 5 — Tallas

#### T-5.1 — Hook `useTallas`

**Archivos**: `src/features/clients/hooks/useTallas.ts` _(crear nuevo)_

**Descripción**: Hook que encapsula el CRUD de tallas para un cliente.

```ts
interface UseTallasResult {
  tallas: ClientTalla[];
  isLoading: boolean;
  error: string | null;
  upsertTalla: (
    input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
  ) => Promise<ClientTalla | null>;
  deleteTalla: (id: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useTallas(clientId: string): UseTallasResult;
```

Comportamiento:

- Al montar: llama `tallaRepository.findByClientId(clientId)` y guarda en estado.
- `upsertTalla`: valida con `createTallaSchema` o `updateTallaSchema` según presencia de `id`, llama `tallaRepository.upsert(...)` y recarga.
- `deleteTalla`: llama `tallaRepository.delete(id)` y recarga; devuelve `true` si éxito.
- Usa `useTallaRepository()` del provider.
- `error` se formatea como string para UI.

**Dependencias**: T-1.2, T-1.3, T-1.4, T-2.2, T-2.4.

---

#### T-5.2 — Componente `TallaForm`

**Archivos**: `src/features/clients/components/TallaForm.tsx` _(crear nuevo)_

**Descripción**: Formulario controlado para crear/editar una talla.

```ts
export interface TallaFormValues {
  type: TallaType;
  value: string;
  notes: string;
}

export const TALLA_FORM_DEFAULTS: TallaFormValues = {
  type: "camisa",
  value: "",
  notes: "",
};

interface TallaFormProps {
  control: Control<TallaFormValues>;
  errors: FieldErrors<TallaFormValues>;
  disabled?: boolean;
  /** Si true, el selector de tipo se muestra como read-only (edición). */
  lockType?: boolean;
}
```

Campos del formulario:

1. **Tipo de prenda** (`type`): mostrar como selector de chips horizontales (4 opciones: 👔 Camisa, 👖 Pantalón, 🧥 Saco, 🦺 Chaleco). Si `lockType=true`, renderizar como texto plano no editable.
2. **Talla** (`value`): `TextInput`, `placeholder="Ej: M, 38, 40/32"`, `autoCapitalize="characters"`.
3. **Notas** (`notes`): `TextInput multiline`, opcional.

Implementar el selector de chips con `Pressable` en un `ScrollView horizontal`. Cada chip resaltado cuando está seleccionado (`backgroundColor: '#0f766e'`, texto blanco) vs no seleccionado (borde gris).

**Dependencias**: T-1.2.

---

#### T-5.3 — Screen `TallasScreen`

**Archivos**: `src/features/clients/screens/TallasScreen.tsx` _(crear nuevo)_

**Descripción**: Pantalla de gestión de tallas del cliente.

Props: `NativeStackScreenProps<ClientsStackParamList, 'Tallas'>`.

**Estructura de la pantalla**:

- `useFocusEffect` para recargar tallas al entrar.
- `useTallas(clientId)` para obtener datos.
- Muestra los 4 tipos de prenda como cards. Para cada tipo:
  - Si tiene talla: muestra el valor (grande, `fontSize: 22, fontWeight: "700"`), notas si hay, botón "Editar".
  - Si NO tiene talla: muestra "—" y botón "Añadir".
- Al pulsar "Editar" o "Añadir": muestra un modal (`Modal` de RN) con el `TallaForm` integrado y un botón "Guardar".
- Botón "Eliminar" (con `Alert.alert` de confirmación) solo aparece si la talla existe.

**Estado del modal**:

```ts
const [editingType, setEditingType] = useState<TallaType | null>(null);
const [editingTalla, setEditingTalla] = useState<ClientTalla | null>(null);
```

**Lógica de submit del modal**:

- Usa `useForm<TallaFormValues>` dentro de la screen (no en el form).
- Al confirmar, llama `useTallas.upsertTalla` con `{ clientId, type, value, notes }` (create) o con `{ id, clientId, type, value, notes }` (update).

**Ordenado visual**: siempre mostrar los 4 tipos en orden fijo: camisa → pantalón → saco → chaleco.

**Dependencias**: T-1.2, T-5.1, T-5.2.

---

#### T-5.4 — `ClientDetailScreen`: sección "Tallas"

**Archivos**: `src/features/clients/screens/ClientDetailScreen.tsx`

**Descripción**:

1. Importar y usar `useTallas(client.id)`.
2. Añadir una nueva sección visual debajo de la card de datos del cliente, antes de los botones de acción:

```tsx
<View style={styles.tallasSection}>
  <Text style={styles.tallasSectionTitle}>Tallas</Text>
  {tallasResumen}
  <Pressable
    style={styles.secondaryButtonBlock}
    onPress={() => navigation.navigate("Tallas", { clientId: client.id })}
  >
    <Text style={styles.secondaryButtonText}>Gestionar tallas</Text>
  </Pressable>
</View>
```

3. `tallasResumen`: renderizar máximo 4 chips horizontales con el valor de cada talla (tipo + valor, e.g., "👔 M"). Si no hay tallas, mostrar `<Text style={styles.emptyTallas}>Sin tallas registradas</Text>`.
4. Añadir estilo `tallasSection`, `tallasSectionTitle`, `emptyTallas`.

**Dependencias**: T-5.1, T-5.5, T-5.6 (navegación disponible).

---

#### T-5.5 — `navigation/types.ts`: nueva ruta `Tallas`

**Archivos**: `src/navigation/types.ts`

**Descripción**:
Añadir a `ClientsStackParamList`:

```ts
/** Gestión de tallas del cliente. */
Tallas: {
  clientId: string;
}
```

**Dependencias**: ninguna.

---

#### T-5.6 — `ClientsStackNavigator`: registrar `TallasScreen`

**Archivos**: `src/navigation/ClientsStackNavigator.tsx`

**Descripción**:

1. Importar `TallasScreen` desde `'../features/clients/screens/TallasScreen'`.
2. Añadir dentro del `Stack.Navigator`:

```tsx
<Stack.Screen
  name="Tallas"
  component={TallasScreen}
  options={{ title: "Tallas del cliente" }}
/>
```

**Dependencias**: T-5.3, T-5.5.

---

### Bloque 6 — Tests

#### T-6.1 — `TallaRepositoryImpl.test.ts`

**Archivos**: `src/data/local/TallaRepositoryImpl.test.ts` _(crear nuevo)_

**Descripción**: Tests unitarios del repositorio con mock de `expo-sqlite` (ya existe en `__mocks__/expo-sqlite.js`).

Casos a cubrir:

- `upsert` crea una talla nueva y retorna el objeto con `syncStatus: 'pending'`.
- `upsert` con mismo `(clientId, type)` actualiza la talla existente (INSERT OR REPLACE).
- `findByClientId` retorna array vacío si no hay tallas.
- `findByClientId` retorna las tallas del cliente en orden alfabético de `type`.
- `delete` elimina la talla e inserta en `sync_delete_log`.

**Dependencias**: T-2.2.

---

#### T-6.2 — `useTallas.test.ts`

**Archivos**: `src/features/clients/hooks/useTallas.test.ts` _(crear nuevo)_

**Descripción**: Tests del hook con `TallaRepository` falso inyectado.

Casos a cubrir:

- Al montar, llama `findByClientId` y popula `tallas`.
- `upsertTalla` con datos válidos llama `tallaRepository.upsert` y recarga.
- `upsertTalla` con datos inválidos (ej: `value` vacío) NO llama al repositorio y retorna `null`.
- `deleteTalla` llama `tallaRepository.delete` y recarga.
- Estado `isLoading` es `true` durante la carga y `false` al terminar.

Usar `renderHook` de `@testing-library/react-native`. Envolver con `ClientsDependenciesProvider` con dependencias fake.

**Dependencias**: T-5.1.

---

#### T-6.3 — `useCreateClient.test.ts` (ampliar)

**Archivos**: `src/features/clients/hooks/useCreateClient.test.ts` _(crear o extender)_

**Descripción**: Añadir casos de prueba para los nuevos campos:

- `createClient` con `phone2` y `phone3` válidos guarda `phones: ['phone2', 'phone3']` en el DTO.
- `createClient` con `phone2` vacío guarda `phones: undefined` (no persiste vacíos).
- `createClient` con `cedula` válida la incluye en el DTO.
- Validación Zod rechaza `phone2` de más de 30 chars.

**Dependencias**: T-4.1.

---

## Orden de implementación recomendado

```
Bloque 1 (dominio) → Bloque 2 (repositorios) → Bloque 3 (UI general, independiente) →
Bloque 4 (phones/cedula) → Bloque 5 (tallas) → Bloque 6 (tests)
```

Dentro de cada bloque, seguir el orden numérico de tareas. Los bloques 3 y 4 pueden desarrollarse en paralelo con el bloque 2, ya que el bloque 3 no depende de datos y el bloque 4 UI depende solo de los schemas (T-1.3).

**Commits sugeridos** (uno por tarea o por grupo cohesivo):

```
chore(db): add v10 migration for client_tallas table
feat(clients): extend domain DTOs with phones and cedula
feat(clients): add phones/cedula to client schemas + talla schemas
feat(clients): add TallaRepository interface and ClientsDependencies entry
feat(clients): wire phones and cedula in ClientRepositoryImpl
feat(clients): add TallaRepositoryImpl with SQLite CRUD
chore(clients): register TallaRepository in dependencies provider
style(clients): increase measurement label font size to 15
feat(clients): add icon-labels and cedula/phones to ClientDetailScreen
feat(clients): replace MeasurementTypeSelect buttons with icon cards
feat(clients): add phone2, phone3, cedula to create/edit client hooks
feat(clients): add phone2, phone3, cedula fields to ClientCreateScreen
feat(clients): add phone2, phone3, cedula fields to ClientEditScreen
feat(clients): add useTallas hook
feat(clients): add TallaForm component with type chip selector
feat(clients): add TallasScreen with modal edit/create
feat(clients): add Tallas section to ClientDetailScreen
feat(navigation): register Tallas screen in ClientsStackNavigator
test(clients): add TallaRepositoryImpl unit tests
test(clients): add useTallas hook unit tests
test(clients): add useCreateClient tests for phones/cedula
```

---

## Decisiones de Diseño

### phones como array de teléfonos adicionales (no incluyendo el primario)

El campo `phone` en `clients` sigue siendo la fuente de verdad del teléfono primario. `phones[]` almacena solo los adicionales (phone2, phone3) como JSON en la columna `phones TEXT` que ya existe en v9. Esto preserva compatibilidad con código existente que lee `client.phone`.

### Tallas: UNIQUE(client_id, type) + INSERT OR REPLACE

Un cliente tiene máximo una talla por tipo de prenda. INSERT OR REPLACE garantiza que "upsert" sea un solo statement, sin necesidad de SELECT previo. El `id` siempre se genera antes del INSERT OR REPLACE para mantener el id estable en caso de update.

### Tallas: modal en lugar de pantalla separada de formulario

El formulario de talla es simple (2-3 campos). Usar un `Modal` dentro de `TallasScreen` evita añadir 4 rutas de navegación adicionales (una por tipo) y simplifica el flujo: el usuario permanece en la pantalla de tallas al crear/editar.

### TallaForm: chips para tipo

El tipo de prenda es un enum de 4 valores. Un selector de chips horizontales es más rápido de usar y más claro visualmente que un Picker/Dropdown en un formulario mobile.

### MeasurementFields fontSize 13 → 15

El font size de 13px en labels de medidas es inferior al texto base (15px). Para formularios densos de medidas (la camisa tiene 16 campos), los labels son la guía principal de lectura. Subir a 15px mejora la legibilidad sin requerir rediseño de layout.

---

## Riesgos y Consideraciones

### Migración v9 y ordenamiento del array MIGRATIONS

El migration runner itera el array `MIGRATIONS` en orden de declaración (no ordenado). V9 está primero. Para que v10 se aplique en upgrades de v9→v10, debe estar insertado **antes** de v9 en el array (el runner recorre todos y aplica los que tienen `version > currentVersion`). Verificar que el runner no asuma orden ascendente.

### `phones` JSON y SQLite: valores null vs '[]'

Al persistir `phones`, si el array está vacío, guardar `null` (no `'[]'`) para que `mapClientRow` retorne `undefined` y `Client.phones` sea undefined. Evitar distinguir entre `null`, `undefined`, y `[]` en múltiples lugares.

### `ClientDeleteScreen`: borrado en cascada de tallas

El `DELETE FROM clients WHERE id = ?` en `ClientRepositoryImpl.delete` debe también borrar las tallas. Dos opciones: (a) usar la FK `ON DELETE CASCADE` declarada en v10, o (b) añadir `DELETE FROM client_tallas WHERE client_id = ?` en la transacción. Dado que Expo SQLite puede tener FK enforcement desactivado, **se recomienda (b)**: añadir el DELETE explícito dentro de `ClientRepositoryImpl.delete` (en la misma transacción que ya borra camisa/pantalon measurements).

### Pre-llenado de `phone2`/`phone3` en `ClientEditScreen`

`client.phones?.[0]` puede ser undefined si el cliente fue creado antes de v9 (sin phones). El `?? ''` en el reset lo maneja correctamente — no hay riesgo.

### Expo SQLite y transacciones en `TallaRepositoryImpl.delete`

Usar `db.withTransactionAsync` igual que en `ClientRepositoryImpl.delete` para garantizar atomicidad del DELETE + INSERT en `sync_delete_log`.
