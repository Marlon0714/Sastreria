# SUPABASE_MIGRATIONS.md

Este archivo documenta cada migración SQL que debe aplicarse manualmente en Supabase cuando se modifica el esquema local (SQLite).

---

## Checklist de migración

- [ ] ¿Agregaste/renombraste/eliminaste columnas en alguna tabla local?
- [ ] ¿Actualizaste este archivo con el SQL equivalente para Supabase?
- [ ] ¿Aplicaste el SQL en el Dashboard de Supabase antes de probar la app en cloud?
- [ ] ¿Verificaste que la tabla en Supabase tiene las columnas nuevas?

---

### v10_client_phones_cedula_saco_chaleco_measurements (2026-05-13)

```sql
-- Agregar columna phones (JSON string) y cedula a clients
ALTER TABLE clients ADD COLUMN phones TEXT;
ALTER TABLE clients ADD COLUMN cedula TEXT;

-- Crear tabla saco_measurements
CREATE TABLE IF NOT EXISTS saco_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  espalda REAL,
  talle_trasero REAL,
  largo REAL,
  pecho REAL,
  cintura REAL,
  base REAL,
  escote REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
  UNIQUE(client_id),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);

-- Crear tabla chaleco_measurements
CREATE TABLE IF NOT EXISTS chaleco_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  espalda REAL,
  talle_trasero REAL,
  largo REAL,
  pecho REAL,
  cintura REAL,
  base REAL,
  escote REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error')),
  UNIQUE(client_id),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);

-- Ajustes en camisa_measurements y pantalon_measurements (campos cuello, brazo, puno, etc)
ALTER TABLE camisa_measurements ADD COLUMN cuello REAL;
ALTER TABLE camisa_measurements ADD COLUMN brazo REAL;
ALTER TABLE camisa_measurements ADD COLUMN puno REAL;
-- Si ya existen, omitir error.
```

---

### v1_initial_schema

```sql
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);

CREATE TABLE IF NOT EXISTS camisa_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
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
  cuello REAL,
  brazo REAL,
  puno REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);

CREATE TABLE IF NOT EXISTS pantalon_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
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
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);
```

---

### v6_measurements_audit_trail

```sql
ALTER TABLE camisa_measurements ADD COLUMN changed_by TEXT;
ALTER TABLE camisa_measurements ADD COLUMN changed_at TEXT;
ALTER TABLE pantalon_measurements ADD COLUMN changed_by TEXT;
ALTER TABLE pantalon_measurements ADD COLUMN changed_at TEXT;
```

---

### v8_pricing_services

```sql
CREATE TABLE IF NOT EXISTS pricing_services (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_pricing_services_name ON pricing_services (name);
```

---

### v9_sync_delete_log

Tabla de auditoría para registrar eliminaciones sincronizadas con Supabase.
**Debe aplicarse en Supabase Dashboard → SQL Editor antes de usar la funcionalidad de borrado con sync.**

```sql
-- Crear tabla de audit log de eliminaciones
CREATE TABLE IF NOT EXISTS sync_delete_log (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement')),
  entity_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

-- Índice para consultas incrementales (pull sync por cursor)
CREATE INDEX IF NOT EXISTS idx_sync_delete_log_deleted_at
  ON sync_delete_log (deleted_at ASC, id ASC);

-- Habilitar Row Level Security
ALTER TABLE sync_delete_log ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden insertar (push de borrados desde la app)
CREATE POLICY "authenticated insert sync_delete_log"
  ON sync_delete_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: usuarios autenticados pueden leer (pull sync desde otros dispositivos)
CREATE POLICY "authenticated select sync_delete_log"
  ON sync_delete_log
  FOR SELECT
  TO authenticated
  USING (true);
```

---

### v11_saco_extra_fields (2026-05-17)

```sql
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS hombro REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS talle_delantero REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS distancia REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS separacion REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS largo_manga REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS ancho_manga REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS cuello REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS brazo REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS puno REAL;
```

---

### v12_client_tallas (2026-05-17)

```sql
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

CREATE INDEX IF NOT EXISTS idx_client_tallas_client_id ON client_tallas (client_id);

ALTER TABLE client_tallas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated all client_tallas"
  ON client_tallas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

### v13_talla_templates (2026-05-17)

```sql
CREATE TABLE IF NOT EXISTS talla_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('camisa', 'pantalon', 'saco', 'chaleco')),
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
  cuello REAL,
  brazo REAL,
  puno REAL,
  tiro REAL,
  pierna REAL,
  rodilla REAL,
  bota REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);

