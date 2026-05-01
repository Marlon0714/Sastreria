# Needs Backlog

| ID    | Need                                                                                    | Priority | Status      | Owner Agent         | Notes                                                                                                                |
| ----- | --------------------------------------------------------------------------------------- | -------- | ----------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| N-001 | Confirm stable APK CI flow with EAS                                                     | High     | In Progress | Release / Debugger  | Waiting for successful run validation                                                                                |
| N-002 | Keep project context persistent across sessions                                         | High     | Done        | ContextKeeper       | Context files and agent created                                                                                      |
| N-003 | Define practical agent lifecycle usage                                                  | Medium   | Done        | Orchestrator        | Flow documented and ready                                                                                            |
| N-004 | Improve local dev reliability (Android/Expo)                                            | Medium   | Open        | Debugger            | Pending focused diagnosis pass                                                                                       |
| N-005 | Harden release checklist before production                                              | Medium   | Open        | Release / Reviewer  | Add stricter quality gates                                                                                           |
| N-006 | Add PR quality gate automation (lint/test/build)                                        | High     | Open        | Release / Reviewer  | Block merge when minimum checks fail                                                                                 |
| N-007 | Define project-wide Definition of Done per PR                                           | Medium   | Open        | ContextKeeper       | Standardize exit criteria for all work                                                                               |
| N-008 | Implement schedule feature baseline (domain, repository, screens, tests)                | High     | Open        | Builder / Tester    | Feature folder exists but no source files                                                                            |
| N-009 | Implement pricing feature baseline (domain, repository, screens, tests)                 | High     | Open        | Builder / Tester    | Feature folder exists but no source files                                                                            |
| N-010 | Implement sync queue in `src/data/sync` aligned to offline-first contract               | High     | Done        | Architect / Builder | Merged. Orchestrator, processor, queue repository, NoopSyncTransport y tests activos                                 |
| N-011 | Restore trustworthy coverage signal in CI (non-empty coverage and thresholds enforced)  | Medium   | Open        | Release / Reviewer  | Current coverage report shows `0/0 Unknown%`                                                                         |
| N-012 | Automate branch verification in daily standup flow                                      | Low      | Open        | ContextKeeper       | Use `.git/HEAD` check to avoid stale session metadata                                                                |
| N-013 | Refactor root navigation to feature-based composition (tabs + stacks)                   | High     | Done        | Architect / Builder | Merged. Tabs+stacks activos con placeholders controlados                                                             |
| N-014 | Introduce repository composition layer for hook dependency decoupling                   | High     | Done        | Architect / Builder | Merged. Hooks desacoplados de implementaciones concretas                                                             |
| N-015 | Rotar y verificar secretos de CI (EXPO_TOKEN)                                           | High     | Done        | Release / Security  | Rotación realizada; mantener evidencia y checklist de verificación post-rotación                                     |
| N-016 | Refactor domain model: CamisaMeasurement + PantalonMeasurement types, schemas, DTOs     | High     | Done        | Architect / Builder | Merged. Types/schemas/DTOs nuevos + tipo legado eliminado en N-019                                                   |
| N-017 | SQLite migration v2: tablas camisa_measurements y pantalon_measurements                 | High     | Done        | Builder             | Merged. Tablas con UNIQUE client_id, FK a clients(id), migración idempotente                                         |
| N-018 | MeasurementRepository interface + impl: upsertCamisa, upsertPantalon, find por clientId | High     | Done        | Builder             | Merged. INSERT … ON CONFLICT DO UPDATE; queries parametrizadas                                                       |
| N-019 | Hooks de medidas: useUpsertCamisa, useUpsertPantalon, useCamisaMeasurement, usePantalon | High     | Done        | Builder             | Merged. Hooks con DI vía ClientsDependenciesProvider; legacy eliminado                                               |
| N-020 | Navigation types + ClientsStackNavigator: rutas MeasurementTypeSelect, Camisa/Pantalon  | High     | Done        | Builder             | Merged. Rutas con `mode: create\|view`; rutas legacy eliminadas                                                      |
| N-021 | MeasurementTypeSelectScreen: selección camisa/pantalón con mode create o view           | High     | Done        | Builder             | Merged. 5 tests verdes                                                                                               |
| N-022 | CamisaMeasurementCreateScreen (consolidada en DetailScreen)                             | High     | Done        | Builder             | Merged. Flujo unificado create+view+edit en DetailScreen                                                             |
| N-023 | PantalonMeasurementCreateScreen (consolidada en DetailScreen)                           | High     | Done        | Builder             | Merged. Mismo patrón que N-022                                                                                       |
| N-024 | CamisaMeasurementDetailScreen: vista + edición inline + guardar                         | High     | Done        | Builder             | Merged. Empieza editable si no hay datos; disabled + botón Editar si ya existen                                      |
| N-025 | PantalonMeasurementDetailScreen: vista + edición inline + guardar                       | High     | Done        | Builder             | Merged. Mismo patrón que N-024                                                                                       |
| N-026 | ClientDetailScreen: botón único Medidas, DI consolidado                                 | High     | Done        | Builder             | Merged. Un botón → MeasurementTypeSelect; useClientDetail con DI correcto                                            |
| N-027 | Tests de integración E2E: flujos completos multi-módulo                                 | High     | Open        | Tester              | Reducido a integración; tests unitarios incluidos en cada PR como criterio de salida                                 |
| N-028 | Shared form components: CamisaMeasurementForm + PantalonMeasurementForm                 | High     | Done        | Builder             | Merged. Prop `disabled`; patrón Harness en tests                                                                     |
| N-029 | Búsqueda y filtro de clientes por nombre y teléfono en ClientListScreen                 | High     | Done        | Builder             | Filtro local (Todos/Nombre/Teléfono) + normalización de acentos; 4 tests nuevos verdes                               |
| N-030 | Estrategia de persistencia multi-dispositivo — decisión arquitectural                   | High     | Done        | Architect           | **Decisión: Supabase** (PostgreSQL cloud). Ver decisions-log 2026-05-01. Implementación en N-031..N-034              |
| N-031 | Corregir SyncQueueRepository para tablas v2 (camisa/pantalón) + tipos sync alineados    | Critical | Open        | Builder             | `SyncQueueRepository` lee `measurements` (legacy); `SyncMeasurementQueueItem` tiene campos v1. Bloqueante para N-032 |
| N-032 | Supabase: schema + RLS + auth email/password + SupabaseSyncTransport (push)             | High     | Open        | Builder             | Instalar `@supabase/supabase-js` + `expo-secure-store`; replicar schema en Postgres; JWT en SecureStore              |
| N-033 | Sync pull descendente al autenticarse (download desde Supabase → SQLite local)          | High     | Open        | Builder             | Necesario para que un segundo dispositivo reciba datos del primero                                                   |
| N-034 | Indicador visual de sync en UI (ícono/badge pending/synced/error en lista de clientes)  | Medium   | Open        | Builder             | Feedback al usuario sobre estado de sincronización; no exponer syncStatus como texto crudo                           |

