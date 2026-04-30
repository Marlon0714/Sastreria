## Plan de Implementación: N-014 Desacoplar hooks de implementaciones concretas

### Contexto

Actualmente los hooks de clients instancian implementaciones concretas de SQLite dentro del módulo (`new ClientRepositoryImpl()` y `new MeasurementRepositoryImpl()`), lo que acopla capa de hooks a infraestructura y obliga a mockear clases concretas en tests. Las interfaces de repositorio ya existen, pero no hay un módulo de composición de dependencias reutilizable en `src/data/local/`.

### Tareas

| #   | Tipo        | Descripción                                                                                                                                                                                                                                             | Archivo(s)                                                                                                                                                                                                                  |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dominio     | Consolidar contratos de repositorio para DI: mantener `ClientRepository` y `MeasurementRepository`, y agregar tipo de agregación `ClientsDependencies` (o equivalente) que represente las dependencias consumidas por hooks.                            | src/features/clients/domain/repository.ts                                                                                                                                                                                   |
| 2   | Datos       | Crear módulo de composición local (composition root) que construya dependencias por interfaz y no por clase concreta. Debe exponer factory principal para runtime y factory para tests.                                                                 | src/data/local/clientsDependencies.ts (nuevo)                                                                                                                                                                               |
| 3   | Datos       | Definir estrategia de override en composición para tests: `createClientsDependencies(overrides?)` que retorne interfaces con default de SQLite y permita reemplazo parcial de métodos/repositorios.                                                     | src/data/local/clientsDependencies.ts (nuevo)                                                                                                                                                                               |
| 4   | Lógica      | Migrar `useClientList` para consumir `ClientRepository` vía parámetro opcional (inyección) o vía composición central, eliminando `new ClientRepositoryImpl()` del hook. Mantener API pública del resultado (`clients`, `isLoading`, `error`, `reload`). | src/features/clients/hooks/useClientList.ts                                                                                                                                                                                 |
| 5   | Test        | Actualizar tests de `useClientList` para inyectar doble de prueba por interfaz en lugar de mock de clase concreta por path de import. Validar carga inicial, error y recuperación en reload.                                                            | src/features/clients/hooks/useClientList.test.ts                                                                                                                                                                            |
| 6   | Lógica      | Migrar `useCreateClient` a `ClientRepository` inyectable; conservar validación Zod, parseo y semántica de errores. Remover acoplamiento a `ClientRepositoryImpl`.                                                                                       | src/features/clients/hooks/useCreateClient.ts                                                                                                                                                                               |
| 7   | Test        | Refactor de tests de `useCreateClient` para usar repositorio fake/mocked por interfaz y asserts de flujo (validación, create exitoso, error de repositorio).                                                                                            | src/features/clients/hooks/useCreateClient.test.ts                                                                                                                                                                          |
| 8   | Lógica      | Migrar `useAddMeasurement` a `MeasurementRepository` inyectable; mantener parseo de números, mensajes de error y estado `isSubmitting`.                                                                                                                 | src/features/clients/hooks/useAddMeasurement.ts                                                                                                                                                                             |
| 9   | Test        | Refactor de tests de `useAddMeasurement` para inyectar `MeasurementRepository` por interfaz, evitando `jest.mock` sobre `MeasurementRepositoryImpl`.                                                                                                    | src/features/clients/hooks/useAddMeasurement.test.ts                                                                                                                                                                        |
| 10  | Lógica      | Migrar `useClientMeasurementHistory` para consumir `MeasurementRepository` por interfaz, preservando contrato de `reload` y comportamiento al cambiar `clientId`.                                                                                       | src/features/clients/hooks/useClientMeasurementHistory.ts                                                                                                                                                                   |
| 11  | Test        | Actualizar tests de `useClientMeasurementHistory` para DI explícita; cubrir carga por `clientId`, fallback de error y recuperación en reload.                                                                                                           | src/features/clients/hooks/useClientMeasurementHistory.test.ts                                                                                                                                                              |
| 12  | Integración | Verificar compatibilidad de uso actual en screens sin cambios de comportamiento. Si se elige parámetro opcional de dependencia en hooks, mantener llamadas existentes sin argumentos para no tocar UI.                                                  | src/features/clients/screens/ClientListScreen.tsx; src/features/clients/screens/ClientCreateScreen.tsx; src/features/clients/screens/MeasurementCreateScreen.tsx; src/features/clients/screens/MeasurementHistoryScreen.tsx |
| 13  | Calidad     | Ejecutar lint + pruebas objetivo del feature clients; revisar cobertura de hooks afectados y regresiones en contratos de error/estado.                                                                                                                  | package.json scripts; tests en src/features/clients/hooks/\*.test.ts                                                                                                                                                        |

