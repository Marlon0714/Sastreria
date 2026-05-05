## Plan de Implementacion: N-039 Local-First Near-Real-Time Sync Multi-Dispositivo

### Contexto

La base actual ya tiene Outbox parcial: escrituras locales en SQLite con sync_status pending/error/synced, ejecucion de SyncQueueProcessor y deduplicacion en memoria via SyncOrchestrator. Tambien existe tabla local sync_delete_log y se registra delete de cliente, pero hoy no se procesa ese delete en el pipeline de sync. El pull remoto actual es full pull (SupabasePullSync.pullAll), sin checkpoint incremental, sin inbox formal, sin suscriptor realtime y sin trigger explicito por lifecycle foreground.

### Alcance funcional y tecnico

1. Completar patron Local-First con Outbox + Inbox para clientes, medidas y deletes.
2. Implementar pull incremental por checkpoint monotono (por tabla y por delete log).
3. Integrar invalidacion near-real-time con Supabase Realtime para disparar pulls incrementales.
4. Disparar sync al volver a foreground y al reconectar sesiones/suscripciones.
5. Cerrar procesamiento de deletes desde sync_delete_log de forma idempotente.
6. Mantener deduplicacion de corridas de sync y evitar ejecuciones redundantes por tormenta de eventos.
7. Agregar suite de pruebas unitarias e integracion para flujo completo.
8. Cumplir objetivo de latencia end-to-end entre dispositivos: p50 <= 5s y p95 <= 20s.

### Restricciones tecnicas detectadas y decisiones propuestas

1. Supabase Realtime no garantiza entrega exactamente-una-vez ni orden total entre reconexiones.
   Decision: usar Realtime solo como invalidation signal; la fuente de verdad de aplicacion sera siempre pull incremental por checkpoint.
2. En React Native, sockets realtime pueden pausar o desconectarse en background.
   Decision: al entrar a foreground, forzar trigger de sync incremental + reproceso de outbox.
3. En eventos DELETE de postgres_changes, el payload puede ser incompleto segun replica identity.
   Decision: no depender del payload completo para borrar localmente; leer deletes desde tabla sync_delete_log remota via pull incremental.
4. Eventos duplicados o en rafaga pueden provocar carreras y trabajo redundante.
   Decision: mantener SyncOrchestrator como compuerta unica y agregar debounce/coalescing de invalidaciones (ventana corta, por ejemplo 300-500 ms).
5. El pull full actual no escala para near-real-time.
   Decision: reemplazar por pull incremental por updated_at + id (cursor estable) y cursor separado para delete log.

### Tareas secuenciadas por capa

