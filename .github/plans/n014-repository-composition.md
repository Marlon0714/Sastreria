## Plan de Implementacion: N-014 Repository Composition para desacoplar hooks

### Objetivo

Desacoplar los hooks del feature clients de implementaciones concretas de infraestructura (SQLite) mediante un modulo de composicion por interfaces, preservando comportamiento funcional, compatibilidad con UI actual y cobertura de pruebas en TypeScript strict.

### Contexto Relevante

- Hoy los hooks `useClientList`, `useCreateClient`, `useAddMeasurement` y `useClientMeasurementHistory` instancian `ClientRepositoryImpl` o `MeasurementRepositoryImpl` dentro del modulo.
- Ya existen contratos de dominio (`ClientRepository`, `MeasurementRepository`) en `src/features/clients/domain/repository.ts`.
- No existe composition root en runtime para repositorios del feature clients.
- `src/features/clients/screens/ClientDetailScreen.tsx` tambien instancia `ClientRepositoryImpl` directamente; este plan lo registra como riesgo de continuidad, pero queda fuera de alcance de N-014 por requerimiento enfocado en hooks.

### Alcance

Incluye:

- Creacion de modulo de composicion de dependencias por interfaces para clients.
- Migracion de 4 hooks de clients a consumo de interfaces (sin new de implementaciones concretas dentro de hooks).
- Refactor de pruebas unitarias de hooks para inyeccion explicita y sin mocks por path de implementacion concreta.
- Validaciones de regresion funcional en hooks y pantallas consumidoras.

No incluye:

- Refactor de screens que hoy usan implementaciones concretas (ej. ClientDetailScreen).
- Cambios de esquema SQLite o migraciones de base de datos.
- Cambios de sync queue en `src/data/sync`.

### Archivos Objetivo

- `src/features/clients/domain/repository.ts`
- `src/data/local/clientsDependencies.ts` (nuevo)
- `src/features/clients/hooks/useClientList.ts`
- `src/features/clients/hooks/useCreateClient.ts`
- `src/features/clients/hooks/useAddMeasurement.ts`
- `src/features/clients/hooks/useClientMeasurementHistory.ts`
- `src/features/clients/hooks/useClientList.test.ts`
- `src/features/clients/hooks/useCreateClient.test.ts`
- `src/features/clients/hooks/useAddMeasurement.test.ts`
- `src/features/clients/hooks/useClientMeasurementHistory.test.ts`
- `src/features/clients/screens/ClientListScreen.tsx` (solo verificacion de compatibilidad)
- `src/features/clients/screens/ClientCreateScreen.tsx` (solo verificacion de compatibilidad)
- `src/features/clients/screens/MeasurementCreateScreen.tsx` (solo verificacion de compatibilidad)
- `src/features/clients/screens/MeasurementHistoryScreen.tsx` (solo verificacion de compatibilidad)

### Tareas Paso a Paso

| #   | Tipo        | Descripcion                                                                                                                                                                                    | Archivo(s)                                                     |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Dominio     | Definir tipo de composicion para clients (ej. `ClientsDependencies`) usando interfaces ya existentes. Debe expresar dependencias minimas consumidas por hooks.                                 | src/features/clients/domain/repository.ts                      |
| 2   | Datos       | Crear composition root local para clients que construya dependencias runtime con implementaciones SQLite (`ClientRepositoryImpl`, `MeasurementRepositoryImpl`) pero exporte solo interfaces.   | src/data/local/clientsDependencies.ts                          |
| 3   | Datos       | Incluir estrategia de override parcial para test (`createClientsDependencies(overrides?)`) y acceso estable a instancia default para evitar recrear repositorios en cada render.               | src/data/local/clientsDependencies.ts                          |
| 4   | Lógica      | Refactor de `useClientList` para resolver `ClientRepository` desde dependencias inyectadas (argumento opcional o dependency bag parcial) y eliminar import concreto de `ClientRepositoryImpl`. | src/features/clients/hooks/useClientList.ts                    |
| 5   | Test        | Refactor de test de `useClientList` para inyeccion por interfaz, manteniendo cobertura de carga inicial, error y recuperacion por `reload`.                                                    | src/features/clients/hooks/useClientList.test.ts               |
| 6   | Lógica      | Refactor de `useCreateClient` para consumir `ClientRepository` via composicion/inyeccion, preservando parseo Zod, limpieza de payload y reset del formulario.                                  | src/features/clients/hooks/useCreateClient.ts                  |
| 7   | Test        | Actualizar test de `useCreateClient` para pasar doble de prueba por interfaz sin `jest.mock` de clase concreta. Mantener asserts de validacion y manejo de errores.                            | src/features/clients/hooks/useCreateClient.test.ts             |
| 8   | Lógica      | Refactor de `useAddMeasurement` para consumir `MeasurementRepository` por interfaz y mantener conversion de input, estados `isSubmitting` y mensaje de error UX.                               | src/features/clients/hooks/useAddMeasurement.ts                |
| 9   | Test        | Refactor de test de `useAddMeasurement` a inyeccion por interfaz manteniendo escenarios happy path/error y validacion de payload transformado.                                                 | src/features/clients/hooks/useAddMeasurement.test.ts           |
| 10  | Lógica      | Refactor de `useClientMeasurementHistory` para consumir `MeasurementRepository` via composicion/inyeccion, preservando carga por `clientId`, `reload` y estado loading/error.                  | src/features/clients/hooks/useClientMeasurementHistory.ts      |
| 11  | Test        | Actualizar test de `useClientMeasurementHistory` para inyeccion por interfaz, conservando pruebas de carga inicial, error y recuperacion.                                                      | src/features/clients/hooks/useClientMeasurementHistory.test.ts |
| 12  | Integracion | Verificar que pantallas consumidoras no requieran cambios de API de hooks. Si hay cambio de firma, debe ser backward-compatible (argumento opcional).                                          | src/features/clients/screens/\*.tsx                            |
| 13  | Calidad     | Ejecutar lint y pruebas objetivo del feature clients; validar ausencia de imports concretos en hooks objetivo.                                                                                 | package.json scripts + hooks/tests                             |

