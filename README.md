# Sastrería App

## Migraciones y sincronización de esquema (Supabase)

**IMPORTANTE:**

Cada vez que cambies el modelo de datos local (SQLite), debes:

1. Actualizar `SUPABASE_MIGRATIONS.md` con el SQL correspondiente (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` o `CREATE TABLE IF NOT EXISTS ...`).
2. Ejecutar el script completo en el SQL Editor de Supabase.
3. Verificar que no haya errores y que el esquema coincida.
4. Marcar el checklist en tu Pull Request:
   - [ ] ¿Actualizaste SUPABASE_MIGRATIONS.md?
   - [ ] ¿Ejecutaste el script en Supabase?
   - [ ] ¿Verificaste el esquema?

**Tip:** El script es idempotente, puedes ejecutarlo siempre que quieras, nunca falla si la columna ya existe.

**¿Dudas?** Consulta el archivo SUPABASE_MIGRATIONS.md y/o pregunta al equipo.

---

# Sastrería App — Instrucciones Globales

(Coloca aquí el resto de tu documentación principal, instrucciones de build, testing, etc. Si ya tienes un README previo, fusiona este bloque al inicio.)