ALTER TABLE talla_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated all talla_templates"
  ON talla_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

### v14_wire_pricing_and_tallas_sync (2026-08-01)

**Contexto:** `pricing_services` y `client_tallas` nunca estuvieron conectadas al motor de sync (ver `N-058`/decisions-log 2026-08-01 en `.github/context/`). Al activarlas, se detectaron dos gaps en el esquema de Supabase respecto al local que deben aplicarse ANTES de desplegar el build con el fix:

```sql
-- 1. La migración local v13_pricing_services_category nunca se documentó/aplicó aquí.
-- Sin esto, cualquier upsert de pricing_service fallará (columna inexistente).
ALTER TABLE pricing_services
  ADD COLUMN category TEXT NOT NULL DEFAULT 'arreglo'
  CHECK (category IN ('arreglo', 'confeccion'));

-- 2. sync_delete_log.entity_type no permitía 'client_talla'. El delete de tallas
-- ya escribía este valor localmente (ver TallaRepositoryImpl.delete); sin este
-- ALTER, todo delete de talla queda atascado en estado 'error' permanentemente.
-- Verificar el nombre real de la constraint en el SQL editor antes del DROP.
ALTER TABLE sync_delete_log DROP CONSTRAINT IF EXISTS sync_delete_log_entity_type_check;
ALTER TABLE sync_delete_log
  ADD CONSTRAINT sync_delete_log_entity_type_check
  CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement', 'client_talla'));

-- 3. pricing_services no tenía RLS/policy documentada (a diferencia de client_tallas
-- y talla_templates). Verificar en el dashboard: si RLS está activado sin policy,
-- el sync fallará en silencio (permission denied). Aplicar solo si hace falta:
ALTER TABLE pricing_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all pricing_services" ON pricing_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

### v15_pricing_services_fix_column_case (2026-08-01)

**Contexto:** `v8_pricing_services` declaró `createdAt`/`updatedAt` sin comillas, y Postgres las plegó a `createdat`/`updatedat` (ver advertencia en Notas). El código de sync convivió un tiempo con esa inconsistencia mediante un alias (ver `decisions-log.md` N-071). Este es el arreglo de fondo: renombrar las columnas para que coincidan con el resto de las tablas (`created_at`/`updated_at`, snake_case estándar).

```sql
ALTER TABLE pricing_services RENAME COLUMN createdat TO created_at;
ALTER TABLE pricing_services RENAME COLUMN updatedat TO updated_at;
```

Después de aplicar esto, `SupabaseSyncTransport.ts` y `SupabasePullSync.ts` ya NO usan ningún alias ni nombre en minúscula para `pricing_services` — quedó igual de simple que las demás tablas.

---

### v16_pricing_service_delete_sync (2026-08-02)

**Contexto:** N-066 conecta el delete de `pricing_service` al mismo pipeline de `sync_delete_log` que ya usa `client_talla` (N-065). `PricingServiceRepositoryImpl.delete()` ahora escribe `entity_type: 'pricing_service'` en `sync_delete_log`, pero el CHECK de la tabla (ver `v14_wire_pricing_and_tallas_sync`) solo permite `'client', 'camisa_measurement', 'pantalon_measurement', 'client_talla'`. Sin este ALTER, **todo delete de un precio queda atascado en estado `error` para siempre** (mismo síntoma que tuvo `client_talla` antes de v14).

```sql
ALTER TABLE sync_delete_log DROP CONSTRAINT IF EXISTS sync_delete_log_entity_type_check;
ALTER TABLE sync_delete_log
  ADD CONSTRAINT sync_delete_log_entity_type_check
  CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement', 'client_talla', 'pricing_service'));
```

(Verificar el nombre real de la constraint en el SQL editor antes del DROP, puede diferir si Supabase la renombró automáticamente en algún punto.)

---

### v17_schedules (2026-08-02)

**Contexto:** N-008 (Agenda) — nueva entidad `schedule` conectada al sync desde el día uno (decisión explícita del usuario, para no repetir el gap de `pricing_service`/`client_talla` que costó arreglar en producción). Se necesita crear la tabla `schedules` en Supabase y permitir `'schedule'` en el CHECK de `sync_delete_log.entity_type` (el delete-sync también se conectó desde el inicio).

```sql
-- 1. Tabla schedules — mismas columnas snake_case que el resto (created_at/updated_at,
-- no createdAt/updatedAt como el error historico de pricing_services v8).
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients (id),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date);
CREATE INDEX IF NOT EXISTS idx_schedules_client_id ON schedules (client_id);

