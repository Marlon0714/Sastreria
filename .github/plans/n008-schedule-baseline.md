## Plan de Implementación: Baseline de Schedule (N-008)

### Contexto

Actualmente solo existe `SchedulePlaceholderScreen` y su test, montados en el `ScheduleStackNavigator`. No hay tipos, lógica de dominio, repositorio ni UI real para la agenda de turnos. El patrón de features (clients) usa: domain/types, domain/schemas, domain/repository, SQLite impl, hooks, screens, tests.

### Tareas

| #   | Tipo    | Descripción                                                                                     | Archivo(s)                                                                                                   |
| --- | ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Dominio | Definir tipo `Schedule` (turno) con campos: id, fecha, hora, cliente, notas, estado, syncStatus | features/schedule/domain/types.ts                                                                            |
| 2   | Dominio | Definir DTOs: `CreateScheduleDTO`, `UpdateScheduleDTO`                                          | features/schedule/domain/types.ts                                                                            |
| 3   | Dominio | Definir estados permitidos del turno (`status`): pendiente, confirmado, completado, cancelado   | features/schedule/domain/types.ts                                                                            |
| 4   | Dominio | Esquema Zod para validación de turno y formularios                                              | features/schedule/domain/schemas.ts                                                                          |
| 5   | Datos   | Interfaz `ScheduleRepository` (CRUD, findByDate, findByClient)                                  | features/schedule/domain/repository.ts                                                                       |
| 6   | Datos   | Implementación SQLite: `ScheduleRepositoryImpl`                                                 | data/local/ScheduleRepositoryImpl.ts                                                                         |
| 7   | Datos   | Migración SQLite para tabla `schedules`                                                         | data/local/migrations.ts                                                                                     |
| 8   | Lógica  | Hook `useScheduleList` (por fecha, loading, error, reload)                                      | features/schedule/hooks/useScheduleList.ts                                                                   |
| 9   | UI      | Pantalla `ScheduleListScreen` con estados: loading, error, empty, lista                         | features/schedule/screens/ScheduleListScreen.tsx                                                             |
| 10  | UI      | Pantalla `ScheduleFormScreen` (crear/editar turno)                                              | features/schedule/screens/ScheduleFormScreen.tsx                                                             |
| 11  | UI      | Navegación: agregar rutas ScheduleList y ScheduleForm                                           | navigation/ScheduleStackNavigator.tsx, navigation/types.ts                                                   |
| 12  | Test    | Tests unitarios para dominio y hook                                                             | features/schedule/domain/types.test.ts, features/schedule/hooks/useScheduleList.test.ts                      |
| 13  | Test    | Tests de integración para repositorio SQLite                                                    | data/local/ScheduleRepositoryImpl.test.ts                                                                    |
| 14  | Test    | Tests de UI para ScheduleListScreen y ScheduleFormScreen                                        | features/schedule/screens/ScheduleListScreen.test.tsx, features/schedule/screens/ScheduleFormScreen.test.tsx |

### Decisiones de Diseño

- El tipo `Schedule` hereda de `BaseEntity` (id, createdAt, updatedAt, syncStatus).
- El campo `clientId` referencia a un cliente existente (relación foránea).
- El estado del turno (`status`) es un enum restringido ("pending", "confirmed", "completed", "cancelled").
- El repositorio expone métodos CRUD y consultas por fecha y cliente.
- El hook sigue el patrón de `useClientList` (loading, error, reload).
- La UI inicial solo lista y permite crear/editar turnos, sin lógica compleja de conflictos ni recordatorios.
- La migración SQLite crea la tabla `schedules` con índices por fecha y clientId.

### Riesgos o Consideraciones

- Requiere migración de esquema SQLite (afecta tests y despliegue offline).
- Validar integridad referencial: no permitir turnos con `clientId` inexistente.
- Sincronización: baseline solo marca syncStatus, integración con sync vendrá después.
- Navegación: actualizar `ScheduleStackNavigator` y tipos para nuevas rutas.

📄 Plan guardado en: .github/plans/n008-schedule-baseline.md
👉 Siguiente paso: @Builder ejecuta el plan en .github/plans/n008-schedule-baseline.md
