# Project Context

## Snapshot

- Date: 2026-05-03
- Project: sastreria (React Native + Expo)
- Stage: MVP con Auth + Sync cloud completo mergeado en develop
- Branch activa: `develop`
- Último merge: `feature/sync/n032-supabase-transport` → `develop` (N-032 + N-033, 134/134 tests)

## Current Focus

- **N-032 + N-033 mergeados en develop** (2026-05-03). Auth + sync v2 completos.
- **Nuevas necesidades de negocio reportadas** (2026-05-03) — toman prioridad sobre N-008/N-009:
  - **N-035**: 3 medidas nuevas en camisa (cuello, brazo, puño) — migró a SQLite v3 + dominio + form + repo + sync.
  - **N-036**: CRUD completo de clientes (editar datos + eliminar) — falta `update`/`delete` en repositorio + pantalla de edición.
  - **N-037**: Iconos en barra de tabs (Clientes, Agenda, Precios) — cambio puntual en `FeatureTabsNavigator`.
- `schedule` y `pricing` siguen con solo `PlaceholderScreen` (N-008, N-009) — pasan a P1 tras cerrar N-035/N-036.

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/measurements), forms, DI |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.      |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                   |
| `src/features/pricing`  | Solo `PricingPlaceholderScreen` + test                                                    |
| `src/data/local`        | Completo: migrations v1+v2, ClientRepositoryImpl, MeasurementRepositoryImpl + tests       |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`            |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`    |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator, ClientsStackNavigator         |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                               |

## Risks / Blockers

- **High**: Medidas de camisa incompletas (cuello, brazo, puño) — reporte activo de negocio (N-035). Impacta migró SQLite, dominio, form, repo y sync Supabase.
- **High**: CRUD de clientes incompleto — editar y eliminar no disponibles (N-036).
- **Medium**: `schedule` y `pricing` sin implementación real — MVP incompleto (N-008, N-009).
- **Medium**: Coverage signal puede distorsionarse con features vacíos (N-011).
- **Low**: Crashlytics no integrado; shim `console.error` temporal (N-034).
- **Low**: deuda técnica `isSubmitting` en hooks de upsert async.

## Next Session Steps (Max 3)

1. **P0 — N-035**: Agregar cuello, brazo y puño a `CamisaMeasurement` — migró v3 + dominio + form + repo + sync.
2. **P0 — N-036**: Editar y eliminar cliente — `ClientEditScreen` + `update`/`delete` en `ClientRepository` + confirmación de borrado.
3. **P1 — N-037**: Iconos en barra de tabs (Ionicons ya instalado).