-- 2. RLS + policy, mismo patrón que las demás tablas.
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all schedules" ON schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Ampliar el CHECK de sync_delete_log para permitir 'schedule' (delete-sync
-- conectado desde el inicio, no en una pasada futura). Verificar el nombre real
-- de la constraint antes del DROP.
ALTER TABLE sync_delete_log DROP CONSTRAINT IF EXISTS sync_delete_log_entity_type_check;
ALTER TABLE sync_delete_log
  ADD CONSTRAINT sync_delete_log_entity_type_check
  CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement', 'client_talla', 'pricing_service', 'schedule'));
```

**Importante:** correr esto en Supabase ANTES de instalar un build que incluya el código de Agenda — sin la tabla, cualquier intento de sync de un turno fallará (`relation "schedules" does not exist`), y sin el CHECK ampliado, cualquier delete de turno quedará atascado en `error`.

---

### v18_profiles_roles (2026-08-03)

**Contexto:** Bloque 0 del rediseño de Agenda (N-076) — login real por operario (no texto libre) más roles, para poder atribuir cada acción a una persona concreta. Hoy el login es un candado binario sin ningún concepto de identidad; esta migración crea `profiles`, separada de `auth.users` (que Supabase gestiona internamente), y la función `resolve_operario_by_pin` que usa la tablet compartida del mostrador para identificar quién actúa sin exponer los hashes de PIN al cliente.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para hashear PINs con crypt()/gen_salt()

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operario')),
  is_shared_device BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- RLS controla FILAS, no columnas: sin este REVOKE, cualquier sesión autenticada
-- podría hacer `select pin_hash from profiles` directo (aunque el código de la
-- app nunca lo pida) y llevarse todos los hashes para intentar romperlos offline.
REVOKE SELECT (pin_hash) ON profiles FROM authenticated;

-- Sin política de UPDATE por ahora: ninguna pantalla edita el propio perfil
-- todavía. No se otorga un permiso que ninguna funcionalidad usa (si se
-- otorgara "self update" a nivel de fila como en un intento anterior, un
-- operario podría hacer `UPDATE profiles SET role='owner' WHERE id = auth.uid()`,
-- porque RLS por fila no restringe qué columnas se tocan). Cuando exista una
-- función real de "editar mi nombre", se agrega una policy o función que
-- permita tocar `display_name` únicamente, nunca `role` ni `pin_hash`.

-- Resuelve qué operario corresponde a un PIN, sin exponer los hashes al cliente.
CREATE OR REPLACE FUNCTION resolve_operario_by_pin(candidate_pin TEXT)
RETURNS TABLE (id UUID, display_name TEXT, role TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, display_name, role FROM profiles
  WHERE role = 'operario' AND pin_hash IS NOT NULL
    AND pin_hash = crypt(candidate_pin, pin_hash);
$$;
```

**Flujo para dar de alta un operario nuevo** (manual, por el dueño): crear el usuario en Supabase Dashboard → Authentication → Users (correo + contraseña), copiar su UUID, y correr:

```sql
INSERT INTO profiles (id, display_name, role, is_shared_device, pin_hash)
VALUES ('<uuid-del-usuario>', 'María Gómez', 'operario', false, crypt('1234', gen_salt('bf')));
```

Para la cuenta de la tablet compartida: mismo flujo pero `is_shared_device = true`, sin necesidad de `pin_hash` propio (nadie se identifica *como* la tablet, solo a través de ella).

**Importante:** correr esto en Supabase ANTES de instalar un build que incluya este código — sin la tabla `profiles`, `getProfile()` falla silenciosamente (retorna `null`) y ningún usuario tiene rol ni identidad más allá del login binario previo.

---

### v19_schedule_redesign — SOLO SQLite por ahora, Supabase pendiente (Fases 1-3 del Bloque 1, N-077)

**Contexto:** Rediseño de la Agenda — `date`/`time` pasan a opcionales, `status` cambia de valores placeholder (`pending/confirmed/completed/cancelled`) a los 5 estados de negocio reales (`pendiente/agendado/en_proceso/listo_para_entregar/entregado`), y se agregan `price`/`operario_id`/`ready_at`/`delivered_at` + la tabla `schedule_events` (historial append-only). El lado **SQLite ya está aplicado** (migración `v19_schedule_redesign` en `migrations.ts`, patrón "recrear tabla" — primera vez en el proyecto) y el **motor de sync ya está completamente cableado** en la app (Fase 3: `schedule` con las columnas nuevas + `schedule_event` como entidad nueva create-only, en los 6 archivos de siempre + el subscriber de realtime). El lado **Supabase todavía NO se ha migrado** — el SQL de abajo sigue sin ejecutarse.

