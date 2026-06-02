# Project Context

## Snapshot

- Date: 2026-05-14
- Project: sastrería (React Native + Expo)
- Stage: MVP con Auth + Sync cloud + CRUD clientes (múltiples teléfonos, cédula) + Sección Tallas (camisa, pantalón, saco, chaleco) + Grid medidas + pricing UI completo; `feature/clients/ui-phones-tallas` lista para PR, 326 tests verdes (58 suites), 0 typecheck errors.
- Branch activa: `feature/clients/ui-phones-tallas` (cycle completado — Implementado + Testeado + Revisado, ready for PR a develop)
- Último ciclo cerrado: N-044 + N-045 (UI/UX + múltiples teléfonos/cédula + sección Tallas) cerrados 2026-05-14. 326 tests verdes, 58 suites.

## Current Focus

- **N-044 + N-045 cerrados** (2026-05-14): Ciclo completo UI/UX + múltiples teléfonos/cédula + sección Tallas. Rama `feature/clients/ui-phones-tallas` implementada, testeada y revisada por Reviewer. 326 tests verdes (58 suites). PR a develop pendiente de apertura.
- **Pendientes menores del Reviewer** (N-046..N-050, todos Low): errores sin Crashlytics en catch blocks, `JSON.parse(row.phones)` sin try/catch, `key={idx}` en phones map, validación `min(7)` ausente en phone2/phone3, memoización de `handleSubmit` en TallasScreen.
- **N-008 schedule** sigue como P0 — único feature sin implementación real que bloquea el MVP.
- **N-043 sync** robustecido en ciclo anterior; PR pendiente si no fue mergeado.

## Tech Stack

## Tech Stack

- Expo SDK 54 / React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form + Zod
- Expo SQLite (offline-first) + Supabase (cloud sync)
- EAS Build + GitHub Actions
- Sin Firebase Crashlytics (shim temporal con `console.error` JSON)

## Delivery Status — módulos activos confirmados en disco

