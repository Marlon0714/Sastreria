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
| N-021 | MeasurementTypeSelectScreen: selección camisa/pantalón con mode=create o mode=view | High | Open | Builder | N-019 cerrado; **desbloqueado completamente**. PlaceholderScreen ya en navigator; implementar lógica real + botón "Continuar sin medidas" en mode=create; cerrar deuda post-create de N-026 aquí |
| N-022 | CamisaMeasurementCreateScreen: 13 campos + notas, todos opcionales, upsert al guardar | High | Open | Builder | **Desbloqueado** (N-019 done). PlaceholderScreen ya en navigator. Campos vacíos → null; hook `useUpsertCamisa` disponible; navegación a CamisaMeasurementDetail en éxito |
| N-023 | PantalonMeasurementCreateScreen: 7 campos + notas, todos opcionales, upsert al guardar | High | Open | Builder | **Desbloqueado** (N-019 done). PlaceholderScreen ya en navigator. Hook `useUpsertPantalon` disponible; mismo patrón que N-022 |
| N-024 | CamisaMeasurementDetailScreen: vista + modo edición (lápiz) + guardar cambios inline | High | Open | Builder | **Desbloqueado** (N-019 done). PlaceholderScreen ya en navigator. Hook `useCamisaMeasurement` disponible; sin historial de cambios |
| N-025 | PantalonMeasurementDetailScreen: vista + modo edición (lápiz) + guardar cambios inline | High | Open | Builder | **Desbloqueado** (N-019 done). PlaceholderScreen ya en navigator. Hook `usePantalonMeasurement` disponible; mismo patrón que N-024 |
| N-026 | Refactor ClientDetailScreen + flujo post-create: navegar a MeasurementTypeSelect | High | Done (parcial) | Builder | Pushed `fix/clients/n026-detail-screen-bugs` commit `b90ee95`; bugs P0 resueltos (DI vía `useClientDetail` + hide `syncStatus`); migración a `MeasurementTypeSelect` queda diferida hasta N-021..N-025 |
| N-027 | Tests de integración E2E: flujos completos multi-módulo | High | Open | Tester | Reducido a integración únicamente; tests unitarios se escriben dentro del PR correspondiente (N-016..N-026) como criterio de salida |

## Sprint Actual — Tracks Paralelos

**Track A — Arquitectura CI (independiente, arrancar ya):**

- N-006: PR quality gate automation
- N-011: Coverage signal restoration

**Track B — Clients Domain + Data (CERRADO):**

- N-016 ✓ → N-017 ✓ → N-018 ✓ → N-019 ✓ (push pendiente DNS)

**Track C — Navigation + Shared Components (CERRADO):**

- N-020 ✓ (navigation types)
- N-028 ✓ (CamisaMeasurementForm + PantalonMeasurementForm)

**Track D — Screens (paralelo entre sí, dependen de N-019 + N-020 + N-028):**

- N-026 (P0: fix bugs activos en ClientDetailScreen)
- N-021, N-022, N-023, N-024, N-025

**Track E — Tests distribuidos por PR + integración final:**

- Tests unitarios: incluidos en cada PR de N-016..N-026 como criterio de salida
- N-027: solo integración E2E flujos completos

## Open Blockers (Prioritized)

- High: Push de `feature/clients/n017-n019-data-layer` a remote bloqueado por DNS; merge a develop pendiente de reintento manual.
- Medium: verificacion de post-rotacion pendiente (evidencia y checklist de secretos actualizados).
- Medium: senal de cobertura no confiable (0/0), puede bloquear decision de release.
- Low: deuda técnica `isSubmitting` durante operación async en hooks de upsert; registrada para sprint futuro.
- Low: deuda parcial N-026 (navegación post-create a `MeasurementTypeSelect`) se cierra en N-021.
