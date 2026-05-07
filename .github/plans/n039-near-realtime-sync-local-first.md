## Plan de Implementación: N-039 Near-Real-Time Sync Local-First (Outbox + Inbox)

### Contexto

El proyecto ya tiene una base de outbox parcial: entidades locales con `sync_status` (`pending|synced|error`), ejecución serializada de corridas con deduplicación en `SyncOrchestrator`, y push remoto idempotente por `upsert` en `SupabaseSyncTransport`.
Existe `sync_delete_log` en SQLite y el delete de cliente ya escribe allí, pero esa cola de deletes todavía no se procesa en el pipeline de sync.
El pull actual (`SupabasePullSync.pullAll`) es full pull, sin checkpoint incremental, sin inbox formal, sin invalidación realtime y sin trigger explícito al volver a foreground.

### Alcance

1. Completar patrón Local-First con Outbox + Inbox para clientes, medidas y deletes.
2. Implementar pull incremental con checkpoint monotónico (incluyendo deletes).
3. Incorporar invalidación near-real-time con Supabase Realtime como señal (no fuente de verdad).
4. Disparar sync en foreground y mantener deduplicación de corridas ante ráfagas.
5. Cerrar procesamiento de deletes desde `sync_delete_log` con idempotencia end-to-end.
6. Mantener compatibilidad con arquitectura por capas, TypeScript strict y contratos actuales de hooks/screens.
7. Entregar suite de tests completa (unitarios + integración) con validación del SLO de latencia.

### Dependencias Previas Detectadas

1. Deuda activa de N-036: `sync_delete_log` pendiente de conexión al `SyncQueueProcessor`.
2. Wiring vigente: `scheduleSyncRun` en `clientsDependencies` y bootstrap inicial en `App.tsx`.
3. Dedupe existente y reutilizable: `SyncOrchestrator.requestRun()`.
4. Mecanismo de pull existente para reutilizar estructura SQL de upsert local: `SupabasePullSync`.

### Tareas Numeradas

