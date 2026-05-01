## Plan de Implementación: N-017 + N-018 + N-019 (Clientes Measurements v2)

### Contexto

El repositorio ya tiene listo el modelo de dominio para medidas por prenda en [src/features/clients/domain/types.ts](src/features/clients/domain/types.ts) y sus validaciones Zod en [src/features/clients/domain/schemas.ts](src/features/clients/domain/schemas.ts), pero la capa de datos y hooks aún usan el flujo legacy basado en la tabla measurements y los contratos add/find históricos. También hay rutas nuevas tipadas en [src/navigation/types.ts](src/navigation/types.ts), pero la navegación activa sigue montando pantallas legacy en [src/navigation/ClientsStackNavigator.tsx](src/navigation/ClientsStackNavigator.tsx). Este bloque debe cerrar la migración de datos y hooks en un único ciclo, eliminando deuda legacy sin romper bootstrap offline-first ni composición de dependencias.

### Objetivo del bloque

Completar end-to-end:

- N-017: migración SQLite v2 con tablas camisa_measurements y pantalon_measurements (UNIQUE por client_id).
- N-018: contrato e implementación de repositorio con upsert/find por tipo de prenda.
- N-019: hooks nuevos de lectura/escritura por tipo y retiro de hooks/pantallas legacy en el mismo ciclo.

---

### Orden seguro de implementación (fases)

1. Fase A - Datos compatibles (sin romper runtime actual)

- Subir esquema a v2 con tablas nuevas manteniendo tabla legacy measurements intacta.
- Expandir simulador web de DB para soportar nuevas queries.
- Mantener repositorio legacy operativo mientras se agrega contrato nuevo.

2. Fase B - Contrato y repositorio v2

- Cambiar interfaz MeasurementRepository para upsert/find por prenda.
- Adaptar implementación SQLite a ON CONFLICT(client_id) DO UPDATE.
- Actualizar wiring de dependencias y tests de composition root.

3. Fase C - Hooks v2 y cleanup legacy

- Crear useUpsertCamisa, useUpsertPantalon, useCamisaMeasurement, usePantalonMeasurement.
- Eliminar useAddMeasurement y useClientMeasurementHistory.
- Eliminar pantallas MeasurementCreateScreen y MeasurementHistoryScreen y actualizar navegación/ClientDetail.

4. Fase D - Pruebas de regresión y corte final

- Cubrir unit/integration de migración, repositorio, hooks y navegación impactada.
- Ejecutar suite objetivo y barrido de referencias legacy.

---

### Tareas por archivo (crear/modificar/eliminar)

