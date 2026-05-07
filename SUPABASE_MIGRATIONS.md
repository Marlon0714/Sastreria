# SUPABASE_MIGRATIONS.md

Este archivo documenta cada migración SQL que debe aplicarse manualmente en Supabase cuando se modifica el esquema local (SQLite).

---

## Checklist de migración

- [ ] ¿Agregaste/renombraste/eliminaste columnas en alguna tabla local?
- [ ] ¿Actualizaste este archivo con el SQL equivalente para Supabase?
- [ ] ¿Aplicaste el SQL en el Dashboard de Supabase antes de probar la app en cloud?
- [ ] ¿Verificaste que la tabla en Supabase tiene las columnas nuevas?

---

## Migraciones recientes

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

## Notas

- Si agregas una columna local, **agrega aquí el SQL** y ejecútalo en Supabase.
- Si tienes dudas, revisa `src/data/local/migrations.ts` y traduce cada cambio relevante.
- Si una columna ya existe, puedes omitir el error correspondiente.