| Módulo                  | Estado                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/clients`  | Completo: domain, hooks, components, screens (list/create/detail/edit/measurements/tallas), forms, grids de medidas, TallaForm + TallasScreen (CRUD tallas por cliente), DI. Múltiples teléfonos + cédula en CreateClientDTO/UpdateClientDTO. `useTallas` hook. `MeasurementTypeSelectScreen` con tarjetas GARMENT_OPTIONS. Sección Tallas en ClientDetailScreen. |
| `src/features/auth`     | Completo: `useAuth.ts` + `LoginScreen.tsx` + tests (8+7 casos). Mergeado en develop.                                                                                                                                                                                                                                                                              |
| `src/features/schedule` | Solo `SchedulePlaceholderScreen` + test                                                                                                                                                                                                                                                                                                                           |
| `src/features/pricing`  | Completo: domain, hooks (usePricingList/Detail/Upsert/Delete), components (PricingItem, PricingForm), screens (List/Detail/Form), PricingStackNavigator, tests. N-009 cerrado (2026-05-09).                                                                                                                                                                       |
| `src/data/local`        | Completo: migrations v1–v10 (v10 tabla `client_tallas` UNIQUE client_id+type CASCADE delete; `runMigrations` ordena por versión; v9 sin ALTER TABLE duplicados), ClientRepositoryImpl (phones JSON, cedula), MeasurementRepositoryImpl, TallaRepositoryImpl (upsert con SELECT post-INSERT, findByClientId, delete + sync_delete_log) + tests                     |
| `src/data/supabase`     | Completo: `SupabaseAuthRepository`, `secureSessionStorage`, `client`, `config`                                                                                                                                                                                                                                                                                    |
| `src/data/sync`         | Completo: SyncOrchestrator, Processor, QueueRepository, Transport + `SupabasePullSync`                                                                                                                                                                                                                                                                            |
| `src/navigation`        | Completo: RootNavigator (auth-guard), FeatureTabsNavigator (con Ionicons), ClientsStackNavigator (ClientEdit route)                                                                                                                                                                                                                                               |
| `src/shared`            | Completo: EmptyView, LoadingView, ErrorView                                                                                                                                                                                                                                                                                                                       |

## Risks / Blockers

- **High**: `schedule` sin implementación real — MVP incompleto (N-008). `pricing` y medidas completados (N-009, N-025 cerrados).
- **High**: riesgo de falso `synced` cuando Supabase no está configurado (`NoopSyncTransport` retorna éxito) y falta trigger explícito en reconexión de red para reintentos inmediatos (N-043, PR pendiente en rama fix/sync).
- **Medium**: PR `feature/clients/ui-phones-tallas` → `develop` pendiente de apertura (N-044 + N-045, 326 tests, Reviewer aprobado).
- **Medium**: Coverage signal puede distorsionarse con features vacíos (N-011).
- **Low**: Crashlytics no integrado; shim `console.error` temporal (N-034).
- **Low**: Semántica asimétrica de `SyncCursor.updatedAt` para scope `delete_log` (seguimiento post-merge).
- **Low**: `Array.shift()` O(n) en `SyncMetrics` (seguimiento de performance post-merge).
- **Low**: Documentar comportamiento de leading coalesce en `SupabaseRealtimeInvalidationSubscriber`.
- **Low**: deuda técnica `isSubmitting` en hooks de upsert async.
- **Low**: acoplamiento frágil por referencia de componente (`child.type === MeasurementCard`) en `MeasurementGridSection` — documentado para revisión si se introduce HOC o lazy loading (N-038).
- **Low**: TODO de integración Crashlytics en `SyncQueueProcessor` y `App.tsx`.
- **Low**: Tests unitarios de hooks de negocio (ej: useUpsertPantalon, usePantalonMeasurement) pendientes (N-027, sugerencia registrada en backlog).
- **Low**: N-046 — errores de catch sin Crashlytics en `useTallas`/`useCreateClient`/`useUpdateClient`.
- **Low**: N-047 — `JSON.parse(row.phones)` sin try/catch en `ClientRepositoryImpl`.
- **Low**: N-048 — `key={idx}` en map de phones extra en `ClientDetailScreen` (usar valor único).
- **Low**: N-049 — `phone2`/`phone3` sin validación `min(7)` en `schemas.ts`.
- **Low**: N-050 — `handleSubmit(onSubmit)` sin memoización en `TallasScreen`.

## Next Session Steps (Max 3)

1. **P0 — Abrir PR `feature/clients/ui-phones-tallas` → `develop`**: N-044 + N-045 listos, 326 tests, Reviewer aprobado. Minors N-046..N-050 registrados, no bloqueantes.
2. **P0 — N-043**: Verificar estado del PR de sync cloud-first; abrir PR a develop si la rama está lista.
3. **P0 — N-008**: Implementar schedule feature (domain, repository, screens, tests) — único feature sin implementación real que bloquea el MVP.

## Confirmed Facts (post N-039/N-040/N-041/N-042/N-038/N-021..N-028: ciclo medidas camisa y pantalón cerrado)

- **Hechos confirmados**: Ciclo de medidas de pantalón y camisa completamente cerrado (migraciones v2–v7, dominio, repositorio, UI, hooks, components, navigation, tests, revisión). Branch `feature/ui/n038-measurement-grid` mergeada a develop. 214 tests verdes en ciclo grid, 309 tests verdes en ciclo pricing. Commit `988bc43` (N-039) y `6470125` (N-021..N-028).
- Migraciones: v2/v3 (camisa/pantalón, cuello/brazo/puño), v4 (sync_delete_log), v5 (checkpoints), v6 (changedBy/changedAt), v7 (DROP measurements).
- Dominio: tipos y schemas separados para CamisaMeasurement y PantalonMeasurement, todos los campos opcionales, validación Zod, DTOs y factories, mapping camelCase ↔ snake_case documentado y aplicado en repositorio y migraciones.
- UI: screens de create/detail/edit para camisa y pantalón, grid adaptable, edición inline, navegación consolidada, componentes compartidos, forms reutilizables, estados loading/error/empty/view/edit, tests de integración.
- Tests: tests unitarios y de integración para hooks, forms, screens, repositorios, migraciones. 39 suites, 165 tests en grid, 214 en branch de merge, 309 en pricing. Falta solo cobertura exhaustiva de hooks de negocio (pendiente N-027).
- Revisión: ciclo auditado por Reviewer, feedback aplicado, sin deuda funcional ni técnica relevante. Única deuda: tests unitarios exhaustivos para hooks de negocio (recomendación Reviewer).
- Observaciones: mapping camelCase ↔ snake_case es estándar para persistencia y sync; recomendación explícita de tests unitarios para hooks de negocio.

## Confirmed Facts (post N-044/N-045: ciclo UI/UX + tallas + múltiples teléfonos cerrado)

- **Hechos confirmados**: Ciclo completo N-044 + N-045 cerrado en rama `feature/clients/ui-phones-tallas`. 326 tests verdes (58 suites), 0 typecheck errors. Reviewer aprobó con solo observaciones menores (N-046..N-050, no bloqueantes).
- Dominio: `phones?`/`cedula?` añadidos a `CreateClientDTO`/`UpdateClientDTO`; nuevos tipos `TallaType`, `ClientTalla`, `CreateTallaDTO`, `UpdateTallaDTO`; `createTallaSchema`/`updateTallaSchema` con Zod; interfaz `TallaRepository` en domain; `ClientsDependencies` incluye `tallaRepository`.
- Base de datos: migración v10 tabla `client_tallas` (UNIQUE client_id+type, CASCADE delete); `runMigrations` ordena array por versión antes de iterar (fix crítico); v9 sin ALTER TABLE duplicados de v2/v3 (fix crítico).
- Repositorios: `TallaRepositoryImpl` nuevo (upsert con INSERT OR REPLACE + SELECT post-INSERT para retornar `createdAt` real, findByClientId, delete con sync_delete_log); `ClientRepositoryImpl` lee/escribe `phones` (JSON array) y `cedula`.
- Hooks: `useTallas` nuevo (CRUD por cliente, validación Zod, reload automático); `useCreateClient`/`useUpdateClient` manejan phone2/phone3/cedula; `useTallaRepository()` exportado en ClientsDependenciesProvider.
- UI: `TallaForm` nuevo (chips de tipo + campo valor + notas); `TallasScreen` nueva (4 cards por tipo, Modal create/edit, confirmación borrado); `ClientDetailScreen` con filas label+valor para teléfonos/cédula y sección Tallas con chips y botón "Gestionar tallas"; `ClientCreateScreen`/`ClientEditScreen` con campos phone2/phone3/cedula opcionales; `MeasurementTypeSelectScreen` con tarjetas GARMENT_OPTIONS y emojis.
- Navegación: `Tallas: { clientId: string }` en `ClientsStackParamList`; `TallasScreen` registrada en `ClientsStackNavigator`.
- Tests nuevos: `TallaRepositoryImpl.test.ts` (7), `useTallas.test.ts` (7), `useCreateClient.test.ts` (+3 casos phones/cedula).
- Deuda menor registrada: N-046..N-050 (todos Low, no bloqueantes para PR).
