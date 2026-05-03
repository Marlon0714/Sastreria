# Project Context

## Snapshot

- Date: 2026-05-01
- Project: sastreria (React Native + Expo)
- Stage: MVP funcional en clients; iniciando sync cloud + schedule/pricing
- Branch activa: `develop` (base estable); `fix/clients/measurement-ux-flow` pendiente de PR+merge
- Estado de tests: 29 suites / 105 tests verde (post-fix UX flow)

## Current Focus

**Sprint activo — Dos tracks en paralelo:**

- **Track F — Sync Cloud (nueva prioridad alta):** N-031 → N-032 → N-033 → N-034
  - Prerequisito: arreglar `SyncQueueRepository` para tablas v2 (N-031)
  - Backend: Supabase (decisión tomada); instalar `@supabase/supabase-js` + `expo-secure-store`
  - Entregable mínimo: datos de un dispositivo visibles en otro tras sync
- **Track G — Features pendientes:** N-008 (schedule) + N-009 (pricing) baseline
- **Track A — Calidad CI:** N-006 + N-011 (sin bloquear F y G)

## Tech Stack

- Expo SDK 54
- React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form, Zod
- Expo SQLite (offline-first local)
- **Supabase** (PostgreSQL cloud — decidido 2026-05-01 para N-030)
- EAS Build + GitHub Actions

## Delivery Status

- N-010: Merged. `src/data/sync`: orchestrator, processor, queue repository, transport contract (`NoopSyncTransport`) y tests.
- N-013: Merged. Root navigation tabs+stacks por feature.
- N-014: Merged. Hooks desacoplados de implementaciones concretas vía DI.
- N-016..N-019: Merged. Dominio v2 (Camisa/Pantalón), SQLite v2, repositorios, hooks de medidas.
- N-020 + N-028: Merged. Navigation types v2 + form components compartidos.
- N-021..N-026: Merged (incluidos en `fix/clients/measurement-ux-flow`). Screens de medidas unificadas.
- N-029: Done (en `develop` local). Búsqueda/filtro por nombre y teléfono en `ClientListScreen`.
- fix/clients/measurement-ux-flow: 3 commits listos, branch en GitHub, **PR pendiente de crear** por el usuario.

## Risks / Blockers

- High: `SyncQueueRepository` aún lee tabla `measurements` (legacy v1) — medidas camisa/pantalón **nunca entran a la cola de sync**. Bloqueante para N-032.
- High: `SyncMeasurementQueueItem.payload` tiene campos del modelo v1; tipo desalineado con `CamisaMeasurement`/`PantalonMeasurement`. Requiere N-031 antes de cualquier transport real.
- Medium: Sin autenticación implementada — multi-dispositivo sin auth es inviable en producción. N-032 incluye auth básica Supabase.
- Medium: Coverage signal no confiable (`0/0`); N-011 pendiente.
- Low: `console.error` como shim de Crashlytics; reemplazar cuando se integre Firebase Analytics (deuda conocida).
- Low: `isSubmitting` async en hooks de upsert; deuda técnica registrada.

## N-032 — Supabase Auth/Sync (CERRADO 2026-05-02)

- Login seguro con Supabase Auth (correo/clave), sesión persistente en SecureStore (móvil) o localStorage (web).
- Sync offline-first para clientes y medidas v2 (camisa/pantalón).
- Fix web-compat: `secureSessionStorage` detecta `Platform.OS === "web"` y usa localStorage/memoria.
- Typecheck OK. 110/111 tests OK (test de tabs pendiente por nuevo flujo de login, abordado en sprint siguiente).
- Rama: `feature/sync/n032-supabase-transport`.

## Next Session Steps (Max 3)

1. **P0 — N-031**: Corregir `SyncQueueRepository` + tipos sync para tablas v2 (`camisa_measurements`, `pantalon_measurements`). Sin esto el sync cloud no puede funcionar.
2. **P1 — N-032**: Crear proyecto Supabase, replicar schema, implementar `SupabaseSyncTransport` + auth básica email/password.
3. **P1 — PR fix/clients/measurement-ux-flow**: El usuario crea el PR en GitHub y hace merge a `develop`.
