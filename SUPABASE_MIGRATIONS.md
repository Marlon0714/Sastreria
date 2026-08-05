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

**⚠️ Corrección 2026-08-04 (QA de flujos, N-077 en adelante):** esta sección nunca incluyó la columna `notes` en `saco_measurements`/`chaleco_measurements`, aunque el SQLite local (`v9` en `migrations.ts`) sí la tenía desde el principio. El código (`SupabaseSyncTransport`/`SupabasePullSync`) ahora sí envía/lee `notes` para estas dos tablas — si tu Supabase se creó copiando el SQL original de esta sección, **corre el bloque de abajo (ya corregido con `notes`) antes de instalar el próximo build**, o al menos:
```sql
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS notes TEXT;
```

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
  notes TEXT,
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
  notes TEXT,
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

### v17_schedules (2026-08-02) — SUPERADA, no ejecutar: ver v19 para el script real a correr

**⚠️ 2026-08-04: se confirmó que este SQL nunca se ejecutó en Supabase** (la tabla `schedules` no existe todavía en el proyecto real). Como el rediseño de la Agenda (v19, más abajo) ya cambió esta misma tabla antes de que existiera en Supabase, no tiene sentido correr esta versión vieja para luego migrarla — el script consolidado de la sección `v19_schedule_redesign` crea `schedules` directo con la forma final. Esta sección queda solo como referencia histórica de cómo se planeó originalmente. **También se corrigió aquí un bug real que nunca se detectó por no haberse corrido:** `client_id` estaba declarado `UUID`, pero `clients.id` es `TEXT` en toda la app — esa foreign key habría fallado al crearse por tipos incompatibles.

**Contexto:** N-008 (Agenda) — nueva entidad `schedule` conectada al sync desde el día uno (decisión explícita del usuario, para no repetir el gap de `pricing_service`/`client_talla` que costó arreglar en producción). Se necesita crear la tabla `schedules` en Supabase y permitir `'schedule'` en el CHECK de `sync_delete_log.entity_type` (el delete-sync también se conectó desde el inicio).

```sql
-- 1. Tabla schedules — mismas columnas snake_case que el resto (created_at/updated_at,
-- no createdAt/updatedAt como el error historico de pricing_services v8).
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients (id),
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

**Flujo para dar de alta un operario nuevo** (manual, por el dueño) — **SUPERADO, ver `v23_operario_pin_integrity` más abajo**: crear el usuario en Supabase Dashboard → Authentication → Users (correo + contraseña), copiar su UUID, y correr:

```sql
INSERT INTO profiles (id, display_name, role, is_shared_device, pin_hash)
VALUES ('<uuid-del-usuario>', 'María Gómez', 'operario', false, crypt('1234', gen_salt('bf')));
```

Para la cuenta de la tablet compartida: mismo flujo pero `is_shared_device = true`, sin necesidad de `pin_hash` propio (nadie se identifica *como* la tablet, solo a través de ella).

**Importante:** correr esto en Supabase ANTES de instalar un build que incluya este código — sin la tabla `profiles`, `getProfile()` falla silenciosamente (retorna `null`) y ningún usuario tiene rol ni identidad más allá del login binario previo.

**⚠️ Seguridad (detectado 2026-08-04, QA previa a la build de Bloque 1): NO habilitar Supabase Realtime para `profiles`.** El `REVOKE SELECT (pin_hash)` de arriba solo protege consultas `SELECT`/REST — Supabase Realtime (`postgres_changes`) lee directo del WAL de Postgres y entrega la fila completa por websocket a cualquier cliente suscrito a esa tabla, sin respetar revokes a nivel de columna. Si en el Dashboard de Supabase (Database → Replication) `profiles` llegara a estar marcada para Realtime, cualquier INSERT/UPDATE sobre esa tabla filtraría el `pin_hash` (ya hasheado con bcrypt, pero igual innecesario exponerlo) a todos los clientes conectados. El código de la app (`SupabaseRealtimeInvalidationSubscriber.ts`) ya NO se suscribe a `profiles` por este motivo — pero conviene confirmar también en el Dashboard que la tabla no esté habilitada para Realtime, como segunda capa.

---

### v19_schedule_redesign — script consolidado, Supabase pendiente (Fases 1-3 del Bloque 1, N-077)

**Contexto:** Rediseño de la Agenda — `date`/`time` pasan a opcionales, `status` cambia de valores placeholder (`pending/confirmed/completed/cancelled`) a los 5 estados de negocio reales (`pendiente/agendado/en_proceso/listo_para_entregar/entregado`), y se agregan `price`/`operario_id`/`ready_at`/`delivered_at` + la tabla `schedule_events` (historial append-only). El lado **SQLite ya está aplicado** (migración `v19_schedule_redesign` en `migrations.ts`, patrón "recrear tabla" — primera vez en el proyecto) y el **motor de sync ya está completamente cableado** en la app (Fase 3: `schedule` con las columnas nuevas + `schedule_event` como entidad nueva create-only, en los 6 archivos de siempre + el subscriber de realtime). El lado **Supabase todavía NO se ha migrado** — el SQL de abajo sigue sin ejecutarse.

**Riesgo real ahora que el sync está cableado:** con el código de sync ya activo, si se instala un build con este código apuntando a un Supabase sin esta migración, cualquier intento de sincronizar un turno fallará (`schedules` no tiene las columnas nuevas, o el `CHECK` de `status` en Supabase sigue esperando los valores viejos) y `schedule_events` fallará directo con `relation "schedule_events" does not exist`. Se confirmó con el usuario que **no hay datos reales de Agenda en producción todavía** (ningún build con esta feature salió a un dispositivo real), así que no hay riesgo de pérdida de datos.

**2026-08-04: se descubrió que `schedules` tampoco existía en Supabase** (`v17_schedules` nunca se corrió) — por eso este script ya no es un `ALTER` incremental sobre una tabla existente, sino un `CREATE TABLE` directo con la forma final (salta v17→v19 de una vez). Incluye además `profiles`/`v18_profiles_roles` con `IF NOT EXISTS`/`CREATE OR REPLACE` por si tampoco se hubiera corrido, para que este único script sea seguro de ejecutar de punta a punta sin depender del orden de migraciones anteriores:

```sql
-- 1. profiles (Bloque 0, N-076) -- no-op si ya existe.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
DROP POLICY IF EXISTS "authenticated read profiles" ON profiles;
CREATE POLICY "authenticated read profiles" ON profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT (pin_hash) ON profiles FROM authenticated;

