# Project Context

## Snapshot

- Date: 2026-05-05
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD completo de clientes + Grid de medidas adaptable; N-035/N-036/N-037/N-038 ya mergeados en `develop`
- Branch activa: `feature/ui/n038-measurement-grid` (mergeada en `develop`; pendiente cleanup local)
- Último ciclo cerrado: N-038 mergeado en `develop` (39 suites, 165 tests ✅)

## Current Focus

- **N-035 cerrado** (2026-05-05): cuello, brazo, puño en camisa — migración v3, dominio, form, repo, sync. Commit `57c1937`.
- **N-036 cerrado** (2026-05-05): CRUD completo de clientes — `UpdateClientDTO`, `updateClientSchema`, `update`/`delete` en repo + impl, migration v4 (`sync_delete_log`), `operationType` en sync queue, hooks `useUpdateClient`/`useDeleteClient`, `ClientEditScreen`, botones en `ClientDetailScreen`. Deuda conocida: operaciones `delete` en `sync_delete_log` aún no son procesadas por `SyncQueueProcessor`.
- **N-037 cerrado** (2026-05-05): Iconos Ionicons en barra de tabs (`people`, `calendar`, `pricetag`). `@expo/vector-icons` como dependencia directa; mock en `__mocks__/@expo/vector-icons.js`.
- **N-038 cerrado** (2026-05-05): Grid adaptable de medidas — `MeasurementCard`, `MeasurementGridSection`, `CamisaMeasurementGrid`, `PantalonMeasurementGrid`. Grid 2-4 columnas vía `useWindowDimensions`. Edición inline en la misma pantalla. 4 screens actualizadas. 15 tests nuevos (165 total, 39 suites). Typecheck OK, pre-push OK. Mergeado en `develop`.
- **N-039 activo** (2026-05-05): completar sync multi-dispositivo para deletes, conectando `sync_delete_log` con el pipeline de `SyncQueueProcessor` y transporte cloud.
- **Próximo P0**: Ejecutar N-039 antes de baseline de `schedule` y `pricing` (N-008, N-009) para evitar drift entre dispositivos.
- `schedule` y `pricing` siguen con solo `PlaceholderScreen` (N-008, N-009) — permanecen en P0 inmediatamente después de N-039.

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/measurements), forms, grids de medidas adaptables, DI |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.                                   |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                                                |
| `src/features/pricing`  | Solo `PricingPlaceholderScreen` + test                                                                                 |
| `src/data/local`        | Completo: migrations v1–v4, ClientRepositoryImpl (update/delete), MeasurementRepositoryImpl + tests                    |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`                                         |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`                                 |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator (con Ionicons), ClientsStackNavigator (ClientEdit route)    |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                                                            |

## Risks / Blockers

- **High**: `schedule` y `pricing` sin implementación real — MVP incompleto (N-008, N-009).
- **Medium**: `sync_delete_log` no está conectado a `SyncQueueProcessor` — operaciones delete no se sincronizan al cloud (deuda conocida de N-036).
- **Medium**: Coverage signal puede distorsionarse con features vacíos (N-011).
- **Low**: Crashlytics no integrado; shim `console.error` temporal (N-034).
- **Low**: deuda técnica `isSubmitting` en hooks de upsert async.
- **Low**: acoplamiento frágil por referencia de componente (`child.type === MeasurementCard`) en `MeasurementGridSection` — documentado para revisión si se introduce HOC o lazy loading (N-038).

## Next Session Steps (Max 3)

1. **P0 — N-039**: Conectar `sync_delete_log` con `SyncQueueProcessor` + transporte cloud de deletes.
2. **P0 — N-008**: Implementar baseline de `schedule` — domain, repository, screens, tests.
3. **P0 — N-009**: Implementar baseline de `pricing` — domain, repository, screens, tests.