## Sprint Activo — Tracks

**Track F — Sync Cloud (PRIORIDAD MÁXIMA):**

```
N-031 (Fix sync v2) → N-032 (Supabase + auth + push) → N-033 (pull) → N-034 (UI sync badge)
```

- N-031 es prerequisito duro de N-032: sin él los upserts de camisa/pantalón nunca se encolan
- N-032 requiere cuenta Supabase creada por el usuario (gratuita en supabase.com)
- Instalar antes de N-032: `npx expo install @supabase/supabase-js expo-secure-store`
- URL y anon key de Supabase van en `.env` + `app.config.js` vía `expo-constants`, nunca hardcodeadas

**Track G — Features pendientes (paralelo con F una vez N-031 esté cerrado):**

- N-008: schedule baseline (domain + repo + screens mínimas + tests)
- N-009: pricing baseline (idem)

**Track A — Calidad CI (sin bloquear F y G):**

- N-006: PR quality gate (lint/test/build automático)
- N-011: Coverage signal confiable

## Open Blockers

- **Critical**: `SyncQueueRepository` lee tabla `measurements` v1 — los datos de camisa/pantalón **nunca entran a la cola de sync**. N-031 resuelve esto.
- **Critical**: `SyncMeasurementQueueItem.payload` usa campos del modelo legacy. N-031 lo corrige.
- Medium: Sin auth implementada — multi-dispositivo en producción requiere N-032 completo.
- Medium: Coverage signal no confiable (`0/0`). N-011 pendiente.
- Low: `console.error` como shim de Crashlytics. Deuda conocida.
- Low: `isSubmitting` async en hooks de upsert. Deuda registrada.

## Próximas Prioridades (ordenadas)

1. **N-031** — Fix sync v2 (prerequisito duro de todo el track F)
2. **N-032** — Supabase schema + auth + SupabaseSyncTransport push
3. **N-033** — Pull descendente (segundo dispositivo recibe datos)
4. **N-008/N-009** — Schedule + pricing baseline (pueden arrancar en paralelo con N-032)
5. **N-034** — Indicador visual de sync
6. **N-006/N-011** — Quality gates CI