| #   | Tipo           | Acción    | Descripción                                                                                                                                                                                                                    | Archivo(s)                                                                                                                                             |
| --- | -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Datos          | Modificar | Incrementar TARGET_SCHEMA_VERSION a 2; agregar migration v2 con tablas camisa_measurements y pantalon_measurements, UNIQUE(client_id), FK a clients, y checks de sync_status. No eliminar measurements legacy en esta versión. | src/data/local/migrations.ts                                                                                                                           |
| 2   | Datos          | Modificar | Mantener no-op de runMigrations en web, pero documentar en comentario que v2 se simula vía adapter local (sin SQL real).                                                                                                       | src/data/local/migrations.web.ts                                                                                                                       |
| 3   | Datos          | Modificar | Extender adapter web in-memory con colecciones camisa_measurements y pantalon_measurements, soporte upsert por client_id y lecturas findByClientId para nuevos tests/hooks.                                                    | src/data/local/database.web.ts                                                                                                                         |
| 4   | Dominio        | Modificar | Reemplazar contrato MeasurementRepository legacy por métodos: upsertCamisa, upsertPantalon, findCamisaByClientId, findPantalonByClientId. Mantener ClientRepository intacto.                                                   | src/features/clients/domain/repository.ts                                                                                                              |
| 5   | Datos          | Modificar | Reescribir MeasurementRepositoryImpl para mapear filas camisa/pantalón, ejecutar INSERT ... ON CONFLICT(client_id) DO UPDATE, preservar id/created_at al actualizar y setear updated_at/sync_status='pending' en upsert.       | src/data/local/MeasurementRepositoryImpl.ts                                                                                                            |
| 6   | Datos          | Modificar | Actualizar composition root para el nuevo contrato (tipos y mocks). Garantizar que onWriteCommitted siga disparando sync request y no bloquee writes.                                                                          | src/data/local/clientsDependencies.ts                                                                                                                  |
| 7   | Test           | Modificar | Ajustar tests de composición a la nueva interfaz MeasurementRepository (nuevos métodos en dobles de prueba).                                                                                                                   | src/data/local/clientsDependencies.test.ts                                                                                                             |
| 8   | Test           | Modificar | Reemplazar tests legacy de MeasurementRepositoryImpl por casos v2: insert inicial, update por conflicto client_id, trim/null notes, findCamisa, findPantalon, query parametrizada, callback onWriteCommitted.                  | src/data/local/MeasurementRepositoryImpl.test.ts                                                                                                       |
| 9   | Lógica         | Crear     | Hook useUpsertCamisa: parse Zod, estado isSubmitting/error, llamada a measurementRepository.upsertCamisa, retorno de entidad o null en falla.                                                                                  | src/features/clients/hooks/useUpsertCamisa.ts                                                                                                          |
| 10  | Lógica         | Crear     | Hook useUpsertPantalon con contrato espejo del anterior.                                                                                                                                                                       | src/features/clients/hooks/useUpsertPantalon.ts                                                                                                        |
| 11  | Lógica         | Crear     | Hook useCamisaMeasurement(clientId): carga inicial, reload, estados loading/error, usa findCamisaByClientId.                                                                                                                   | src/features/clients/hooks/useCamisaMeasurement.ts                                                                                                     |
| 12  | Lógica         | Crear     | Hook usePantalonMeasurement(clientId): carga inicial, reload, estados loading/error, usa findPantalonByClientId.                                                                                                               | src/features/clients/hooks/usePantalonMeasurement.ts                                                                                                   |
| 13  | Lógica         | Eliminar  | Retirar hook legacy de creación de medidas genéricas.                                                                                                                                                                          | src/features/clients/hooks/useAddMeasurement.ts                                                                                                        |
| 14  | Lógica         | Eliminar  | Retirar hook legacy de historial genérico.                                                                                                                                                                                     | src/features/clients/hooks/useClientMeasurementHistory.ts                                                                                              |
| 15  | Test           | Crear     | Tests unitarios para useUpsertCamisa (happy path, validación zod, error repositorio, dependencia por provider/override).                                                                                                       | src/features/clients/hooks/useUpsertCamisa.test.ts                                                                                                     |
| 16  | Test           | Crear     | Tests unitarios para useUpsertPantalon (mismos escenarios).                                                                                                                                                                    | src/features/clients/hooks/useUpsertPantalon.test.ts                                                                                                   |
| 17  | Test           | Crear     | Tests unitarios para useCamisaMeasurement (loading inicial, éxito, error + reload).                                                                                                                                            | src/features/clients/hooks/useCamisaMeasurement.test.ts                                                                                                |
| 18  | Test           | Crear     | Tests unitarios para usePantalonMeasurement (loading inicial, éxito, error + reload).                                                                                                                                          | src/features/clients/hooks/usePantalonMeasurement.test.ts                                                                                              |
| 19  | Test           | Eliminar  | Retirar tests del hook legacy useAddMeasurement.                                                                                                                                                                               | src/features/clients/hooks/useAddMeasurement.test.ts                                                                                                   |
| 20  | Test           | Eliminar  | Retirar tests del hook legacy useClientMeasurementHistory.                                                                                                                                                                     | src/features/clients/hooks/useClientMeasurementHistory.test.ts                                                                                         |
| 21  | UI             | Eliminar  | Eliminar pantalla legacy MeasurementCreateScreen.                                                                                                                                                                              | src/features/clients/screens/MeasurementCreateScreen.tsx                                                                                               |
| 22  | UI             | Eliminar  | Eliminar pantalla legacy MeasurementHistoryScreen.                                                                                                                                                                             | src/features/clients/screens/MeasurementHistoryScreen.tsx                                                                                              |
| 23  | Test           | Eliminar  | Eliminar test de pantalla legacy MeasurementHistoryScreen.                                                                                                                                                                     | src/features/clients/screens/MeasurementHistoryScreen.test.tsx                                                                                         |
| 24  | UI             | Modificar | Cambiar CTAs de ClientDetail para navegar por el flujo nuevo (MeasurementTypeSelect con mode create/view) y eliminar referencias MeasurementCreate/MeasurementHistory.                                                         | src/features/clients/screens/ClientDetailScreen.tsx                                                                                                    |
| 25  | Test           | Modificar | Ajustar asserts de navegación de ClientDetailScreen al nuevo destino MeasurementTypeSelect con params mode.                                                                                                                    | src/features/clients/screens/ClientDetailScreen.test.tsx                                                                                               |
| 26  | Navegación     | Modificar | Retirar imports y screens legacy del stack; si N-021 aún no está mergeado, mantener rutas en types pero no exponer pantallas eliminadas y dejar TODO explícito para wiring de nuevas screens.                                  | src/navigation/ClientsStackNavigator.tsx                                                                                                               |
| 27  | Navegación     | Modificar | Remover rutas legacy de ClientsStackParamList (MeasurementCreate, MeasurementHistory) al final del ciclo cuando ClientDetail y stack estén migrados.                                                                           | src/navigation/types.ts                                                                                                                                |
| 28  | Dominio        | Modificar | Eliminar tipos legacy Measurement y AddMeasurementDTO (ya deprecados) y limpiar comentarios N-019 cumplido.                                                                                                                    | src/features/clients/domain/types.ts                                                                                                                   |
| 29  | Dominio        | Modificar | Eliminar addMeasurementSchema y tipos derivados AddMeasurementSchemaInput/Output; conservar únicamente createClient + upsertCamisa/upsertPantalon.                                                                             | src/features/clients/domain/schemas.ts                                                                                                                 |
| 30  | Test           | Modificar | Actualizar tests de schemas quitando bloque addMeasurementSchema y reforzando casos borde de upsertCamisa/upsertPantalon (vacío->null, coma decimal, límites).                                                                 | src/features/clients/domain/schemas.test.ts                                                                                                            |
| 31  | Test/Factories | Modificar | Retirar measurementFactory legacy o reemplazarla por factories de camisa/pantalón; actualizar barrel exports.                                                                                                                  | src/**tests**/factories/measurementFactory.ts; src/**tests**/factories/index.ts                                                                        |
| 32  | Calidad        | Verificar | Barrido de referencias legacy para asegurar eliminación completa del ciclo N-019.                                                                                                                                              | búsqueda en src/\*\* de MeasurementCreate, MeasurementHistory, useAddMeasurement, useClientMeasurementHistory, addMeasurementSchema, AddMeasurementDTO |