| #   | Tipo            | Descripción                                                                                                                                                            | Archivo(s)                                                                                                                                                                                                                                          |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Dominio Sync    | Definir contratos para sync local-first completo: `SyncOperation` (`upsert                                                                                             | delete`), `SyncTriggerSource`, `SyncCheckpoint`, y metadatos de corrida para trazabilidad no sensible.                                                                                                                                              | `src/data/sync/types.ts` |
| 2   | Datos Sync      | Extender puerto de transporte para soportar delete remoto idempotente y separar contratos de push vs pull incremental.                                                 | `src/data/sync/SyncTransport.ts`, `src/data/sync/SupabaseSyncTransport.ts`                                                                                                                                                                          |
| 3   | Datos Local     | Agregar migración aditiva para tabla(s) de checkpoint local (ej. `sync_checkpoints`) e índices por entidad/cursor para pull incremental.                               | `src/data/local/migrations.ts`                                                                                                                                                                                                                      |
| 4   | Datos Sync      | Implementar repositorio de checkpoint con operaciones atómicas `get`, `advanceIfNewer`, `reset` (solo para fallback controlado), garantizando monotonicidad.           | `src/data/sync/SyncCheckpointRepository.ts`                                                                                                                                                                                                         |
| 5   | Datos Sync      | Ampliar `SyncQueueRepository` para leer pendientes de `sync_delete_log` y mapearlos como `operationType='delete'` con orden global estable por timestamp + id.         | `src/data/sync/SyncQueueRepository.ts`                                                                                                                                                                                                              |
| 6   | Lógica Sync     | Ajustar `SyncQueueProcessor` para enrutar `upsert/delete`, conservar retries exponenciales, y marcar estado (`synced/error`) en tabla correcta (entidad o delete-log). | `src/data/sync/SyncQueueProcessor.ts`                                                                                                                                                                                                               |
| 7   | Datos Sync      | Implementar push de deletes en `SupabaseSyncTransport` usando operación idempotente por `delete_log.id` y error sanitizado sin datos sensibles.                        | `src/data/sync/SupabaseSyncTransport.ts`                                                                                                                                                                                                            |
| 8   | Lógica Sync     | Evolucionar pull de full a incremental con checkpoint por entidad (`clients`, `camisa_measurements`, `pantalon_measurements`, `sync_delete_log`) y paginación/batch.   | `src/data/sync/SupabasePullSync.ts` (o nuevo `src/data/sync/SupabaseIncrementalPullSync.ts`)                                                                                                                                                        |
| 9   | Lógica Sync     | Implementar aplicación de inbox en transacción local: upsert LWW (`updated_at`) + apply deletes idempotente + avance de checkpoint solo al commit exitoso.             | `src/data/sync/SupabasePullSync.ts`, `src/data/sync/SyncCheckpointRepository.ts`                                                                                                                                                                    |
| 10  | Integración     | Crear suscriptor realtime de invalidación (`postgres_changes`) con debounce/coalescing; el evento solo dispara pull incremental por orquestador.                       | `src/data/sync/SupabaseRealtimeInvalidationSubscriber.ts`                                                                                                                                                                                           |
| 11  | Integración App | Añadir controlador de lifecycle para trigger en foreground (`AppState: active`) que solicite corrida sync + pull incremental.                                          | `src/data/sync/SyncLifecycleController.ts`, `App.tsx`                                                                                                                                                                                               |
| 12  | Lógica Sync     | Fortalecer deduplicación de corridas y coalescing de triggers múltiples (write/realtime/foreground/bootstrap) sin romper `requestRun`.                                 | `src/data/sync/SyncOrchestrator.ts`                                                                                                                                                                                                                 |
| 13  | Wiring          | Integrar nuevas piezas en composición de dependencias conservando fallback sin Supabase y sin romper contratos de hooks/screens.                                       | `src/data/local/clientsDependencies.ts`, `src/data/sync/index.ts`, `App.tsx`                                                                                                                                                                        |
| 14  | Testing         | Crear util de métricas de latencia para tests/harness y registrar tiempos de propagación no sensibles por corrida.                                                     | `src/data/sync/SyncLatencyHarness.ts`, `src/data/sync/SyncLatencyHarness.test.ts`                                                                                                                                                                   |
| 15  | Testing         | Completar unit tests de repositorio cola, processor delete path, checkpoint monotónico, inbox idempotente y subscriber realtime.                                       | `src/data/sync/SyncQueueRepository.test.ts`, `src/data/sync/SyncQueueProcessor.test.ts`, `src/data/sync/SyncCheckpointRepository.test.ts`, `src/data/sync/SupabasePullSync.test.ts`, `src/data/sync/SupabaseRealtimeInvalidationSubscriber.test.ts` |
| 16  | Testing         | Implementar pruebas de integración multi-dispositivo simulado A→B para upsert/delete, reconexión, dedupe de corridas y cumplimiento de SLO p50/p95.                    | `src/data/sync/SyncOrchestrator.test.ts`, `src/data/sync/N039NearRealtime.integration.test.ts`, `App.test.tsx`                                                                                                                                      |

### Orden de Ejecución

1. T1-T2 para cerrar contratos y evitar refactors repetidos.
2. T3-T4 para habilitar checkpoint persistente.
3. T5-T7 para completar outbox (incluye deletes).
4. T8-T9 para inbox incremental transaccional con checkpoint.
5. T10-T12 para invalidación realtime, foreground trigger y dedupe robusta.
6. T13 para wiring final sin romper contratos públicos.
7. T14-T16 para verificación funcional y SLO de latencia.

### Criterios de Aceptación

1. Los upserts locales salen de `pending/error` a `synced` tras corrida exitosa sin duplicar registros remotos.
2. Un delete local crea registro en `sync_delete_log`, se sincroniza remoto y queda `synced` local.
3. El pull incremental trae únicamente cambios con cursor mayor al checkpoint aplicado.
4. Reprocesar el mismo lote remoto no cambia estado final (idempotencia de inbox).
5. Eventos realtime en ráfaga no disparan corridas redundantes no acotadas (coalescing efectivo).
6. Al volver a foreground se dispara al menos una corrida de sync incremental.
7. Con reconexión de red, el estado converge sin full refresh manual.
8. No se exponen PII ni secretos en logs/errores de sync.
9. No se rompen contratos existentes de hooks/screens (compilación TS strict y tests previos en verde).
10. SLO cumplido en harness de integración: p50 <= 5s y p95 <= 20s.