| #   | Capa                   | Tipo                       | Descripcion                                                                                                                                                          | Archivo(s) preliminares                                                                                              |
| --- | ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Sync contracts         | Dominio de sync            | Extender contratos para soportar outbox de upsert/delete e inbox incremental: tipos de cursor/checkpoint, tipo de invalidation event y metadatos de corrida          | src/data/sync/types.ts                                                                                               |
| 2   | Sync contracts         | Transporte                 | Extender interfaz de transporte con operacion de delete remoto y contrato de pull incremental (o nuevo puerto de pull)                                               | src/data/sync/SyncTransport.ts, src/data/sync/SupabaseSyncTransport.ts                                               |
| 3   | Local DB/checkpoint    | Migraciones                | Crear tablas locales para checkpoint(s) e inbox aplicado: sync_checkpoints, sync_applied_events (o equivalente), indices por entity_type/cursor                      | src/data/local/migrations.ts                                                                                         |
| 4   | Local DB/checkpoint    | Repositorio                | Implementar repositorio de checkpoint con operaciones atomicas get/set/advance y monotonicidad                                                                       | src/data/sync/SyncCheckpointRepository.ts                                                                            |
| 5   | Outbox                 | Repositorio cola           | Incluir lectura de deletes pendientes desde sync_delete_log en SyncQueueRepository y mapear operationType delete                                                     | src/data/sync/SyncQueueRepository.ts                                                                                 |
| 6   | Outbox                 | Processor                  | Ajustar SyncQueueProcessor para despachar delete vs upsert, conservar retries y marcar synced/error en tabla correcta (incluyendo delete log)                        | src/data/sync/SyncQueueProcessor.ts                                                                                  |
| 7   | Delete pipeline        | Transporte remoto          | Implementar push de deletes a Supabase (tabla remota sync_delete_log o RPC definido) con idempotencia por id de delete                                               | src/data/sync/SupabaseSyncTransport.ts                                                                               |
| 8   | Pull incremental       | Caso de uso                | Reemplazar pullAll por pull incremental por entidad (clients, camisa, pantalon, sync_delete_log) filtrado por checkpoint                                             | src/data/sync/SupabasePullSync.ts o nuevo src/data/sync/SupabaseIncrementalPullSync.ts                               |
| 9   | Pull incremental       | Aplicacion inbox           | Aplicar inbox en transaccion: upsert por updated_at, aplicar deletes idempotentes, luego avanzar checkpoint                                                          | src/data/sync/SupabasePullSync.ts o nuevo servicio + soporte en repositorios locales                                 |
| 10  | Realtime subscriber    | Integracion realtime       | Crear suscriptor a postgres_changes para tablas sincronizadas; al evento, emitir invalidacion coalescida hacia orchestrator                                          | src/data/sync/SupabaseRealtimeInvalidationSubscriber.ts                                                              |
| 11  | App lifecycle triggers | Foreground sync            | Crear controlador de lifecycle (AppState active) para solicitar corrida de sync y pull incremental al volver a foreground                                            | src/data/sync/SyncLifecycleController.ts, App.tsx                                                                    |
| 12  | Orquestacion           | Dedupe corridas            | Mantener dedupe existente y agregar metricas basicas de source-trigger (write, realtime, foreground, bootstrap) y coalescing                                         | src/data/sync/SyncOrchestrator.ts                                                                                    |
| 13  | Wiring                 | Dependencias               | Componer nuevos componentes sync (checkpoint repo, pull incremental, realtime subscriber, lifecycle trigger) sin romper fallback cuando Supabase no este configurado | src/data/local/clientsDependencies.ts, App.tsx                                                                       |
| 14  | Observabilidad         | Metricas latencia          | Agregar medicion de latencia de propagacion (timestamps de evento/recepcion) para validar p50/p95 en pruebas de integracion                                          | src/data/sync/SyncMetrics.ts (nuevo) o util equivalente                                                              |
| 15  | Tests unitarios        | Sync core                  | Cubrir tipos nuevos, queue repository con deletes, processor con delete branch y retry, checkpoint monotono, apply inbox idempotente                                 | src/data/sync/SyncQueueRepository.test.ts, src/data/sync/SyncQueueProcessor.test.ts, nuevos tests de checkpoint/pull |
| 16  | Tests integracion      | Multi-dispositivo simulado | Probar flujo A->B: upsert y delete propagados por invalidacion + pull incremental, con deduplicacion de triggers y reconexion                                        | nuevos tests en src/data/sync/\*.test.ts y ajustes en App.test.tsx                                                   |

### Criterios de aceptacion medibles

1. Outbox completo
   Cuando hay upsert local (cliente o medida), el registro sale de pending/error a synced tras corrida exitosa.
2. Delete pipeline cerrado
   Cuando se elimina un cliente localmente, se crea fila en sync_delete_log local, se empuja remoto, y termina en estado synced.
3. Inbox incremental
   Con checkpoint inicial X, solo se aplican cambios remotos con cursor > X, y al final checkpoint avanza monotonicamente.
4. Idempotencia de inbox
   Re-ejecutar el mismo lote remoto no duplica filas ni revierte datos mas nuevos; resultado final es estable.
5. Deduplicacion de corridas
   N solicitudes concurrentes durante una corrida activa producen como maximo 1 corrida extra (coalescida), no N corridas completas.
6. Realtime invalidation
   Evento realtime en tablas sincronizadas dispara pull incremental (con debounce), sin depender del payload para aplicar cambios.
7. Foreground trigger
   Al pasar de background/inactive a active se solicita corrida de sync y pull incremental al menos una vez por transicion.
8. Latencia near-real-time
   En prueba controlada multi-dispositivo: p50 de propagacion <= 5s y p95 <= 20s, medido desde commit local en A hasta estado visible/synced en B.
9. Robustez ante reconexion
   Tras corte de red y reconexion, el sistema converge por pull incremental sin necesidad de full refresh manual.
10. Compatibilidad offline-first
    Sin red o sin Supabase configurado, el guardado local no falla; la app conserva comportamiento local con reintento posterior.

### Estrategia de pruebas unitarias e integracion

1. Unitarias de contratos y repositorios
   Validar mapeos de tipos, lectura de pendientes (incluye delete log), actualizacion de estados y orden global por updatedAt/cursor.
2. Unitarias de processor
   Escenarios: upsert exitoso, delete exitoso, retries, agotamiento de retries, marcado error por entidad correcta.