CREATE OR REPLACE FUNCTION resolve_operario_by_pin(candidate_pin TEXT)
RETURNS TABLE (id UUID, display_name TEXT, role TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, display_name, role FROM profiles
  WHERE role = 'operario' AND pin_hash IS NOT NULL
    AND pin_hash = crypt(candidate_pin, pin_hash);
$$;

-- 2. schedules -- forma final directa (client_id es TEXT, igual que clients.id;
-- v17 documentaba UUID por error, nunca detectado porque nunca se corrió).
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients (id),
  date TEXT,
  time TEXT,
  price NUMERIC,
  operario_id UUID REFERENCES profiles (id),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'agendado', 'en_proceso', 'listo_para_entregar', 'entregado')),
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'error'))
);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date);
CREATE INDEX IF NOT EXISTS idx_schedules_client_id ON schedules (client_id);
CREATE INDEX IF NOT EXISTS idx_schedules_operario_id ON schedules (operario_id);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated all schedules" ON schedules;
CREATE POLICY "authenticated all schedules" ON schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. schedule_events -- historial append-only, entidad nueva.
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
DROP POLICY IF EXISTS "authenticated all schedule_events" ON schedule_events;
CREATE POLICY "authenticated all schedule_events" ON schedule_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- schedule_events NO se agrega a sync_delete_log: nunca se borra desde la app.

-- 4. sync_delete_log -- permitir 'schedule' como entity_type borrable
-- (delete-sync conectado desde el inicio, igual que v17 lo planeaba).
ALTER TABLE sync_delete_log DROP CONSTRAINT IF EXISTS sync_delete_log_entity_type_check;
ALTER TABLE sync_delete_log
  ADD CONSTRAINT sync_delete_log_entity_type_check
  CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement', 'client_talla', 'pricing_service', 'schedule'));
