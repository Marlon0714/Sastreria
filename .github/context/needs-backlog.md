# Needs Backlog

| ID    | Need                                                                                   | Priority | Status       | Owner Agent         | Notes                                                                                               |
| ----- | -------------------------------------------------------------------------------------- | -------- | ------------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| N-001 | Confirm stable APK CI flow with EAS                                                    | High     | In Progress  | Release / Debugger  | Waiting for successful run validation                                                               |
| N-002 | Keep project context persistent across sessions                                        | High     | Done         | ContextKeeper       | Context files and agent created                                                                     |
| N-003 | Define practical agent lifecycle usage                                                 | Medium   | Done         | Orchestrator        | Flow documented and ready                                                                           |
| N-004 | Improve local dev reliability (Android/Expo)                                           | Medium   | Open         | Debugger            | Pending focused diagnosis pass                                                                      |
| N-005 | Harden release checklist before production                                             | Medium   | Open         | Release / Reviewer  | Add stricter quality gates                                                                          |
| N-006 | Add PR quality gate automation (lint/test/build)                                       | High     | Open         | Release / Reviewer  | Block merge when minimum checks fail                                                                |
| N-007 | Define project-wide Definition of Done per PR                                          | Medium   | Open         | ContextKeeper       | Standardize exit criteria for all work                                                              |
| N-008 | Implement schedule feature baseline (domain, repository, screens, tests)               | P0       | **Next**     | Builder / Tester    | Siguiente prioridad funcional tras cierre N-040/N-041/N-042; sin bloqueadores técnicos activos      |
| N-009 | Implement pricing feature baseline (domain, repository, screens, tests)                | P0       | **En curso** | Builder / Tester    | Dominio, repositorio y migración completos y auditados; UI y navegación siguientes.                 |
| N-010 | Implement sync queue in `src/data/sync` aligned to offline-first contract              | High     | Done         | Architect / Builder | Implementado y mergeado en develop; fase base y correcciones reviewer completadas                   |
| N-011 | Restore trustworthy coverage signal in CI (non-empty coverage and thresholds enforced) | Medium   | Open         | Release / Reviewer  | Current coverage report shows `0/0 Unknown%`                                                        |
| N-012 | Automate branch verification in daily standup flow                                     | Low      | Open         | ContextKeeper       | Use `.git/HEAD` check to avoid stale session metadata                                               |
| N-013 | Refactor root navigation to feature-based composition (tabs + stacks)                  | High     | Done         | Architect / Builder | Implementado y mergeado en develop; tabs+stacks activos con placeholders controlados                |
| N-014 | Introduce repository composition layer for hook dependency decoupling                  | High     | Done         | Architect / Builder | Corrective subcycle cerrado y mergeado en develop; hooks desacoplados de implementaciones concretas |
| N-015 | Rotar y verificar secretos de CI (EXPO_TOKEN)                                          | High     | Done         | Release / Security  | Rotacion realizada por el equipo; mantener evidencia y checklist de verificacion post-rotacion      |