**Riesgo real ahora que el sync está cableado:** con el código de sync ya activo, si se instala un build con este código apuntando a un Supabase sin esta migración, cualquier intento de sincronizar un turno fallará (`schedules` no tiene las columnas nuevas, o el `CHECK` de `status` en Supabase sigue esperando los valores viejos) y `schedule_events` fallará directo con `relation "schedule_events" does not exist`. Se confirmó con el usuario que **no hay datos reales de Agenda en producción todavía** (ningún build con esta feature salió a un dispositivo real), así que no hay riesgo de pérdida de datos — pero **no se debe instalar ningún build con este código hasta correr el SQL siguiente en Supabase**:

```sql
-- Pendiente de ejecutar ANTES de instalar cualquier build con este código:
ALTER TABLE schedules ALTER COLUMN date DROP NOT NULL;
ALTER TABLE schedules ALTER COLUMN time DROP NOT NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS operario_id UUID REFERENCES profiles (id);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE schedules
  ADD CONSTRAINT schedules_status_check
  CHECK (status IN ('pendiente', 'agendado', 'en_proceso', 'listo_para_entregar', 'entregado'));

CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_display_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_auto', 'status_manual', 'status_manual_correction', 'deleted')),
  changes TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all schedule_events" ON schedule_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- schedule_events NO se agrega a sync_delete_log: nunca se borra desde la app.
```

**Fase 4 (2026-08-04): sin cambios nuevos en Supabase.** El espejo local `profiles_cache` (picker de operario + selección offline de identidad) lee de la tabla `profiles` que ya existe desde el Bloque 0 (`v18_profiles_roles`) — la policy `authenticated read profiles` ya permite el pull, `updated_at` ya existe para el cursor, y `pin_hash` sigue sin exponerse (nunca se selecciona). Solo hubo migración local (`v20_profiles_cache` en `migrations.ts`) y código de la app.

---

## Notas

- Si agregas una columna local, **agrega aquí el SQL** y ejecútalo en Supabase.
- Si tienes dudas, revisa `src/data/local/migrations.ts` y traduce cada cambio relevante.
- Si una columna ya existe, puedes omitir el error correspondiente.
- **⚠️ Trampa de Postgres con `CREATE TABLE ... createdAt TEXT` (sin comillas):** Postgres pliega los identificadores no citados a minúsculas. El SQL de `v8_pricing_services` (arriba) declara `createdAt`/`updatedAt`, pero la tabla real en Supabase terminó con columnas `createdat`/`updatedat` (todo minúscula) — descubierto el 2026-08-01 al conectar el sync (error `42703 undefined_column`). SQLite local NO tiene este problema (preserva el case declarado y compara sin distinguir mayúsculas). Antes de asumir el nombre de una columna en Supabase, verifica con:
  ```sql
  SELECT column_name FROM information_schema.columns WHERE table_name = '<tabla>';
  ```
  **Resuelto 2026-08-01** (ver `v15_pricing_services_fix_column_case` arriba): se renombraron las columnas a `created_at`/`updated_at` y se quitó el alias del código. Esta nota queda como advertencia general para no repetir el error en una tabla futura.
- **⚠️ `sync_status` es `NOT NULL` sin `DEFAULT` en TODAS las tablas** (ver cada `CREATE TABLE` arriba: `sync_status TEXT NOT NULL CHECK (...)`, nunca `DEFAULT`). Esto existe desde `v1_initial_schema` (`clients`), no es nuevo. Si el `.upsert()` de `SupabaseSyncTransport.ts` no incluye `sync_status` explícitamente en el payload, la primera vez que un registro se inserta (fila nueva, no actualización) Postgres intenta dejarlo en `NULL` y viola el constraint — descubierto el 2026-08-01 al reportar el error "null value in column sync_status violates not-null constraint" para `pricing_services`/`client_tallas`, pero afectaba potencialmente a CUALQUIER tabla desde el principio. Fix: **todos** los métodos `syncX()` en `SupabaseSyncTransport.ts` ahora envían `sync_status: "synced"` explícitamente (tiene sentido semántico: si el registro llegó a Supabase, por definición ya está sincronizado desde la perspectiva del servidor). Si agregas una entidad nueva al sync, no olvides este campo.
