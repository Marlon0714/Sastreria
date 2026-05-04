# Needs Backlog

| ID    | Need                                                                                   | Priority | Status      | Owner Agent         | Notes                                                                                               |
| ----- | -------------------------------------------------------------------------------------- | -------- | ----------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| N-001 | Confirm stable APK CI flow with EAS                                                    | High     | In Progress | Release / Debugger  | Waiting for successful run validation                                                               |
| N-002 | Keep project context persistent across sessions                                        | High     | Done        | ContextKeeper       | Context files and agent created                                                                     |
| N-003 | Define practical agent lifecycle usage                                                 | Medium   | Done        | Orchestrator        | Flow documented and ready                                                                           |
| N-004 | Improve local dev reliability (Android/Expo)                                           | Medium   | Open        | Debugger            | Pending focused diagnosis pass                                                                      |
| N-005 | Harden release checklist before production                                             | Medium   | Open        | Release / Reviewer  | Add stricter quality gates                                                                          |
| N-006 | Add PR quality gate automation (lint/test/build)                                       | High     | Open        | Release / Reviewer  | Block merge when minimum checks fail                                                                |
| N-007 | Define project-wide Definition of Done per PR                                          | Medium   | Open        | ContextKeeper       | Standardize exit criteria for all work                                                              |
| N-008 | Implement schedule feature baseline (domain, repository, screens, tests)               | High     | Open        | Builder / Tester    | Feature folder exists but no source files                                                           |
| N-009 | Implement pricing feature baseline (domain, repository, screens, tests)                | High     | Open        | Builder / Tester    | Feature folder exists but no source files                                                           |
| N-010 | Implement sync queue in `src/data/sync` aligned to offline-first contract              | High     | Done        | Architect / Builder | Implementado y mergeado en develop; fase base y correcciones reviewer completadas                   |
| N-011 | Restore trustworthy coverage signal in CI (non-empty coverage and thresholds enforced) | Medium   | Open        | Release / Reviewer  | Current coverage report shows `0/0 Unknown%`                                                        |
| N-012 | Automate branch verification in daily standup flow                                     | Low      | Open        | ContextKeeper       | Use `.git/HEAD` check to avoid stale session metadata                                               |
| N-013 | Refactor root navigation to feature-based composition (tabs + stacks)                  | High     | Done        | Architect / Builder | Implementado y mergeado en develop; tabs+stacks activos con placeholders controlados                |
| N-014 | Introduce repository composition layer for hook dependency decoupling                  | High     | Done        | Architect / Builder | Corrective subcycle cerrado y mergeado en develop; hooks desacoplados de implementaciones concretas |
| N-015 | Rotar y verificar secretos de CI (EXPO_TOKEN)                                          | High     | Done        | Release / Security  | Rotacion realizada por el equipo; mantener evidencia y checklist de verificacion post-rotacion      |

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

| N-032 | Supabase Auth + offline sync multi-dispositivo | High | **Done** | Builder / Reviewer | Cerrado 2026-05-03 sin deuda. Login, SecureStore, web-compat, push/pull sync v2. Tests: `useAuth.test.ts` (8 casos) + `LoginScreen.test.tsx` (7 casos). Typecheck OK. Pendiente: merge PR a develop. |

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

## Open Blockers (Prioritized)

- **High**: PR de N-032 pendiente de apertura — rama `feature/sync/n032-supabase-transport` lista con tests; merge a develop bloqueado hasta CI verde.
- **Medium**: `schedule` y `pricing` sin implementación — el producto no es MVP sin ellos.
- **Medium**: Señal de cobertura puede distorsionarse con features vacíos; N-011 aún sin resolver.
- **Low**: deuda técnica `isSubmitting` en hooks de upsert durante operación async.

## Proximas Prioridades Recomendadas (2026-05-03)

1. **P0** — Abrir PR y mergear N-032 a develop.
2. **P1** — N-008: baseline `schedule` (domain + repository + screen + tests).
3. **P1** — N-009: baseline `pricing` (domain + repository + screen + tests) — puede ejecutarse en paralelo con N-008.
4. **P2** — N-006 + N-011: quality gates y cobertura confiable antes de la siguiente release candidate.