| N-016 | Refactor domain model: CamisaMeasurement + PantalonMeasurement types, schemas, DTOs | High | Done | Architect / Builder | Pushed `feature/clients/n016-measurement-domain-model` commit `75ee0dd`; types/schemas/DTOs nuevos + tipo legado `@deprecated`; 8 tests nuevos verdes |
| N-017 | SQLite migration v2: tablas camisa_measurements y pantalon_measurements (UNIQUE per client) | High | Done | Builder | Rama `feature/clients/n017-n019-data-layer` commit `22711ae`; tablas con UNIQUE client_id, FK a clients(id), migración idempotente vía schema_migrations; push pendiente DNS |
| N-018 | MeasurementRepository interface + impl: upsertCamisa, upsertPantalon, find por clientId | High | Done | Builder | Mismo commit que N-017 (`22711ae`); INSERT … ON CONFLICT DO UPDATE; interface reemplaza addMeasurement/findMeasurementsByClientId; queries parametrizadas; tests actualizados |
| N-019 | Hooks de medidas: useUpsertCamisa, useUpsertPantalon, useCamisaMeasurement, usePantalon | High | Done | Builder | Commits `22711ae` + `134cb30`; hooks nuevos con DI vía ClientsDependenciesProvider; eliminados legacy hooks/screens; MeasurementTypeSelectScreen nuevo; PlaceholderScreen en navigator; 25 suites / 88 tests verde |
| N-020 | Navigation types + ClientsStackNavigator: nuevas rutas (MeasurementTypeSelect, Camisa/Pantalon Create/Detail) | High | Done | Builder | Pushed `feature/clients/n020-n028-nav-and-forms` commit `c43f76a`; rutas nuevas con `mode: create\|view` en `MeasurementTypeSelect`; rutas legacy `@deprecated` (eliminar en N-019) |
| N-028 | Shared form components: CamisaMeasurementForm + PantalonMeasurementForm reutilizables | High | Done | Builder | Mismo commit que N-020; genéricos `MeasurementNumberField`/`MeasurementNotesField` + forms con prop `disabled`; 6 tests con patrón Harness verdes |
| N-021 | MeasurementTypeSelectScreen: selección camisa/pantalón con mode=create o mode=view | High | Done | Builder | Implementado en `feature/clients/n021-n025-screens` commit `6470125`; modo create navega a Create + botón "Continuar sin medidas", modo view navega a Detail; 5 tests verdes |
| N-022 | CamisaMeasurementCreateScreen: 13 campos + notas, todos opcionales, upsert al guardar | High | Done | Builder | Implementado en commit `6470125` con `CamisaMeasurementForm` + `useUpsertCamisa`; navegación a detail en éxito; 3 tests verdes |
| N-023 | PantalonMeasurementCreateScreen: 7 campos + notas, todos opcionales, upsert al guardar | High | Done | Builder | Implementado en commit `6470125` con `PantalonMeasurementForm` + `useUpsertPantalon`; patrón equivalente a N-022; 3 tests verdes |
| N-024 | CamisaMeasurementDetailScreen: vista + modo edición (lápiz) + guardar cambios inline | High | Done | Builder | Implementado en commit `6470125`; estados loading/error/empty/view/edit con retry y acciones Agregar/Editar/Guardar/Cancelar; 5 tests verdes |
| N-025 | PantalonMeasurementDetailScreen: vista + modo edición (lápiz) + guardar cambios inline | High | Done | Builder | Implementado en commit `6470125`; estados loading/error/empty/view/edit con retry y acciones Agregar/Editar/Guardar/Cancelar; 5 tests verdes |
| N-026 | Refactor ClientDetailScreen + flujo post-create: navegar a MeasurementTypeSelect | High | Done | Builder | Cierre funcional completado con N-021 en commit `6470125`; queda resuelta la deuda de navegación post-create |
| N-027 | Tests de integración E2E: flujos completos multi-módulo | High | Open | Tester | Reducido a integración únicamente; tests unitarios se escriben dentro del PR correspondiente (N-016..N-026) como criterio de salida |

| N-032 | Supabase Auth + offline sync multi-dispositivo | High | **Done** | Builder / Reviewer | Mergeado en develop 2026-05-03. Login, SecureStore, web-compat, push/pull sync v2. Tests: `useAuth.test.ts` (8) + `LoginScreen.test.tsx` (7). 134/134 verdes. |

**Track A — Arquitectura CI (independiente, arrancar ya):**

- N-006: PR quality gate automation
- N-011: Coverage signal restoration

**Track B — Clients Domain + Data (CERRADO):**

- N-016 ✓ → N-017 ✓ → N-018 ✓ → N-019 ✓ (push pendiente DNS)

**Track C — Navigation + Shared Components (CERRADO):**

- N-020 ✓ (navigation types)
- N-028 ✓ (CamisaMeasurementForm + PantalonMeasurementForm)

**Track D — Screens (paralelo entre sí, dependen de N-019 + N-020 + N-028):**

- CERRADO: N-026 ✓, N-021 ✓, N-022 ✓, N-023 ✓, N-024 ✓, N-025 ✓

**Track E — Tests distribuidos por PR + integración final:**

- Tests unitarios: incluidos en cada PR de N-016..N-026 como criterio de salida
- N-027: solo integración E2E flujos completos

