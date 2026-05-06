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

## Notas

- Si agregas una columna local, **agrega aquí el SQL** y ejecútalo en Supabase.
- Si tienes dudas, revisa `src/data/local/migrations.ts` y traduce cada cambio relevante.
- Si una columna ya existe, puedes omitir el error correspondiente.
