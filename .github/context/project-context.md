# Project Context

## Snapshot

- Date: 2026-05-05
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD completo de clientes; ciclo N-035/N-036/N-037 completo
- Branch activa: `feature/sync/n032-supabase-transport` (pendiente PR → develop)
- Último ciclo cerrado: N-035 + N-036 + N-037 en `feature/sync/n032-supabase-transport` (35 suites, 149 tests ✅)

## Current Focus

- **N-035 cerrado** (2026-05-05): cuello, brazo, puño en camisa — migración v3, dominio, form, repo, sync. Commit `57c1937`.
- **N-036 cerrado** (2026-05-05): CRUD completo de clientes — `UpdateClientDTO`, `updateClientSchema`, `update`/`delete` en repo + impl, migration v4 (`sync_delete_log`), `operationType` en sync queue, hooks `useUpdateClient`/`useDeleteClient`, `ClientEditScreen`, botones en `ClientDetailScreen`. Deuda conocida: operaciones `delete` en `sync_delete_log` aún no son procesadas por `SyncQueueProcessor`.
- **N-037 cerrado** (2026-05-05): Iconos Ionicons en barra de tabs (`people`, `calendar`, `pricetag`). `@expo/vector-icons` como dependencia directa; mock en `__mocks__/@expo/vector-icons.js`.
- **Próximo P0**: PR `feature/sync/n032-supabase-transport` → `develop` con N-035 + N-036 + N-037.
- `schedule` y `pricing` siguen con solo `PlaceholderScreen` (N-008, N-009) — son la siguiente prioridad tras el merge.

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/measurements), forms, DI                           |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.                                |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                                             |
| `src/features/pricing`  | Solo `PricingPlaceholderScreen` + test                                                                              |
| `src/data/local`        | Completo: migrations v1–v4, ClientRepositoryImpl (update/delete), MeasurementRepositoryImpl + tests                 |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`                                      |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`                              |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator (con Ionicons), ClientsStackNavigator (ClientEdit route) |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                                                         |

## Risks / Blockers

- **High**: PR `feature/sync/n032-supabase-transport` → `develop` pendiente — N-035/N-036/N-037 no están en develop todavía.
- **High**: `schedule` y `pricing` sin implementación real — MVP incompleto (N-008, N-009).
- **Medium**: `sync_delete_log` no está conectado a `SyncQueueProcessor` — operaciones delete no se sincronizan al cloud (deuda conocida de N-036).
- **Medium**: Coverage signal puede distorsionarse con features vacíos (N-011).
- **Low**: Crashlytics no integrado; shim `console.error` temporal (N-034).
- **Low**: deuda técnica `isSubmitting` en hooks de upsert async.

## Next Session Steps (Max 3)

1. **P0 — PR merge**: Abrir y mergear PR `feature/sync/n032-supabase-transport` → `develop` con N-035 + N-036 + N-037 (35 suites, 149 tests, typecheck limpio).
2. **P1 — N-008**: Implementar baseline de `schedule` — domain, repository, screens, tests.
3. **P1 — N-009**: Implementar baseline de `pricing` — domain, repository, screens, tests.