```

**Fase 4 (2026-08-04): sin cambios nuevos en Supabase.** El espejo local `profiles_cache` (picker de operario + selección offline de identidad) lee de la tabla `profiles` que ya existe desde el Bloque 0 (`v18_profiles_roles`) — la policy `authenticated read profiles` ya permite el pull, `updated_at` ya existe para el cursor, y `pin_hash` sigue sin exponerse (nunca se selecciona). Solo hubo migración local (`v20_profiles_cache` en `migrations.ts`) y código de la app.

**Fase 8 (2026-08-04): sin cambios nuevos en Supabase.** El datetimepicker nativo y la vista día-por-día son 100% cliente (componente de UI + queries locales ya existentes, `getByDate`/`getWithoutDate`) — no tocan el esquema. Con esto se cierran las 9 fases del Bloque 1 en código.

---

### v21_schedule_status_lock_and_priority (2026-08-04)

**Contexto:** feedback de uso real del build de prueba — corregir manualmente el status a "pendiente"/"agendado"/"en_proceso" (botón "Corrección manual") no se quedaba: el siguiente `update()` de cualquier campo (aunque no tuviera nada que ver, ej. las notas) volvía a derivar el status automáticamente, y si el operario seguía asignado, lo devolvía a "en_proceso" sin que nadie lo pidiera. Se agrega `status_locked` para marcar que el status actual viene de una corrección manual explícita, y el código deja de re-derivarlo hasta la siguiente acción explícita. De paso se agrega `is_priority`, pedido para marcar un turno ya agendado (con fecha) como más urgente que el resto del día — no aplica a los turnos "Pendientes" (sin fecha), que es justo lo contrario de lo que se documentó en el primer intento de esta migración.

```sql
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT false;
```

**Importante:** correr esto en Supabase antes de instalar cualquier build con este código — sin estas columnas, `syncSchedule()`/`pullSchedulesIncremental()` fallan al referenciar `status_locked`/`is_priority` (columna inexistente).

---

### v22_talla_template_delete_sync (2026-08-04)

**Contexto:** QA de flujos completos de la app (N-077 en adelante) — borrar una plantilla de talla (`TallaTemplateRepositoryImpl.delete()`) nunca escribía en `sync_delete_log`, así que el borrado nunca se propagaba a Supabase ni a otros dispositivos: la plantilla "borrada" seguía viva en la nube y reaparecía en un reinstall. Se corrigió el código para que `delete()` sí registre el borrado (mismo patrón que `pricing_service`/`client_talla`), pero **el CHECK de `sync_delete_log.entity_type` en Supabase no permite `'talla_template'` todavía**.

```sql
ALTER TABLE sync_delete_log DROP CONSTRAINT IF EXISTS sync_delete_log_entity_type_check;
ALTER TABLE sync_delete_log
  ADD CONSTRAINT sync_delete_log_entity_type_check
  CHECK (entity_type IN ('client', 'camisa_measurement', 'pantalon_measurement', 'client_talla', 'pricing_service', 'schedule', 'talla_template'));
```

**Importante:** correr esto en Supabase antes de instalar el próximo build — sin esto, el primer intento de borrar una plantilla de talla falla con `23514 check_violation` y el registro queda atascado en `sync_delete_log` con `sync_status='error'` para siempre.

**Nota aparte, opcional (no bloquea nada):** al revisar el borrado de clientes se confirmó que `saco_measurements`/`chaleco_measurements` no tienen `ON DELETE CASCADE` en su FK a `clients` (a diferencia de `client_tallas`, que sí la tiene). El código ya borra estas filas explícitamente antes de borrar el cliente (tanto local como en la nube), así que esto no es un bug activo — pero si quieres una segunda capa de seguridad a nivel de base de datos (por si algún día se borra un cliente directo por SQL, sin pasar por la app), puedes correr:
```sql
ALTER TABLE saco_measurements DROP CONSTRAINT IF EXISTS saco_measurements_client_id_fkey;
ALTER TABLE saco_measurements
  ADD CONSTRAINT saco_measurements_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE;

ALTER TABLE chaleco_measurements DROP CONSTRAINT IF EXISTS chaleco_measurements_client_id_fkey;
ALTER TABLE chaleco_measurements
  ADD CONSTRAINT chaleco_measurements_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE;