### Migración Hook por Hook

1. `useClientList`

- Extraer dependencia `clientRepository` a contrato de entrada del hook.
- Resolver dependencia default desde módulo de composición.
- Reescribir test para configurar mock por interfaz (sin mock de clase).

2. `useCreateClient`

- Inyectar `ClientRepository` por parámetro opcional o dependencia compuesta.
- Mantener `createClientSchema.parse` y reset del formulario igual.
- Reescribir tests para pasar repositorio fake con `create` controlable.

3. `useAddMeasurement`

- Inyectar `MeasurementRepository` por interfaz.
- Mantener parseo/normalización actuales y UX de error actual.
- Reescribir tests con fake del método `addMeasurement`.

4. `useClientMeasurementHistory`

- Inyectar `MeasurementRepository` por interfaz.
- Mantener reload y carga automática por `clientId`.
- Reescribir tests con fake de `findMeasurementsByClientId`.

### Estrategia de Inyección para Tests

- Cada hook acepta dependencia explícita mediante argumento opcional tipado por interfaz.
- En runtime, el hook obtiene defaults desde `createClientsDependencies()`.
- En tests, se pasa override/fake directo al hook para evitar `jest.mock` de implementaciones concretas y reducir fragilidad por paths de import.
- Para consistencia, crear helper de test por feature (opcional en etapa posterior): `buildClientsDependenciesMock()` con defaults `jest.fn()`.

### Decisiones de Diseño

- Se prioriza DI por interfaz en la frontera de hooks para respetar arquitectura UI -> Dominio -> Datos y reducir conocimiento de infraestructura en hooks.
- Se propone un composition root local en `src/data/local/` (en vez de global app container) para minimizar alcance del cambio N-014 y mantener entrega incremental.
- Se conserva API pública de hooks hacia screens para evitar tocar navegación/UI en esta historia.
- Se adopta estrategia de overrides parciales en factoría de dependencias para simplificar pruebas unitarias sin bootstrapping de SQLite.

### Riesgos o Consideraciones

- Riesgo de romper memoización/referencias estables si la composición crea nuevas instancias en cada render. Mitigación: instancias singleton por módulo o memoización fuera del hook.
- Riesgo de inconsistencias entre tipos de override y contratos reales de interfaz. Mitigación: tipar overrides con `Partial<...>` y validar compile-time en tests.
- Riesgo de tests flaky por async updates al cambiar patrón de mocks. Mitigación: mantener `act`/`waitFor` y aserciones por estado observable.
- Riesgo de expansión no controlada del módulo de composición a otros features. Mitigación: delimitar alcance explícitamente a clients en N-014.

### Criterios DoD

- No existen instancias directas de `ClientRepositoryImpl` o `MeasurementRepositoryImpl` dentro de los 4 hooks objetivo.
- Los 4 hooks consumen contratos por interfaz y siguen exponiendo la misma API pública usada por screens.
- Existe módulo nuevo de composición en `src/data/local/` con soporte de overrides para tests.
- Tests de hooks dejan de mockear clases concretas de `src/data/local/*Impl` y pasan a inyección por interfaz.
- Suite de tests de hooks de clients pasa sin regresiones funcionales.
- Lint sin errores en archivos tocados.

### Validaciones Propuestas

- Ejecutar tests puntuales:
  - `npm test -- useClientList.test.ts`
  - `npm test -- useCreateClient.test.ts`
  - `npm test -- useAddMeasurement.test.ts`
  - `npm test -- useClientMeasurementHistory.test.ts`
- Ejecutar lint del proyecto o de archivos modificados.
- Búsqueda de regresión arquitectónica:
  - confirmar que hooks objetivo no importan implementaciones concretas de `src/data/local/*Impl`.