3. Unitarias de checkpoint
   Escenarios: avance monotono, no retroceso de cursor, inicializacion vacia, concurrencia secuencial.
4. Unitarias de pull incremental
   Escenarios: lote vacio, lote con upserts, lote con deletes, lote duplicado, cambios fuera de orden.
5. Unitarias de realtime subscriber
   Escenarios: evento unico, rafaga de eventos (debounce), reconexion, unsubscribe seguro.
6. Integracion de orquestacion
   Escenarios: triggers simultaneos (write + realtime + foreground), dedupe correcta, corrida extra unica.
7. Integracion end-to-end simulada A/B
   Simular dispositivo A que escribe y B que recibe invalidacion + pull incremental; verificar estado final y latencias.
8. Pruebas de regresion
   Asegurar que tests existentes de ClientRepositoryImpl, SyncOrchestrator y wiring no se rompan.

### Riesgos y mitigaciones

1. Riesgo: drift de esquema remoto (faltan columnas o indices para checkpoint/deletes).
   Mitigacion: checklist de prerequisitos de Supabase y validacion de contratos antes de activar feature.
2. Riesgo: latencia alta por frecuencia de pulls o conexiones inestables.
   Mitigacion: realtime como invalidador + pull incremental liviano + debounce + trigger foreground.
3. Riesgo: carreras entre outbox push e inbox pull.
   Mitigacion: transacciones SQLite, comparacion por updated_at/id y reglas idempotentes de aplicacion.
4. Riesgo: consumo de bateria por suscripciones/perfiles de pull agresivos.
   Mitigacion: activar sync intensivo solo en foreground, coalescer eventos, limites de batch.
5. Riesgo: deletes remotos no aplicados por dependencia del payload realtime.
   Mitigacion: canal unico de deletes via sync_delete_log incremental y procesamiento idempotente.
6. Riesgo: ruido por corridas repetidas.
   Mitigacion: mantener SyncOrchestrator como punto unico de serializacion y registrar source para afinacion.

### Rollback plan

1. Feature flags de activacion
   Introducir flags para: incremental pull, realtime invalidation y foreground trigger.
2. Rollback parcial inmediato
   Si falla realtime o incremental, desactivar flags y volver temporalmente a requestRun + pull inicial/full existente.
3. Preservacion de datos
   No eliminar tablas legacy; nuevas tablas de checkpoint/inbox deben ser aditivas para rollback seguro.
4. Rollback operativo
   Mantener compatibilidad con NoopSyncTransport cuando Supabase no este configurado.
5. Criterio de rollback
   Si no se cumple latencia p95 <= 20s en pruebas de aceptacion o hay regresiones de integridad, revertir activacion de N-039 y conservar outbox actual.

### Lista preliminar de archivos a modificar

1. App.tsx
2. src/data/local/clientsDependencies.ts
3. src/data/local/migrations.ts
4. src/data/sync/types.ts
5. src/data/sync/SyncTransport.ts
6. src/data/sync/SupabaseSyncTransport.ts
7. src/data/sync/SyncQueueRepository.ts
8. src/data/sync/SyncQueueProcessor.ts
9. src/data/sync/SyncOrchestrator.ts
10. src/data/sync/SupabasePullSync.ts (o reemplazo equivalente)
11. src/data/sync/index.ts
12. src/data/sync/SyncQueueRepository.test.ts
13. src/data/sync/SyncQueueProcessor.test.ts
14. src/data/sync/SyncOrchestrator.test.ts
15. App.test.tsx

### Lista preliminar de archivos a crear

1. src/data/sync/SyncCheckpointRepository.ts
2. src/data/sync/SyncCheckpointRepository.test.ts
3. src/data/sync/SupabaseRealtimeInvalidationSubscriber.ts
4. src/data/sync/SupabaseRealtimeInvalidationSubscriber.test.ts
5. src/data/sync/SyncLifecycleController.ts
6. src/data/sync/SyncLifecycleController.test.ts
7. src/data/sync/SupabaseIncrementalPullSync.test.ts (si se mantiene archivo separado)
8. src/data/sync/SyncMetrics.ts (si se decide instrumentacion dedicada)

### Supuestos para ejecucion Builder

1. Existe o se puede crear en Supabase una tabla remota sync_delete_log por usuario con politicas RLS adecuadas.
2. Las tablas remotas usan updated_at consistente en UTC para cursor incremental.
3. Se habilitara Realtime para tablas clients, camisa_measurements, pantalon_measurements y sync_delete_log.
4. El objetivo de latencia se evaluara en entorno de prueba estable con reloj sincronizado entre dispositivos.
