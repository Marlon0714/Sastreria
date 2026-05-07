# Project Context

## Snapshot

- Date: 2026-05-06
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD clientes + Grid medidas + pricing domain/repo/migración completos y testeados; rama `fix/sync-validation-and-delete` lista para merge a develop
- Branch activa: `fix/sync-validation-and-delete` (ciclo de sync/delete cerrado y validado, 282 tests verdes)
- Último ciclo cerrado: N-009 (pricing domain, repo, migración, tests, revisión) y fix de sync/delete propagado a cloud

## Current Focus

- **N-009 cerrado** (2026-05-06): Dominio, repositorio y migración de pricing implementados, validados y auditados. Tests unitarios y revisión aprobada con observaciones menores. Siguiente: UI y navegación.
- `schedule` sigue como P0 pendiente.

## Tech Stack

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

1. **P0 — N-043**: Robustecer sync cloud-first (sin falso `synced` en local-only), banner global de estado y trigger de reintento por reconexión. Validación de cierre en rama `fix/sync-validation-and-delete` (ver plan n043-robust-sync-cloud-first.md).
2. **P0 — N-008**: Implementar baseline de `schedule` (domain, repository, screens, tests).
3. **P0 — N-009**: Completar UI y navegación de pricing (el dominio/repositorio ya están cerrados).

## Confirmed Facts (post N-040/N-041/N-042)

- **Hechos confirmados**: N-040/N-041/N-042 cerrados; 214 tests passing; migración v7 ejecutada; badge de sync activo en lista; bypass offline para auth cuando Supabase no configurado; `updated_at` corregido en `markAsSynced`; `changedBy`/`changedAt` en capa de datos.
- `schedule` y `pricing` permanecen en placeholder; N-008 y N-009 son el siguiente P0 sin bloqueadores técnicos.
