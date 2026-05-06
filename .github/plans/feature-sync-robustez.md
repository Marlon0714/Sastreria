## Plan de Implementación: N-043 Robustez de Sync Cloud-First

### Contexto

- El flujo actual dispara sync en bootstrap, foreground, realtime y writes locales desde [App.tsx](App.tsx) y [src/data/local/clientsDependencies.ts](src/data/local/clientsDependencies.ts), pero no por reconexión de red.
- En modo sin Supabase configurado, [src/data/sync/SyncTransport.ts](src/data/sync/SyncTransport.ts) usa NoopSyncTransport y [src/data/sync/SyncQueueProcessor.ts](src/data/sync/SyncQueueProcessor.ts) marca synced al no fallar, lo que permite falso synced en local-only.
- Existe badge por registro en [src/features/clients/screens/ClientListScreen.tsx](src/features/clients/screens/ClientListScreen.tsx), pero no existe banner global de estado transversal en navegación.

### Objetivo N-043

1. Evitar falso synced en local-only sin romper offline-first.
2. Agregar banner global sutil de estado para local-only y sin conexión.
3. Agregar reintentos automáticos al recuperar red con anti-thrashing.

### Alcance

- Incluye capa sync, wiring en App, estado UI global de sync y pruebas.
- No cambia contratos de dominio de clientes/medidas ni bloquea escrituras locales.
- Mantiene compatibilidad con schema actual (sin migración SQLite obligatoria para N-043).

### Tareas Secuenciales

| #   | Tipo                          | Descripción                                                                                                                                                                            | Archivo(s) objetivo                                                                                                                                                                                                                                                                                                                                                          | Dependencia |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Análisis técnico              | Formalizar semántica de estado de envío por intento (confirmado cloud vs diferido local-only) para no sobrecargar syncStatus persistido.                                               | [src/data/sync/types.ts](src/data/sync/types.ts), [src/shared/domain/baseEntity.ts](src/shared/domain/baseEntity.ts)                                                                                                                                                                                                                                                         | -           |
| 2   | Contrato de transporte        | Ajustar contrato SyncTransport para retornar resultado explícito por intento (ej: synced, deferred_local_only, deferred_offline, failed) en vez de asumir éxito por ausencia de error. | [src/data/sync/SyncTransport.ts](src/data/sync/SyncTransport.ts), [src/data/sync/SupabaseSyncTransport.ts](src/data/sync/SupabaseSyncTransport.ts)                                                                                                                                                                                                                           | 1           |
| 3   | Política local-only           | Cambiar Noop transport para devolver estado diferido local-only (no éxito cloud) y evitar que Processor cierre como synced cuando no hay backend configurado.                          | [src/data/sync/SyncTransport.ts](src/data/sync/SyncTransport.ts), [src/data/local/clientsDependencies.ts](src/data/local/clientsDependencies.ts)                                                                                                                                                                                                                             | 2           |
| 4   | Reglas de transición          | Actualizar processor para marcar synced solo con confirmación cloud; en deferred mantener pending/error sin degradar escrituras offline-first.                                         | [src/data/sync/SyncQueueProcessor.ts](src/data/sync/SyncQueueProcessor.ts), [src/data/sync/SyncQueueRepository.ts](src/data/sync/SyncQueueRepository.ts)                                                                                                                                                                                                                     | 2,3         |
| 5   | Estado global de sync         | Crear estado global UI (Zustand) para exponer: mode (cloud/local-only), connectivity (online/offline), hasPending, lastSyncAttempt, lastSyncError, bannerVariant.                      | [src/shared/state/syncStatusStore.ts](src/shared/state/syncStatusStore.ts), [src/data/sync/index.ts](src/data/sync/index.ts)                                                                                                                                                                                                                                                 | 4           |
| 6   | Controlador de conectividad   | Implementar listener de red dedicado para emitir evento network_recovered con guards de coalescing y cooldown anti-thrashing.                                                          | [src/data/sync/SyncConnectivityController.ts](src/data/sync/SyncConnectivityController.ts), [src/data/sync/types.ts](src/data/sync/types.ts), [package.json](package.json)                                                                                                                                                                                                   | 5           |
| 7   | Orquestación anti-thrashing   | Extender trigger source y coalescing en orchestrator para network_recovered; añadir throttling temporal y dedupe de ráfagas.                                                           | [src/data/sync/SyncOrchestrator.ts](src/data/sync/SyncOrchestrator.ts), [src/data/sync/types.ts](src/data/sync/types.ts)                                                                                                                                                                                                                                                     | 6           |
| 8   | Wiring App                    | Integrar controlador de conectividad al bootstrap y cleanup; al reconectar ejecutar requestRun("network_recovered") + pull incremental con guardas.                                    | [App.tsx](App.tsx), [src/data/sync/SyncLifecycleController.ts](src/data/sync/SyncLifecycleController.ts)                                                                                                                                                                                                                                                                     | 6,7         |
| 9   | Banner global sutil           | Crear componente de banner no intrusivo y ubicarlo en contenedor raíz autenticado para visibilidad transversal (local-only/offline/pending).                                           | [src/shared/components/SyncStatusBanner.tsx](src/shared/components/SyncStatusBanner.tsx), [src/navigation/RootNavigator.tsx](src/navigation/RootNavigator.tsx), [src/shared/components/index.ts](src/shared/components/index.ts)                                                                                                                                             | 5,8         |
| 10  | Integración con estado global | Publicar cambios de estado desde bootstrap, processor y conectividad al store global (sin exponer PII).                                                                                | [App.tsx](App.tsx), [src/data/sync/SyncQueueProcessor.ts](src/data/sync/SyncQueueProcessor.ts), [src/data/local/clientsDependencies.ts](src/data/local/clientsDependencies.ts)                                                                                                                                                                                               | 5,8,9       |
| 11  | Pruebas unitarias sync        | Cubrir regresión de falso synced, triggers de reconexión y anti-thrashing con timers controlados.                                                                                      | [src/data/sync/SyncQueueProcessor.test.ts](src/data/sync/SyncQueueProcessor.test.ts), [src/data/sync/SyncOrchestrator.test.ts](src/data/sync/SyncOrchestrator.test.ts), [src/data/sync/SyncLifecycleController.test.ts](src/data/sync/SyncLifecycleController.test.ts), [src/data/sync/SyncConnectivityController.test.ts](src/data/sync/SyncConnectivityController.test.ts) | 4,6,7       |
| 12  | Pruebas UI/App                | Validar render condicional del banner global y flujo de bootstrap/reconexión sin bloquear UI ni navegación.                                                                            | [App.test.tsx](App.test.tsx), [src/navigation/FeatureTabsNavigator.test.tsx](src/navigation/FeatureTabsNavigator.test.tsx), [src/features/clients/screens/ClientListScreen.test.tsx](src/features/clients/screens/ClientListScreen.test.tsx)                                                                                                                                 | 8,9,10      |

