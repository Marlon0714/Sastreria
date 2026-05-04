# Project Context

## Snapshot

- Date: 2026-05-03
- Project: sastreria (React Native + Expo)
- Stage: MVP con Auth + Sync cloud activo; rama N-032 en proceso de PR/merge a develop
- Branch activa: `feature/sync/n032-supabase-transport`
- Branch default: `develop`

## Current Focus

- **N-032 CERRADO** (2026-05-03): Supabase Auth + sync v2 completamente cerrado sin deuda.
  - Login con Supabase Auth, sesión en SecureStore (móvil) / localStorage (web).
  - Sync push/pull v2 para clientes, camisa_measurements y pantalon_measurements.
  - `RootNavigator` auth-guard via `useAuth`; `SupabasePullSync` al login.
  - **Tests escritos**: `useAuth.test.ts` (8 casos) + `LoginScreen.test.tsx` (7 casos). Typecheck OK.
- Todo el flujo de clients está completo: domain, data, navigation, forms, screens, sync cloud.
- `schedule` y `pricing` siguen con solo `PlaceholderScreen` — sin domain, repository ni screens reales.

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
| `src/features/auth`     | Funcional: `useAuth.ts` + `LoginScreen.tsx` — sin tests unitarios                         |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                   |
| `src/features/pricing`  | Solo `PricingPlaceholderScreen` + test                                                    |
| `src/data/local`        | Completo: migrations v1+v2, ClientRepositoryImpl, MeasurementRepositoryImpl + tests       |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`            |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`    |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator, ClientsStackNavigator         |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                               |

## Risks / Blockers

- **High**: N-032 aún no mergeado a develop (branch `feature/sync/n032-supabase-transport` activa). Completar PR y merge es la P0.
- **Medium**: `useAuth` y `LoginScreen` sin tests — cobertura de auth = 0%.
- **Medium**: `schedule` y `pricing` sin implementación real — el MVP no es entregable sin ellos.
- **Medium**: Coverage signal débil (umbral 70% activo pero `schedule`/`pricing` sin código, lo que puede distorsionar).
- **Low**: Crashlytics no integrado; `console.error` JSON es shim temporal.
- **Low**: deuda técnica `isSubmitting` en hooks de upsert durante operación async.

## Next Session Steps (Max 3)

1. **P0 — Mergear N-032 a develop**: crear PR de `feature/sync/n032-supabase-transport` → `develop`, resolver los tests de `useAuth` + `LoginScreen` antes del merge.
2. **P1 — Baseline de `schedule`** (N-008): domain + repository interface + screen mínima + tests base.
3. **P1 paralelo — Baseline de `pricing`** (N-009): misma estructura que N-008, puede ejecutarse en paralelo.