### Estrategia de Pruebas

1. Unitarias de contratos y mapeos de cola (`upsert/delete`) con queries parametrizadas.
2. Unitarias de retry/backoff y marcado de estado por tipo de operación.
3. Unitarias de checkpoint monotónico (`advanceIfNewer` no permite retroceso).
4. Unitarias de inbox incremental con lotes vacíos, duplicados, fuera de orden y deletes.
5. Unitarias de subscriber realtime para debounce, reconexión y unsubscribe seguro.
6. Integración de dedupe de corridas con triggers concurrentes (write + realtime + foreground).
7. Integración A→B simulada para propagación de upsert y delete multi-dispositivo.
8. Regresión sobre tests existentes de sync y repositorios locales.

### Medición de Latencia p50/p95 (Explícita)

Definición de latencia por evento:

- `t0`: instante en que el dispositivo A confirma commit local y agenda sync (`onWriteCommitted`).
- `t1`: instante en que el dispositivo B aplica el cambio en SQLite tras pull incremental.
- `latencyMs = t1 - t0`.

Método en tests/harness:

1. Instrumentar test harness con reloj controlado (`Date.now` mock o timestamps capturados por evento).
2. Generar N eventos (recomendado N=50-200) mezclando upserts y deletes.
3. Para cada evento, registrar `latencyMs` al confirmar aplicación en B.
4. Ordenar latencias ascendente: `L = sort(latencyMs[])`.
5. Calcular percentiles:
   - `p50 = L[ceil(0.50 * n) - 1]`
   - `p95 = L[ceil(0.95 * n) - 1]`
6. Assert en test de integración: `expect(p50).toBeLessThanOrEqual(5000)` y `expect(p95).toBeLessThanOrEqual(20000)`.
7. Reportar además `min`, `max`, `mean` para diagnóstico (sin incluir datos sensibles).

### Riesgos y Mitigaciones

1. Riesgo: desalineación de esquema remoto para deletes/checkpoints.
   Mitigación: validar prerequisitos de Supabase y contratos antes de activar la feature.
2. Riesgo: ráfagas realtime causan exceso de corridas y consumo.
   Mitigación: debounce + coalescing + serialización en orquestador.
3. Riesgo: carreras entre push outbox y pull inbox.
   Mitigación: transacciones SQLite y reglas LWW por `updated_at` + idempotencia por IDs.
4. Riesgo: reconexiones intermitentes degradan p95.
   Mitigación: foreground trigger, retries con backoff y lotes incrementales pequeños.
5. Riesgo: drift por deletes no aplicados en B.
   Mitigación: canal explícito `sync_delete_log` en pull incremental más aplicación idempotente.

### Rollback Plan

1. Activar flags internos para `incrementalPull`, `realtimeInvalidation`, `foregroundTrigger`.
2. Ante regresión, desactivar flags y volver temporalmente al flujo actual (outbox upsert + full pull bootstrap).
3. Mantener migraciones aditivas (sin borrar tablas legacy) para rollback seguro de comportamiento.
4. Mantener compatibilidad con `NoopSyncTransport` cuando Supabase no esté configurado.
5. Condición de rollback: si SLO p95 > 20s sostenido o hay pérdida de consistencia de datos en integración.

### Notas de Implementación para Builder

1. Preservar separación por capas: UI orquesta, dominio define contratos, data implementa SQLite/Supabase.
2. Evitar cambios de API pública en hooks/screens; encapsular nuevos componentes en `src/data/sync`.
3. No incluir secretos hardcodeados; usar configuración existente de Supabase.
4. Mantener logs estructurados y sanitizados, sin PII.
