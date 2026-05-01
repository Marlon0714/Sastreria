# Project Context

## Snapshot

- Date: 2026-04-30
- Project: sastreria (React Native + Expo)
- Stage: MVP with CI/CD setup in progress
- Branch: develop (feature/clients/n017-n019-data-layer pendiente de push/merge por DNS)
- Session Close: N-017, N-018 y N-019 completados y validados; 25 suites / 88 tests verde; push pendiente por DNS

## Current Focus

- Sprint activo: Track B data layer cerrado. Arrancar Track D screens (N-021..N-025) — completamente desbloqueados.
- Paralelo: estabilizar calidad CI (N-006 quality gates, N-011 coverage signal).
- Domain model, navegación, forms compartidos y capa de datos (upsert) listos; no hay dependencias pendientes para N-021..N-025.

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
- N-026: Integrado en develop (fixes P0 en detalle cliente). `ClientDetailScreen` usa `useClientDetail` + `ClientsDependenciesProvider`; deuda de migracion post-create a `MeasurementTypeSelect` permanece acoplada a N-021.
- N-028: Integrado en develop (forms compartidos). `CamisaMeasurementForm`/`PantalonMeasurementForm` y fields genericos disponibles con soporte `disabled`.
- Validación: `npm run typecheck` OK en las 3 ramas; `npm run test:ci` 22 suites / 79 tests verde.

## Risks / Blockers

- High: Push de `feature/clients/n017-n019-data-layer` pendiente por fallo de DNS; merge a develop bloqueado hasta que se resuelva conectividad.
- Medium: Confirm no stale local/CI references to token previo y completar evidencia de rotacion.
- Medium: Pricing and schedule features still lack implementation files; placeholders prevent crashes but not product completeness.
- Medium: Coverage signal remains weak (`Unknown% (0/0)`), so release confidence is limited.
- Low: Crashlytics integration is still pending; structured `console.error` is a temporary shim.
- Low: deuda técnica `isSubmitting` durante operación async en hooks de upsert; registrada para sprint futuro.
- Low (deuda parcial N-026): la migracion de navegacion post-create hacia `MeasurementTypeSelect` se cierra junto con N-021.

## Next Session Steps (Max 3)

1. **P0 — Push + merge `feature/clients/n017-n019-data-layer`** a `develop` en cuanto se resuelva DNS; validar CI verde post-merge.
2. **P1 por fases — N-021..N-025** (Track D screens): iniciar con N-021 (`MeasurementTypeSelectScreen` completa) y luego N-022/N-023 (Create) y N-024/N-025 (Detail); reusar forms N-028 y cerrar deuda de navegacion N-026 en N-021.
3. **P1 paralelo de calidad**: avanzar N-006 (quality gate PR) y N-011 (coverage confiable) para no acumular riesgo de release al final.
