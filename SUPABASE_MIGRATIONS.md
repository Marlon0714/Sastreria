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

## Notas

- Si agregas una columna local, **agrega aquí el SQL** y ejecútalo en Supabase.
- Si tienes dudas, revisa `src/data/local/migrations.ts` y traduce cada cambio relevante.
- Si una columna ya existe, puedes omitir el error correspondiente.
- **⚠️ Trampa de Postgres con `CREATE TABLE ... createdAt TEXT` (sin comillas):** Postgres pliega los identificadores no citados a minúsculas. El SQL de `v8_pricing_services` (arriba) declara `createdAt`/`updatedAt`, pero la tabla real en Supabase terminó con columnas `createdat`/`updatedat` (todo minúscula) — descubierto el 2026-08-01 al conectar el sync (error `42703 undefined_column`). SQLite local NO tiene este problema (preserva el case declarado y compara sin distinguir mayúsculas). Antes de asumir el nombre de una columna en Supabase, verifica con:
  ```sql
  SELECT column_name FROM information_schema.columns WHERE table_name = '<tabla>';
  ```
  El código de sync (`SupabaseSyncTransport.ts`, `SupabasePullSync.ts`) para `pricing_services` ya usa `createdat`/`updatedat` reales al hablar con Supabase (con alias en el `.select()` de vuelta a camelCase para no tocar el resto del código).