---

### Estrategia de compatibilidad

Compatibilidad de datos:

- Mantener tabla measurements legacy durante N-017 y N-018 para no perder datos existentes ni bloquear rollback funcional.
- Las nuevas pantallas/hooks solo leerán de camisa_measurements y pantalon_measurements.
- No hacer backfill automático desde measurements en este bloque para evitar inferencias ambiguas entre modelo genérico y modelo por prenda. Si se requiere migración histórica, abrir historia separada de data migration con reglas de negocio explícitas.

Compatibilidad de app en transición:

- No eliminar rutas legacy de [src/navigation/types.ts](src/navigation/types.ts) hasta que [src/features/clients/screens/ClientDetailScreen.tsx](src/features/clients/screens/ClientDetailScreen.tsx) y [src/navigation/ClientsStackNavigator.tsx](src/navigation/ClientsStackNavigator.tsx) dejen de referenciarlas.
- Ejecutar eliminación en el mismo PR/ciclo para evitar estado intermedio compilable pero con navegación rota.

Compatibilidad offline-first y sync:

- Todo upsert local debe guardar sync_status='pending' y updated_at actual.
- Mantener callback onWriteCommitted para disparar SyncOrchestrator.requestRun() como hoy.
- No exponer detalles internos de sync en UI de hooks nuevos.

