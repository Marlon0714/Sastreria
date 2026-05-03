# Project Context

## Snapshot

- Date: 2026-05-01
- Project: sastreria (React Native + Expo)
- Stage: MVP with CI/CD setup in progress
- Branch: feature/clients/n021-n025-screens (commit local `6470125`, push pendiente por DNS)
- Session Close: N-021..N-025 completados y validados; Track D cerrado; 29 suites / 106 tests verde; push pendiente por DNS

## Current Focus

- Sprint activo: Track B data layer cerrado + Track C navigation/forms cerrado + Track D screens cerrado.
- Prioridad siguiente: baseline funcional de schedule/pricing (N-008, N-009) o endurecimiento de calidad CI (N-006, N-011).
- Domain model, navegación, forms compartidos, capa de datos (upsert) y screens de medidas ya listos para flujo create/view completo.

## Tech Stack

- Expo SDK 54
- React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form, Zod
- Expo SQLite (offline-first)
- EAS Build + GitHub Actions

## Delivery Status

- N-010: Merged in develop. `src/data/sync` contains orchestrator, processor, repository, transport contract and tests.
- N-013: Merged in develop. Root navigation uses feature tabs + dedicated stacks with placeholders for schedule/pricing.
- N-014: Merged in develop. Hooks no longer couple directly to data/local repositories.
- N-016: Integrado en develop (refactor de dominio de medidas). `CamisaMeasurement`/`PantalonMeasurement` + DTOs/schemas activos; modelo legado sigue deprecado hasta cleanup N-019.
- N-020: Integrado en develop (navigation types + rutas nuevas). `MeasurementTypeSelect` y rutas de camisa/pantalon ya tipadas; rutas legacy aun presentes como `@deprecated`.
- N-026: Integrado en develop (fixes P0 en detalle cliente). `ClientDetailScreen` usa `useClientDetail` + `ClientsDependenciesProvider`; deuda de migracion post-create a `MeasurementTypeSelect` cerrada en N-021.
- N-028: Integrado en develop (forms compartidos). `CamisaMeasurementForm`/`PantalonMeasurementForm` y fields genericos disponibles con soporte `disabled`.
- N-021..N-025: Implementados en `feature/clients/n021-n025-screens` (commit `6470125`): selector de tipo por modo, create/detail de camisa y pantalón con tests por pantalla; `ClientsStackNavigator` reemplaza placeholders por pantallas reales.
- Validación: `npm run typecheck` OK; `npm run test:ci` 29 suites / 106 tests verde; hook pre-commit OK.

## Risks / Blockers

- High: Push de `feature/clients/n021-n025-screens` pendiente por fallo de DNS; merge a develop bloqueado hasta que se resuelva conectividad.
- Medium: Confirm no stale local/CI references to token previo y completar evidencia de rotacion.
- Medium: Pricing and schedule features still lack implementation files; placeholders prevent crashes but not product completeness.
- Medium: Coverage signal remains weak (`Unknown% (0/0)`), so release confidence is limited.
- Low: Crashlytics integration is still pending; structured `console.error` is a temporary shim.
- Low: deuda técnica `isSubmitting` durante operación async en hooks de upsert; registrada para sprint futuro.

## N-032 — Supabase Auth/Sync (CERRADO 2026-05-02)

- Login seguro con Supabase Auth (correo/clave), sesión persistente en SecureStore (móvil) o localStorage (web).
- Sync offline-first para clientes y medidas v2 (camisa/pantalón).
- Fix web-compat: `secureSessionStorage` detecta `Platform.OS === "web"` y usa localStorage/memoria.
- Typecheck OK. 110/111 tests OK (test de tabs pendiente por nuevo flujo de login, abordado en sprint siguiente).
- Rama: `feature/sync/n032-supabase-transport`.

## Next Session Steps (Max 3)

1. **P0 — Push + merge `feature/clients/n021-n025-screens`** a `develop` en cuanto se resuelva DNS; validar CI verde post-merge.
2. **P1 — Iniciar baseline funcional de `schedule` y `pricing`** (N-008 y N-009) con dominio + repositorio + screens mínimas y tests base.
3. **P1 paralelo de calidad**: avanzar N-006 (quality gate PR) y N-011 (coverage confiable) para no acumular riesgo de release al final.
