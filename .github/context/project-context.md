# Project Context

## Snapshot

- Date: 2026-05-05
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD completo de clientes + Grid de medidas adaptable + sync multi-dispositivo de deletes completado en branch; PR a `develop` pendiente
- Branch activa: `feature/ui/n038-measurement-grid` (commit `988bc43`, pushed a `origin/feature/ui/n038-measurement-grid`, PR pendiente a `develop`)
- Último ciclo cerrado: N-040/N-041/N-042 completados (214 tests, typecheck limpio ✅)

## Current Focus

- **N-035 cerrado** (2026-05-05): cuello, brazo, puño en camisa — migración v3, dominio, form, repo, sync. Commit `57c1937`.
- **N-036 cerrado** (2026-05-05): CRUD completo de clientes — `UpdateClientDTO`, `updateClientSchema`, `update`/`delete` en repo + impl, migration v4 (`sync_delete_log`), `operationType` en sync queue, hooks `useUpdateClient`/`useDeleteClient`, `ClientEditScreen`, botones en `ClientDetailScreen`. La deuda de deletes quedó resuelta en N-039.
- **N-037 cerrado** (2026-05-05): Iconos Ionicons en barra de tabs (`people`, `calendar`, `pricetag`). `@expo/vector-icons` como dependencia directa; mock en `__mocks__/@expo/vector-icons.js`.
- **N-038 cerrado** (2026-05-05): Grid adaptable de medidas — `MeasurementCard`, `MeasurementGridSection`, `CamisaMeasurementGrid`, `PantalonMeasurementGrid`. Grid 2-4 columnas vía `useWindowDimensions`. Edición inline en la misma pantalla. 4 screens actualizadas. 15 tests nuevos (165 total, 39 suites). Typecheck OK, pre-push OK. Mergeado en `develop`.
- **N-039 cerrado** (2026-05-05): sync multi-dispositivo para deletes completado — `SyncCheckpointRepository` (cursor monotónico por scope + migración v5), `SupabaseRealtimeInvalidationSubscriber` (`postgres_changes` en 4 tablas + debounce 400ms), `SyncLifecycleController` (foreground trigger con `AppState`), `SyncMetrics` (p50/p95 + `meetsLatencySlo()`), `SupabasePullSync` incremental con cursor por entidad + `delete_log`, `SyncQueueRepository` conectado a `sync_delete_log`, `SyncQueueProcessor` ruteando `delete_log`, `SupabaseSyncTransport.syncDeleteLogEntry` idempotente, `SyncOrchestrator.requestRun(source)`, wiring en `App.tsx` con cleanup.
- **Estado de integración**: N-040/N-041/N-042 completados en branch `feature/ui/n038-measurement-grid`; 214 tests passing, typecheck limpio. PR a `develop` pendiente de apertura.
- `schedule` y `pricing` siguen con solo `PlaceholderScreen` (N-008, N-009) — **son el siguiente P0**.
- **N-040 cerrado** (2026-05-05): `changedBy`/`changedAt` añadidos en capa de datos (no en UI); corrección de `updated_at` en `markAsSynced`; migración v7 para limpiar tabla `measurements` obsoleta.
- **N-041 cerrado** (2026-05-05): bypass offline para auth cuando Supabase no está configurado; badge visual de sync en lista de clientes.
- **N-042 cerrado** (2026-05-05): ciclo de calidad — 214 tests passing, typecheck limpio, lint sin errores.
- **N-043 identificado** (2026-05-06): robustecer sync cloud-first para evitar falso `synced` en local-only, añadir banner sutil de estado de sync y garantizar reintentos al recuperar red.

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/measurements), forms, grids de medidas adaptables, DI                                                    |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.                                                                                      |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                                                                                                   |
| `src/features/pricing`  | Solo `PricingPlaceholderScreen` + test                                                                                                                                    |
| `src/data/local`        | Completo: migrations v1–v7 (v6 `changedBy`/`changedAt`, v7 limpia tabla `measurements` obsoleta), ClientRepositoryImpl (update/delete), MeasurementRepositoryImpl + tests |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`                                                                                            |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`                                                                                    |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator (con Ionicons), ClientsStackNavigator (ClientEdit route)                                                       |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                                                                                                               |

## Risks / Blockers

- **High**: `schedule` y `pricing` sin implementación real — MVP incompleto (N-008, N-009).
- **High**: riesgo de falso `synced` cuando Supabase no está configurado (`NoopSyncTransport` retorna éxito) y falta trigger explícito en reconexión de red para reintentos inmediatos (N-043).
- **Medium**: PR pendiente `feature/ui/n038-measurement-grid` -> `develop` (incluye N-038 a N-042).
- **Medium**: Coverage signal puede distorsionarse con features vacíos (N-011).
- **Low**: Crashlytics no integrado; shim `console.error` temporal (N-034).
- **Low**: Semántica asimétrica de `SyncCursor.updatedAt` para scope `delete_log` (seguimiento post-merge).
- **Low**: `Array.shift()` O(n) en `SyncMetrics` (seguimiento de performance post-merge).
- **Low**: Documentar comportamiento de leading coalesce en `SupabaseRealtimeInvalidationSubscriber`.
- **Low**: deuda técnica `isSubmitting` en hooks de upsert async.
- **Low**: acoplamiento frágil por referencia de componente (`child.type === MeasurementCard`) en `MeasurementGridSection` — documentado para revisión si se introduce HOC o lazy loading (N-038).
- **Low**: TODO de integración Crashlytics en `SyncQueueProcessor` y `App.tsx`.

## Next Session Steps (Max 3)

1. **P0 — N-043**: Ajustar política cloud-first de sync (sin falso `synced` en local-only), agregar banner sutil global de estado y trigger de reintento por reconexión.
2. **P0 — PR N-038…N-042**: Abrir PR `feature/ui/n038-measurement-grid` -> `develop`.
3. **P0 — N-008**: Implementar baseline de `schedule` — domain, repository, screens, tests.

## Confirmed Facts (post N-040/N-041/N-042)

- **Hechos confirmados**: N-040/N-041/N-042 cerrados; 214 tests passing; migración v7 ejecutada; badge de sync activo en lista; bypass offline para auth cuando Supabase no configurado; `updated_at` corregido en `markAsSynced`; `changedBy`/`changedAt` en capa de datos.
- `schedule` y `pricing` permanecen en placeholder; N-008 y N-009 son el siguiente P0 sin bloqueadores técnicos.
