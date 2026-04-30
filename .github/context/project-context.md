# Project Context

## Snapshot

- Date: 2026-04-30
- Project: sastreria (React Native + Expo)
- Stage: MVP with CI/CD setup in progress
- Branch: develop
- Session Close: N-010, N-013 y N-014 mergeadas en develop; token rotado

## Current Focus

- Sprint activo: pulir módulo de clientes con flujo completo de medidas camisa/pantalón (N-016 a N-027).
- Paralelo: estabilizar calidad CI (N-006 quality gates, N-011 coverage signal).
- Clients domain model precisa refactorización profunda antes de construir pantallas.

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

## Risks / Blockers

- Medium: Confirm no stale local/CI references to token previo y completar evidencia de rotacion.
- Medium: Pricing and schedule features still lack implementation files; placeholders prevent crashes but not product completeness.
- Medium: Coverage signal remains weak (`Unknown% (0/0)`), so release confidence is limited.
- Low: Crashlytics integration is still pending; structured `console.error` is a temporary shim.

## Next Session Steps (Max 3)

1. **P0 — N-016 + N-026 en paralelo**: refactor del modelo de dominio y fix inmediato de los 2 bugs activos en `ClientDetailScreen` (syncStatus visible en UI + DI violado). Son independientes entre sí y ambos son P0.
2. **P0/P1 — N-017 → N-018 → N-019**: migración SQLite v2, repositorio con upsert, y hooks nuevos eliminando los obsoletos en el mismo PR.
3. **P1 paralelo — N-020 + N-028**: navigation types con nuevas rutas + componentes de formulario compartidos (`CamisaMeasurementForm`, `PantalonMeasurementForm`). Desbloquean todas las pantallas de Track D.
