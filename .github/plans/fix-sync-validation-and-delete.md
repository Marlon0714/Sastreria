# Plan: fix/sync-validation-and-delete

## Objetivo
Cerrar brechas de sincronización: el banner de pendientes nunca desaparece, los deletes de clientes no propagan en cascada las medidas, y las columnas `changed_by`/`changed_at` no se enviaban a Supabase por desfase de esquema.

## Tareas

### T1 — FIX: Validar que el delete de cliente elimina medidas en cascade local
- **Archivo:** `src/data/local/ClientRepositoryImpl.ts`
- **Problema:** Al eliminar un cliente, ¿se eliminan también sus registros de `camisa_measurements` y `pantalon_measurements` localmente?
- **Fix:** Asegurar que el delete transaccional elimine primero medidas antes de borrar el cliente.

### T2 — FIX: Propagación de deletes al cloud (syncDeleteLogEntry en SupabaseSyncTransport)
- **Archivo:** `src/data/sync/SupabaseSyncTransport.ts`
- **Problema:** El delete_log se empuja a Supabase pero la eliminación real del registro en la tabla `clients` no se ejecuta en cloud desde la app.
- **Fix:** Tras upsert exitoso en `sync_delete_log`, ejecutar DELETE real en Supabase.

### T3 — FIX: Validar que el pull incremental propaga deletes del cloud al local
- **Archivo:** `src/data/sync/SupabasePullSync.ts`
- **Problema:** `pullDeleteLogIncremental` debe eliminar localmente los registros eliminados en otro dispositivo.
- **Verificar** que ya funciona o corregir si falta el delete local.

### T4 — TEST: Tests de integración para delete de cliente (local + cloud)
- **Archivos nuevos:** Tests en `SyncQueueRepository.test.ts`, `SupabaseSyncTransport.test.ts`
- **Cubrir:** delete_log insertado, marcado como synced, eliminación real ejecutada.

### T5 — TEST: Tests para propagación de deletes en pullSync
- **Archivo:** `src/data/sync/SupabasePullSync.test.ts`
- **Cubrir:** delete_log desde cloud elimina registro local correctamente.
