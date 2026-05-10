# Project Context

## Snapshot

- Date: 2026-05-09
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD clientes + Grid medidas + pricing UI completo (screens, hooks, components, navigation, tests); rama `feat/log-viewer-pin` activa, 309 tests verdes, 0 typecheck errors.
- Branch activa: `feat/log-viewer-pin` (último commit `7be385e`, 28 archivos cambiados, 1237 inserciones, 309 tests verdes)
- Último ciclo cerrado: N-009 completamente cerrado (domain, repo, migración, UI, hooks, components, navigation, tests)

## Current Focus

- **N-009 completamente cerrado** (2026-05-09): Módulo pricing UI completo — screens (List, Detail, Form), hooks (usePricingList, usePricingDetail, useUpsertPricing, useDeletePricing), components (PricingItem, PricingForm), PricingStackNavigator, tests. 309 tests, 0 typecheck errors. Commit `7be385e`.
- **CI/CD**: Workflow de build EAS ahora solo se ejecuta en merges a main o manualmente. Validado push y hooks de calidad.
- **N-008 schedule** sigue como P0 pendiente — único feature sin implementación real que bloquea el MVP.

## Tech Stack

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/measurements), forms, grids de medidas adaptables, DI                                                                      |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.                                                                                                        |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                                                                                                                     |
| `src/features/pricing`  | Completo: domain, hooks (usePricingList/Detail/Upsert/Delete), components (PricingItem, PricingForm), screens (List/Detail/Form), PricingStackNavigator, tests. N-009 cerrado (2026-05-09). |
| `src/data/local`        | Completo: migrations v1–v7 (v6 `changedBy`/`changedAt`, v7 limpia tabla `measurements` obsoleta), ClientRepositoryImpl (update/delete), MeasurementRepositoryImpl + tests                   |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`                                                                                                              |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`                                                                                                      |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator (con Ionicons), ClientsStackNavigator (ClientEdit route)                                                                         |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                                                                                                                                 |

## Risks / Blockers

- **High**: `schedule` sin implementación real — MVP incompleto (N-008). `pricing` completado (N-009 cerrado).
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

1. **P0 — N-008**: Implementar baseline de `schedule` (domain, repository, screens, tests) — único feature P0 faltante para MVP.
2. **P0 — N-043**: Robustecer sync cloud-first (sin falso `synced` en local-only), banner global de estado y trigger de reintento por reconexión.
3. **Medium — PR**: Abrir PR `feat/log-viewer-pin` → `develop` con pricing UI completo (309 tests, 0 typecheck errors, commit `7be385e`).

## Confirmed Facts (post N-009 pricing UI completo)

- **Hechos confirmados**: N-009 completamente cerrado (domain, repo, migración, UI, hooks, components, navigation, tests); 309 tests passing; 0 typecheck errors; commit `7be385e` en `feat/log-viewer-pin`; 28 archivos cambiados, 1237 inserciones.
- Hook tests de pricing migrados a `@testing-library/react-native` (React 19 compatible; `@testing-library/react-hooks` incompatible con React 19).
- Navigation props tipados con `NativeStackNavigationProp` (`@react-navigation/native-stack`).
- Mocks confirmados en `__mocks__/`: `expo-sqlite`, `expo-asset`, `@react-native-community/netinfo`.
- `schedule` permanece en placeholder; N-008 es el único P0 restante para MVP completo.
