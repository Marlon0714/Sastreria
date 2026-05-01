# Project Context

## Snapshot

- Date: 2026-04-30
- Project: sastreria (React Native + Expo)
- Stage: MVP with CI/CD setup in progress
- Branch: develop
- Session Close: N-016, N-020/N-028 y N-026 asumidas como mergeadas en develop; verificacion rapida de artefactos en codigo confirmada

## Current Focus

- Sprint activo: ejecutar Track B data layer (N-017 → N-018 → N-019) como ruta critica y arrancar Track D screens (N-021..N-025) por fases tras cerrar N-019.
- Paralelo: estabilizar calidad CI (N-006 quality gates, N-011 coverage signal).
- Domain model de medidas (camisa/pantalón) ya separado y validado; navegación y form components compartidos listos.

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

- High: N-019 sigue abierto y bloquea arranque efectivo de N-021..N-025 porque aun conviven hooks/pantallas legacy (`useAddMeasurement`, `useClientMeasurementHistory`, `MeasurementCreateScreen`, `MeasurementHistoryScreen`).
- Medium: Confirm no stale local/CI references to token previo y completar evidencia de rotacion.
- Medium: Pricing and schedule features still lack implementation files; placeholders prevent crashes but not product completeness.
- Medium: Coverage signal remains weak (`Unknown% (0/0)`), so release confidence is limited.
- Low: Crashlytics integration is still pending; structured `console.error` is a temporary shim.
- Low (deuda parcial N-026): la migracion de navegacion post-create hacia `MeasurementTypeSelect` se difirio; debe abordarse junto con N-021.

## Next Session Steps (Max 3)

1. **P0 — N-017 → N-018 → N-019** (Track B data layer): migracion SQLite v2 (tablas camisa/pantalon con UNIQUE por client_id), repositorio con upsert por prenda, hooks nuevos y eliminacion de hooks/screens legacy en el mismo ciclo.
2. **P1 por fases — N-021..N-025** (Track D screens): iniciar con N-021 y luego create/detail por prenda cuando N-019 quede mergeado; reusar forms N-028 y cerrar deuda de navegacion N-026.
3. **P1 paralelo de calidad**: avanzar N-006 (quality gate PR) y N-011 (coverage confiable) para no acumular riesgo de release al final.