### Estrategia de Migracion Hook por Hook

1. useClientList

- Introducir resolucion de dependencia `ClientRepository` desde composicion central.
- Mantener firma publica del hook para pantallas actuales.
- Cambiar pruebas para inyectar fake repository y eliminar mock por path de `ClientRepositoryImpl`.

2. useCreateClient

- Inyectar `ClientRepository` por interfaz sin tocar logica de validacion Zod.
- Mantener comportamiento de `reset` y mensajes UX.
- Reescribir pruebas para pasar doble de prueba y validar payload parseado.

3. useAddMeasurement

- Inyectar `MeasurementRepository` por interfaz.
- Preservar parseo de decimales y texto (`notes`) y salida `Measurement | null`.
- Reescribir pruebas con mock funcional de `addMeasurement` sin mock de implementacion concreta.

4. useClientMeasurementHistory

- Inyectar `MeasurementRepository` por interfaz.
- Mantener reload estable y dependencia por `clientId`.
- Reescribir pruebas para cubrir carga inicial, manejo de error y recuperacion.

Orden recomendado de ejecucion Builder:

- Primero composition root + tipos de dependencias.
- Luego migracion hook + test en pares (hook/test) para reducir regresiones.
- Finalmente validacion de compatibilidad en screens y chequeos de calidad.

### Cambios Esperados en Tests

- Eliminar dependencia de `jest.mock("../../../data/local/*RepositoryImpl")` en tests de hooks.
- Introducir dobles de prueba tipados por interfaz (`ClientRepository`, `MeasurementRepository`) pasados directamente al hook.
- Mantener estructura de asserts observable (loading/error/data), evitando asserts de implementacion interna.
- Conservar `act` y `waitFor` para flujos async.
- Verificar que no baje cobertura en hooks de clients (referencia minima del proyecto: 70%).

### Riesgos y Mitigacion

- Riesgo: recrear repositorios en cada render y afectar estabilidad de callbacks.
- Mitigacion: exponer dependencias default singleton por modulo (instancia estable) y resolverlas fuera del cuerpo del hook cuando aplique.

- Riesgo: ruptura de API de hooks usada por screens.
- Mitigacion: usar argumento de dependencia opcional o resolver default interno, sin requerir cambios en llamadas existentes.

- Riesgo: tests fragiles por migracion de estrategia de mocks.
- Mitigacion: centralizar builders de doubles simples y mantener asserts de contrato funcional.

- Riesgo: desalineacion con arquitectura UI -> dominio -> datos.
- Mitigacion: hooks solo conocen contratos de dominio; implementaciones concretas quedan encapsuladas en composition root de capa datos.

- Riesgo: alcance incompleto por acoplamiento adicional en screen `ClientDetailScreen`.
- Mitigacion: registrar deuda tecnica explicita en salida de Builder y dejar ticket follow-up para fase posterior.

### Definition of Done (Verificable)

1. Los 4 hooks objetivo ya no importan ni instancian `ClientRepositoryImpl` o `MeasurementRepositoryImpl`.
2. Existe modulo de composicion en datos (`src/data/local/clientsDependencies.ts`) que exporta dependencias por interfaces y permite overrides para tests.
3. Las pantallas existentes siguen compilando sin cambios obligatorios en llamadas a hooks.
4. Los 4 tests de hooks migrados pasan sin usar mocks de rutas `src/data/local/*RepositoryImpl`.
5. `npm test -- useClientList.test.ts useCreateClient.test.ts useAddMeasurement.test.ts useClientMeasurementHistory.test.ts` en verde.
6. `npm run lint` sin errores en archivos modificados.
7. Busqueda de regresion confirma cero imports de implementaciones concretas en hooks objetivo.

### Checklist de Validacion Final Builder

- `npm run lint`
- `npm test -- useClientList.test.ts`
- `npm test -- useCreateClient.test.ts`
- `npm test -- useAddMeasurement.test.ts`
- `npm test -- useClientMeasurementHistory.test.ts`
- Buscar en hooks objetivo: `RepositoryImpl` debe retornar 0 coincidencias.

### Notas de Diseno para Builder

- Mantener TypeScript strict sin `any`.
- No alterar comportamiento de offline-first: los repositorios concretos deben seguir marcando `syncStatus: pending` como hoy.
- Mantener separacion de capas: UI consume hooks, hooks consumen contratos, composicion en datos resuelve implementaciones.