---

### Detalle técnico clave por bloque

N-017 (migración v2):

- SQL recomendado para upsert-safe schema:
  - UNIQUE(client_id) en cada tabla.
  - Índices opcionales en client_id (aunque UNIQUE ya indexa).
  - Campos nullable para medidas opcionales.
- Mantener transaction por migración como patrón existente en [src/data/local/migrations.ts](src/data/local/migrations.ts).

N-018 (repositorio):

- Firma objetivo en contrato:
  - upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement>
  - upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement>
  - findCamisaByClientId(clientId: string): Promise<CamisaMeasurement | null>
  - findPantalonByClientId(clientId: string): Promise<PantalonMeasurement | null>
- Política de ids/fechas:
  - Insert inicial: id nuevo UUID, created_at=updated_at=now.
  - Update por conflicto client_id: conservar id/created_at previos, refrescar updated_at y sync_status.
- Seguridad:
  - Queries parametrizadas exclusivamente.
  - Sin concatenación de SQL con valores de usuario.

N-019 (hooks + cleanup):

- Hooks de upsert deben consumir schemas upsertCamisa/upsertPantalon existentes.
- Hooks de lectura deben seguir patrón de useClientDetail/useClientList (loading/error/reload).
- Eliminar legacy de forma atómica: hooks + screens + navegación + tipos/schemas/tests/factories.

---

### Estrategia de pruebas (unitarias e integración)

1. Repositorio y datos (unit/integration liviana)

- [src/data/local/MeasurementRepositoryImpl.test.ts](src/data/local/MeasurementRepositoryImpl.test.ts)
  - Inserta camisa nueva con pending.
  - Upsert camisa sobre mismo client_id actualiza campos y updated_at.
  - Inserta pantalón nuevo.
  - Upsert pantalón sobre mismo client_id.
  - findCamisaByClientId devuelve null cuando no existe.
  - findPantalonByClientId devuelve null cuando no existe.
  - Verificar SQL parametrizado (placeholders + params).
  - Verificar callback onWriteCommitted en éxito y tolerancia a error.
- [src/data/local/clientsDependencies.test.ts](src/data/local/clientsDependencies.test.ts)
  - Contratos mockeados con nueva interfaz.
  - Verificar wiring de onWriteCommitted.

2. Hooks (unit)

- Nuevos tests en hooks v2:
  - parse/normalización correcta por schema.
  - estados isSubmitting/isLoading.
  - errores user-friendly.
  - reload tras falla transitoria.
- Eliminación de suites legacy para evitar falsos positivos sobre API removida.

3. Navegación/UI impactada (integración de feature)

- [src/features/clients/screens/ClientDetailScreen.test.tsx](src/features/clients/screens/ClientDetailScreen.test.tsx)
  - Verificar nueva navegación a MeasurementTypeSelect con mode create/view.
- Crear prueba específica de stack de clientes (nuevo archivo sugerido):
  - src/navigation/ClientsStackNavigator.test.tsx
  - Asegurar que el stack no registra pantallas eliminadas y mantiene rutas válidas del flujo nuevo.

4. Dominio