### Detalle de Diseño por Objetivo

#### 1) Evitar falso synced en local-only

- Separar estado de persistencia local (pending/synced/error) del resultado del intento de transporte.
- Regla principal: solo transicionar a synced cuando exista confirmación explícita cloud.
- En local-only (sin Supabase configurado), mantener pending y registrar reason local_only en estado runtime global para UX.
- Mantener offline-first: create/update/delete locales siempre exitosos aunque el intento de sync se difiera.

#### 2) Banner global sutil de estado

- Ubicación: raíz autenticada para cubrir todas las pantallas del flujo principal.
- Variantes mínimas:
  - local_only: Modo local activo, cambios guardados en este dispositivo.
  - offline: Sin conexión, cambios se sincronizarán al reconectar.
  - syncing_pending: Hay cambios pendientes de sincronizar.
- UX: altura compacta, mensaje corto, sin bloquear interacción ni navegación.

#### 3) Reintentos al recuperar red con anti-thrashing

- Fuente del trigger: transición offline -> online mediante controlador dedicado.
- Guardas:
  - cooldown mínimo entre triggers de reconexión (ej. 5-10s).
  - dedupe de corrida activa mediante orchestrator.
  - coalescing para ráfagas de cambios de conectividad.
- En reconexión: ejecutar push (requestRun) y pull incremental de forma segura, con logging sanitizado.

### Criterios de Aceptación

1. En modo local-only, ningún registro pasa a synced por Noop transport.
2. En modo local-only, create/update/delete locales siguen funcionando y quedan pending.
3. Al reconectar red tras estar offline, se dispara al menos una corrida network_recovered.
4. Ráfagas online/offline no generan tormenta de corridas (máximo 1 activa + 1 coalescida).
5. Banner global aparece en modo local-only y sin conexión, y desaparece cuando no aplica.
6. Banner no bloquea navegación ni acciones de usuario.
7. No se filtran PII ni secretos en logs de errores de sync/conectividad.
8. Se mantienen verdes pruebas existentes no relacionadas con N-043.

### Plan de Pruebas

#### Unitarias (Sync)

1. SyncQueueProcessor:

- no marca synced cuando transport retorna deferred_local_only.
- mantiene pending cuando retorna deferred_offline.
- marca synced solo en confirmed cloud success.

2. SyncOrchestrator:

- acepta source network_recovered.
- coalesce + cooldown evita thrashing en ráfagas.

3. SyncConnectivityController:

- emite callback solo en transición offline->online.
- no emite múltiples eventos durante jitter de red dentro del cooldown.

4. clientsDependencies wiring:

- local-only compone fallback sin marcar synced por defecto.

#### Unitarias/UI (Banner)

1. SyncStatusBanner:

- renderiza variante local_only.
- renderiza variante offline.
- oculta banner cuando estado healthy/sin pendientes.

2. Root/App integration:

- banner visible en app autenticada cuando corresponde.
- bootstrap sigue mostrando RootNavigator aunque falle sync remoto.

#### Regresión End-to-End técnica (simulada en tests)

1. Flujo local-only:

- write local -> pending persistente -> sin transición falsa a synced.

2. Flujo reconexión:

- write local sin red -> reconexión -> trigger network_recovered -> sync converge a synced cuando cloud confirma.

### Riesgos y Mitigaciones

- Riesgo: ampliar SyncStatus en entidades rompe tipado transversal.
- Mitigación: mantener syncStatus persistido intacto y modelar resultado de transporte por contrato separado.

- Riesgo: dependencia nueva de conectividad impacta tests/entorno web.
- Mitigación: abstraer controlador y mockear adapter en tests, con fallback no-op en plataformas no soportadas.

- Riesgo: doble trigger reconexión + foreground.
- Mitigación: orquestador con dedupe y cooldown explícito por source.

### Comandos de Validación

1. npm run typecheck
2. npm run test -- src/data/sync/SyncQueueProcessor.test.ts
3. npm run test -- src/data/sync/SyncOrchestrator.test.ts
4. npm run test -- src/data/sync/SyncConnectivityController.test.ts
5. npm run test -- src/data/local/clientsDependencies.test.ts
6. npm run test -- App.test.tsx
7. npm run test -- src/features/clients/screens/ClientListScreen.test.tsx
8. npm run lint