```

---

### v23_operario_pin_integrity (2026-08-05)

**Contexto:** al probar el flujo de PIN se detectó que nada impide que dos operarios terminen con el mismo PIN (el dueño los da de alta a mano con `INSERT` + `crypt()`, sin ninguna validación). Si eso pasara, `resolve_operario_by_pin` devolvía TODAS las filas que coincidieran y el código de la app (`useIdentityGate.submitPin`) tomaba silenciosamente la primera — atribuyendo la acción a la persona equivocada sin ningún aviso. Se cierra el problema en dos frentes: (1) ya no se puede crear ni cambiar un PIN que otro operario ya tenga — la base de datos lo rechaza; (2) por si alguna vez quedara un caso ambiguo (ej. datos de antes de esta migración), `resolve_operario_by_pin` deja de "adivinar": si encuentra más de una coincidencia, no resuelve a nadie (mismo comportamiento visible que un PIN incorrecto, en vez de una atribución equivocada).

```sql
-- Reemplaza el INSERT manual de la sección v18 para dar de alta un operario.
-- Rechaza la creación si el PIN ya lo tiene otro operario.
CREATE OR REPLACE FUNCTION create_operario_with_pin(
  operario_id UUID,
  operario_display_name TEXT,
  candidate_pin TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE role = 'operario' AND pin_hash IS NOT NULL
      AND pin_hash = crypt(candidate_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'Ya existe un operario con ese PIN. Elige un PIN distinto.';
  END IF;

  INSERT INTO profiles (id, display_name, role, is_shared_device, pin_hash)
  VALUES (operario_id, operario_display_name, 'operario', false, crypt(candidate_pin, gen_salt('bf')));
END;
$$;

-- Para cambiar el PIN de un operario ya existente más adelante (mismo chequeo,
-- excluyendo al propio operario de la comparación).
CREATE OR REPLACE FUNCTION set_operario_pin(
  operario_id UUID,
  candidate_pin TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id <> operario_id AND role = 'operario' AND pin_hash IS NOT NULL
      AND pin_hash = crypt(candidate_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'Ya existe un operario con ese PIN. Elige un PIN distinto.';
  END IF;

  UPDATE profiles
  SET pin_hash = crypt(candidate_pin, gen_salt('bf')), updated_at = now()
  WHERE id = operario_id;
END;
$$;

-- Reemplaza la función de v18: si hay más de una coincidencia (no debería
-- pasar nunca gracias a las dos funciones de arriba, pero es la red de
-- seguridad para datos previos a esta migración), no resuelve a nadie.
CREATE OR REPLACE FUNCTION resolve_operario_by_pin(candidate_pin TEXT)
RETURNS TABLE (id UUID, display_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_count INT;
BEGIN
  SELECT COUNT(*) INTO match_count
  FROM profiles p
  WHERE p.role = 'operario' AND p.pin_hash IS NOT NULL
    AND p.pin_hash = crypt(candidate_pin, p.pin_hash);

  IF match_count <> 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.role FROM profiles p
  WHERE p.role = 'operario' AND p.pin_hash IS NOT NULL
    AND p.pin_hash = crypt(candidate_pin, p.pin_hash);
END;
$$;
```

**Flujo actualizado para dar de alta un operario nuevo:** crear el usuario en Supabase Dashboard → Authentication → Users (correo + contraseña), copiar su UUID, y correr:

```sql
SELECT create_operario_with_pin('<uuid-del-usuario>', 'María Gómez', '1234');
```

Si el PIN ya lo tiene otro operario, esto falla con un error legible (`Ya existe un operario con ese PIN...`) y no crea nada — a diferencia del `INSERT` manual de antes, que lo hubiera dejado pasar sin avisar. Para cambiar el PIN de alguien que ya existe:

```sql
SELECT set_operario_pin('<uuid-del-operario>', '5678');
```

Para la tablet compartida (`is_shared_device = true`) se sigue usando el `INSERT` directo de la sección v18 — no tiene PIN propio, así que no aplica ninguna de estas dos funciones.

**Importante:** correr esto en Supabase antes de dar de alta el próximo operario o cambiar un PIN existente. No requiere reinstalar ningún build — la app nunca llamó `resolve_operario_by_pin` de forma distinta, el cambio es transparente para el código ya instalado.

---

### v24_schedule_category (2026-08-05)

**Contexto:** pedido del dueño — separar la Agenda de arreglos de una agenda de confecciones, con el mismo patrón de segmentado que ya usa Precios (un turno categorizado, no una entidad/tabla aparte). Mismo cambio que `v22_schedule_category` en SQLite local, aplicado ahora a Supabase.

```sql
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'arreglo';
```

**Importante:** correr esto en Supabase ANTES de instalar el próximo build — sin esta columna, `syncSchedule()`/`pullSchedulesIncremental()` fallan al referenciar `category` (columna inexistente).

---

### v25_clients_measurements_rls (2026-08-05) — ⚠️ SEGURIDAD, URGENTE

**Contexto:** auditoría de seguridad (2026-08-05) — a diferencia de TODAS las demás tablas (`sync_delete_log`, `client_tallas`, `talla_templates`, `pricing_services`, `schedules`, `profiles`, `schedule_events`), `clients` y las 4 tablas de medidas nunca recibieron `ENABLE ROW LEVEL SECURITY`. La clave "anon"/publishable de Supabase va embebida en el bundle de la app (se puede extraer del APK) — sin RLS, cualquiera con esa clave puede leer/escribir estas tablas directo por REST (`GET /rest/v1/clients?select=*`) sin pasar por la app ni por ningún login, exponiendo nombre, teléfono y **cédula** de todos los clientes. Mismo riesgo por Realtime si alguna de estas tablas llegara a habilitarse ahí.

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE camisa_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all camisa_measurements" ON camisa_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE pantalon_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all pantalon_measurements" ON pantalon_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE saco_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all saco_measurements" ON saco_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE chaleco_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all chaleco_measurements" ON chaleco_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**Importante:** corre esto en Supabase **cuanto antes**, sin esperar al próximo build — es un hueco de exposición de datos activo en producción, no depende de ninguna versión de la app. No requiere reinstalar nada.

---

### v26_pantalon_entrepierna (2026-08-05)

**Contexto:** pedido del dueño tras probar el build — faltaba la medida "entrepierna" en pantalón, tanto en medidas de cliente como en plantillas de talla.

```sql
ALTER TABLE pantalon_measurements ADD COLUMN IF NOT EXISTS entrepierna REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS entrepierna REAL;
```

---

### v27_camisa_saco_chaleco_pares (2026-08-05)

**Contexto:** pedido del dueño — pecho, cintura y base pasan a tener dos sub-medidas (Ajustado/Ancho) en camisa, saco, chaleco y sus plantillas de talla; cuello pasa a tener Normal/Cruce (camisa, saco y plantillas — chaleco nunca tuvo cuello). El valor viejo se migra al primer subcampo (Ajustado/Normal) para no perder medidas ya tomadas; las columnas viejas (`pecho`, `cintura`, `base`, `cuello`) quedan sin usar en la app pero no se borran. En `talla_templates`, `cintura`/`base` siguen sirviendo a las plantillas de pantalón sin cambios — solo se agregan las columnas nuevas al lado.

```sql
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS pecho_ajustado REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS pecho_ancho REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS cintura_ajustado REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS cintura_ancho REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS base_ajustado REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS base_ancho REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS cuello_normal REAL;
ALTER TABLE camisa_measurements ADD COLUMN IF NOT EXISTS cuello_cruce REAL;
UPDATE camisa_measurements SET pecho_ajustado = pecho, cintura_ajustado = cintura, base_ajustado = base, cuello_normal = cuello;

ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS pecho_ajustado REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS pecho_ancho REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS cintura_ajustado REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS cintura_ancho REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS base_ajustado REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS base_ancho REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS cuello_normal REAL;
ALTER TABLE saco_measurements ADD COLUMN IF NOT EXISTS cuello_cruce REAL;
UPDATE saco_measurements SET pecho_ajustado = pecho, cintura_ajustado = cintura, base_ajustado = base, cuello_normal = cuello;

ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS pecho_ajustado REAL;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS pecho_ancho REAL;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS cintura_ajustado REAL;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS cintura_ancho REAL;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS base_ajustado REAL;
ALTER TABLE chaleco_measurements ADD COLUMN IF NOT EXISTS base_ancho REAL;
UPDATE chaleco_measurements SET pecho_ajustado = pecho, cintura_ajustado = cintura, base_ajustado = base;

ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS pecho_ajustado REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS pecho_ancho REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS cintura_ajustado REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS cintura_ancho REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS base_ajustado REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS base_ancho REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS cuello_normal REAL;
ALTER TABLE talla_templates ADD COLUMN IF NOT EXISTS cuello_cruce REAL;
UPDATE talla_templates SET pecho_ajustado = pecho, cintura_ajustado = cintura, base_ajustado = base, cuello_normal = cuello
  WHERE type IN ('camisa', 'saco', 'chaleco');
```

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
