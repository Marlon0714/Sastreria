# Plan N-043 — Robustecer Sync Cloud-First

## Objetivo

Evitar estados falsos de "synced" en modo local-only, garantizar feedback honesto al usuario y robustecer la experiencia de sincronización ante reconexión de red.

## Alcance

## Criterios de Aceptación

## Dependencias

## Owner

Architect / Builder / Tester

## Estado

**Ready for execution**

> Este plan formaliza el ciclo operativo para N-043. El siguiente paso es asignar tareas y abrir branch de ejecución.

## Plan de Implementación: Robustecer sync cloud-first (N-043)

### Contexto

El proyecto ya cuenta con una arquitectura de sincronización cloud-first basada en:

- Cola local (`SyncQueueRepository`, `SyncQueueProcessor`) con estados `pending`, `synced`, `error`.
- Transporte cloud (`SupabaseSyncTransport`) que retorna outcomes explícitos: `synced`, `deferred_local_only`, `deferred_offline`, `failed`.
- Orquestador (`SyncOrchestrator`) que deduplica y throttlea triggers, incluyendo recuperación de red.
- Controlador de conectividad (`SyncConnectivityController`) que detecta reconexión y dispara sync.
- Estado global de sync en Zustand (`syncStatusStore`) y banner global (`SyncStatusBanner`).
- Pruebas unitarias y de integración para todos los componentes críticos.

### Tareas

| #   | Tipo    | Descripción                                                                                      | Archivo(s)                                                                                                                                                                                                                    |
| --- | ------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dominio | Revisar y reforzar contratos de outcomes en `SyncTransport` y tipos de syncStatus                | src/data/sync/types.ts, src/shared/domain/baseEntity.ts                                                                                                                                                                       |
| 2   | Datos   | Validar que nunca se marque como `synced` en modo local-only u offline, solo si outcome=cloud-ok | src/data/sync/SyncQueueProcessor.ts, tests                                                                                                                                                                                    |
| 3   | Datos   | Auditar y reforzar lógica de retry y edge cases en `SyncQueueProcessor` y `SyncOrchestrator`     | src/data/sync/SyncQueueProcessor.ts, src/data/sync/SyncOrchestrator.ts, tests                                                                                                                                                 |
| 4   | Datos   | Mejorar logs estructurados y trazabilidad de eventos de sync/error                               | src/data/sync/SyncQueueProcessor.ts                                                                                                                                                                                           |
| 5   | UI      | Revisar lógica de banner global y variantes en Zustand, asegurar feedback honesto                | src/shared/state/syncStatusStore.ts, src/shared/components/SyncStatusBanner.tsx, tests                                                                                                                                        |
| 6   | Lógica  | Validar trigger automático de retry al recuperar red (test de integración)                       | src/data/sync/SyncConnectivityController.ts, src/data/sync/SyncOrchestrator.ts, tests                                                                                                                                         |
| 7   | Test    | Pruebas de regresión: casos de local-only, offline, reconexión, errores, pendientes              | src/data/sync/SyncQueueProcessor.test.ts, src/data/sync/SyncOrchestrator.test.ts, src/data/sync/SyncConnectivityController.test.ts, src/shared/state/syncStatusStore.test.ts, src/shared/components/SyncStatusBanner.test.tsx |

### Decisiones de Diseño

- El outcome `deferred_local_only`/`deferred_offline` **no** debe marcar como `synced` ni limpiar errores previos.
- El banner global debe reflejar siempre el estado real: local-only, offline con pendientes, pendientes en cloud, etc.
- El trigger de retry por reconexión debe ser deduplicado y throttleado (ya implementado, reforzar tests).
- Todos los logs de error deben ser estructurados y nunca incluir PII.
- No se debe modificar `updatedAt` al cambiar `syncStatus` (ya respetado).

### Riesgos o Consideraciones

- Cambios en la lógica de sync pueden afectar edge cases de conflicto o duplicidad.
- Revisar que ningún flujo marque como `synced` en local-only/offline (tests de regresión).
- Validar que el banner no desaparezca en estados intermedios.
- Mantener cobertura de tests alta, especialmente en integración y reconexión.

📄 Plan guardado en: .github/plans/n043-robust-sync-cloud-first.md
👉 Siguiente paso: @Builder ejecuta el plan en .github/plans/n043-robust-sync-cloud-first.md