| N-033 | Tests unitarios para `useAuth` y `LoginScreen` | High | **Done** | Builder / Tester | Cerrado 2026-05-03. `useAuth.test.ts` (8 casos) + `LoginScreen.test.tsx` (7 casos). Typecheck OK. |
| N-034 | Crashlytics real (Firebase SDK) reemplazando shim `console.error` | Low | Open | Builder | Shim funcional en todos los módulos; integrar al abordar N-telemetría |
| N-035 | Agregar medidas de cuello, brazo y puño a `CamisaMeasurement` | High | **Done** | Builder / Tester | Cerrado 2026-05-05. Migración v3, ALTER TABLE ADD COLUMN, dominio, form, repo, sync. Commit `57c1937` en `feature/sync/n032-supabase-transport`. |
| N-036 | CRUD completo de clientes: editar datos personales + eliminar cliente | High | **Done** | Builder / Tester | Cerrado 2026-05-05. `UpdateClientDTO` + `updateClientSchema`; `update`/`delete` en `ClientRepository` + `ClientRepositoryImpl` (referential integrity); migration v4 (`sync_delete_log`); `operationType` en sync queue; `useUpdateClient`/`useDeleteClient`; `ClientEditScreen`; botones en `ClientDetailScreen`. Deuda de deletes resuelta en N-039 (pipeline end-to-end + transporte idempotente). |
| N-037 | Iconos en barra de tabs (Clientes, Agenda, Precios) | Medium | **Done** | Builder | Cerrado 2026-05-05. Ionicons en `FeatureTabsNavigator` (`people`, `calendar`, `pricetag`). `@expo/vector-icons` instalado como dependencia directa. Mock en `__mocks__/@expo/vector-icons.js` para Jest. |
| N-038 | Grid adaptable de medidas (camisa + pantalón): vista en tarjetas, edición inline, sin nueva ruta | High | **Done** | Builder / Tester | Cerrado 2026-05-05. `MeasurementCard`, `MeasurementGridSection`, `CamisaMeasurementGrid`, `PantalonMeasurementGrid`. Grid 2-4 columnas vía `useWindowDimensions`. Edición inline en la misma pantalla. 4 screens actualizadas. 15 tests nuevos (165 total, 39 suites). Mergeado en `develop`. |
| N-039 | Completar sync multi-dispositivo para deletes (`sync_delete_log` -> cloud) | High | **Done (merged-pending-PR)** | Builder / Tester | Cerrado 2026-05-05 en commit `988bc43` (branch `feature/ui/n038-measurement-grid`, pushed a `origin/feature/ui/n038-measurement-grid`). Incluye checkpoints v5, pull incremental con cursor y delete_log, transporte idempotente de delete y wiring en `App.tsx`. PR a `develop` pendiente (incluye N-038 + N-039). |
| N-040 | `changedBy`/`changedAt` en capa de datos + corrección `updated_at` en `markAsSynced` + migración v7 (limpia tabla `measurements` obsoleta) | High | **Done** | Builder / Tester | Cerrado 2026-05-05. Auditoría en capa de datos, no en UI. Migración v7 idempotente. |
| N-041 | Bypass offline para auth cuando Supabase no configurado + badge visual de sync en lista de clientes | High | **Done** | Builder / Tester | Cerrado 2026-05-05. `isSupabaseConfigured` guard en flujo auth; badge de syncStatus en `ClientListScreen`. |
| N-042 | Ciclo de calidad: 214 tests passing, typecheck limpio, lint sin errores | High | **Done** | Tester / Reviewer | Cerrado 2026-05-05. 214 tests verdes en branch `feature/ui/n038-measurement-grid`. |
| N-043 | Robustecer sync cloud-first: evitar falso `synced` en local-only, banner sutil de estado y reintentos al recuperar red | P0 | **Next** | Architect / Builder / Tester | Riesgo activo: `NoopSyncTransport` + `markAsSynced` puede marcar `synced` sin cloud; hoy hay badge por registro pero no banner global ni trigger explícito por reconexión de red |

## Open Blockers (Prioritized)

- **High**: `schedule` y `pricing` sin implementación — bloquean MVP entregable (N-008, N-009).
- **High**: Riesgo de consistencia de sync cloud-first: posibilidad de falso `synced` en modo local-only y ausencia de trigger explícito por reconexión de red (N-043).
- **Medium**: PR pendiente `feature/ui/n038-measurement-grid` -> `develop` (incluye N-038…N-042).
- **Medium**: Señal de cobertura puede distorsionarse con features vacíos; N-011 aún sin resolver.
- **Low**: Seguimientos post-merge de N-039: semántica asimétrica de `SyncCursor.updatedAt` para `delete_log`, `Array.shift()` O(n) en `SyncMetrics`, documentación de leading coalesce en `SupabaseRealtimeInvalidationSubscriber`.
- **Low**: TODO de Crashlytics en `SyncQueueProcessor` y `App.tsx`.
- **Low**: deuda técnica `isSubmitting` en hooks de upsert durante operación async.
- **Low**: acoplamiento frágil `child.type === MeasurementCard` en `MeasurementGridSection` (N-038) — a revisar si se introduce HOC o lazy.

## Proximas Prioridades Recomendadas (2026-05-05)

1. **P0** — N-043: robustecer sync cloud-first (no falso `synced`, banner sutil global, retry al recuperar red).
2. **P0** — Abrir PR `feature/ui/n038-measurement-grid` -> `develop` (incluye N-038…N-042, 214 tests).
3. **P0** — N-008: baseline `schedule` — domain, repository, screens, tests.
4. **P0** — N-009: baseline `pricing` — domain, repository, screens, tests.
5. **P1** — N-006 + N-011: quality gates y cobertura confiable.