- [src/features/clients/domain/schemas.test.ts](src/features/clients/domain/schemas.test.ts)
  - Reforzar cobertura de upsertCamisa/upsertPantalon y eliminar casos addMeasurement.

5. Validación final de regresión

- Ejecutar al menos:
  - npm test -- src/data/local/MeasurementRepositoryImpl.test.ts
  - npm test -- src/data/local/clientsDependencies.test.ts
  - npm test -- src/features/clients/hooks/useUpsertCamisa.test.ts
  - npm test -- src/features/clients/hooks/useUpsertPantalon.test.ts
  - npm test -- src/features/clients/hooks/useCamisaMeasurement.test.ts
  - npm test -- src/features/clients/hooks/usePantalonMeasurement.test.ts
  - npm test -- src/features/clients/screens/ClientDetailScreen.test.tsx
  - npm test -- src/navigation/ClientsStackNavigator.test.tsx
  - npm run lint

---

### Riesgos y mitigaciones

1. Riesgo: estado intermedio con types nuevos pero stack aún importando pantallas legacy eliminadas.

- Mitigación: ejecutar cambios de navegación y eliminación de pantallas en el mismo commit de cleanup.

2. Riesgo: ruptura de tests por factories legacy Measurement.

- Mitigación: migrar factories al inicio de Fase C antes de editar tests de hooks.

3. Riesgo: regresión de sync trigger al cambiar contrato del repositorio.

- Mitigación: mantener patrón onWriteCommitted y reforzar assertions en clientsDependencies.test.

4. Riesgo: pérdida de historial legacy no migrado.

- Mitigación: mantener tabla measurements intacta y documentar explícitamente no-backfill en este bloque.

---

### Estrategia de rama y commits (Conventional Commits)

Rama sugerida:

- feature/clients/n017-n019-measurements-v2

Secuencia de commits recomendada (pequeños y cohesivos):

1. chore(db): add sqlite schema v2 for camisa and pantalon measurements

- Cambios: migrations.ts, migrations.web.ts, database.web.ts

2. refactor(clients): replace measurement repository contract with upsert by garment

- Cambios: domain/repository.ts, MeasurementRepositoryImpl.ts, clientsDependencies.ts

3. test(db): update repository and dependencies tests for measurements v2

- Cambios: MeasurementRepositoryImpl.test.ts, clientsDependencies.test.ts

4. feat(clients): add camisa and pantalon measurement hooks

- Cambios: useUpsertCamisa.ts, useUpsertPantalon.ts, useCamisaMeasurement.ts, usePantalonMeasurement.ts

5. test(clients): add unit tests for measurement hooks v2

- Cambios: 4 tests de hooks nuevos

6. refactor(clients): remove legacy measurement flow and update navigation wiring

- Cambios: eliminación hooks/screens legacy, ClientDetailScreen.tsx, ClientsStackNavigator.tsx, navigation/types.ts, domain cleanup

7. test(clients): remove legacy tests and align navigation assertions

- Cambios: tests legacy eliminados, ClientDetailScreen.test.tsx, schemas.test.ts, factories, ClientsStackNavigator.test.tsx

8. chore(clients): run lint and stabilize residual imports after legacy cleanup

- Cambios menores de limpieza final

Política de integración:

- PR hacia develop.
- No merge directo a main.
- Revisión humana obligatoria antes de merge.

---

### Checklist de salida (DoD del bloque)

- Migración v2 aplicada con user_version=2 y tablas nuevas disponibles.
- Contrato MeasurementRepository migrado completamente a upsert/find por tipo.
- MeasurementRepositoryImpl implementa upsert por UNIQUE(client_id) para camisa y pantalón.
- Hooks nuevos creados y cubiertos por tests.
- Hooks/pantallas legacy eliminados en el mismo ciclo.
- Navegación sin referencias a rutas legacy removidas.
- Tests objetivo y lint en verde.
- Búsqueda global sin referencias a símbolos legacy eliminados.
