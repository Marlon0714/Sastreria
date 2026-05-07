## Plan de Implementación: N-010 Sync Queue Offline-First

### Objetivo

Implementar una cola de sincronización offline-first en `src/data/sync` para entidades de clients y measurements, procesando registros locales con `sync_status` en `pending` o `error`, aplicando reintentos básicos y transiciones de estado a `synced` o `error` sin bloquear la operación local.

### Contexto Encontrado

- Los repositorios locales (`ClientRepositoryImpl`, `MeasurementRepositoryImpl`) ya guardan nuevos registros con `syncStatus: pending`.
- El esquema SQLite (`migrations.ts`) ya define `sync_status` con valores válidos `pending | synced | error` para `clients` y `measurements`.
- `src/data/sync` está vacío, por lo que falta la orquestación de extracción, envío, reintento y actualización de estados.
- El bootstrap en `App.tsx` ejecuta migraciones y crea dependencias, punto adecuado para arrancar la orquestación de sync sin tocar navegación (N-013).

### Alcance Estricto N-010

- Implementar cola de sincronización en `src/data/sync`.
- Gestionar transición `pending -> synced` y `pending/error -> error` con reintentos básicos.
- Integrar con repositorios locales de clients/measurements solo lo necesario para disparar sync tras escrituras locales.
- Agregar pruebas unitarias clave para cola, procesamiento y transición de estados.

### Fuera de Alcance

- N-013 navegación.
- Limpieza follow-up N-014.
- Resolver conflictos avanzados de datos remotos.
- Indicadores UI de sincronización y banners de conectividad.

### Arquitectura Propuesta

1. Cola lógica basada en SQLite (sin tabla nueva):

- Fuente de cola = registros `clients` y `measurements` con `sync_status IN ('pending','error')`.
- Priorización por `updated_at ASC` para procesar primero los cambios más antiguos.

2. Módulos nuevos en `src/data/sync`:

- `types.ts`: tipos de ítem de cola, estado de procesamiento y política de reintentos.
- `SyncQueueRepository.ts`: lectura de pendientes y actualización de estado por entidad.
- `SyncTransport.ts`: contrato de transporte remoto inyectable (adapter).
- `SyncQueueProcessor.ts`: procesamiento por lotes con reintentos y backoff básico.
- `SyncOrchestrator.ts`: coordinación de ejecución (`runNow`, deduplicación de corridas concurrentes).
- `index.ts`: punto único de exportaciones.

3. Integración mínima con datos locales:

- Mantener firmas de interfaces de dominio (`ClientRepository`, `MeasurementRepository`) sin cambio.
- Inyectar callback opcional en implementaciones locales para notificar escritura offline exitosa.
- Disparar `SyncOrchestrator.requestRun()` después de `create` y `addMeasurement` exitosos.

4. Política de reintentos básica:

- `maxRetries = 3` por ítem en una corrida.
- Backoff exponencial simple: 200ms, 400ms, 800ms.
- Éxito: actualizar `sync_status = 'synced'` y `updated_at`.
- Falla final: actualizar `sync_status = 'error'` y `updated_at`.

5. Adaptador remoto por contrato:

- No acoplar N-010 a API real (aún no definida).
- Usar `SyncTransport` inyectable para permitir mock en pruebas y reemplazo futuro por cliente HTTP real.

### Archivos a Crear

- `src/data/sync/types.ts`
- `src/data/sync/SyncTransport.ts`
- `src/data/sync/SyncQueueRepository.ts`
- `src/data/sync/SyncQueueProcessor.ts`
- `src/data/sync/SyncOrchestrator.ts`
- `src/data/sync/index.ts`
- `src/data/sync/SyncQueueProcessor.test.ts`
- `src/data/sync/SyncOrchestrator.test.ts`
- `src/data/sync/SyncQueueRepository.test.ts`

### Archivos a Modificar

- `src/data/local/ClientRepositoryImpl.ts`
- `src/data/local/MeasurementRepositoryImpl.ts`
- `src/data/local/clientsDependencies.ts`
- `App.tsx`
- `src/data/local/ClientRepositoryImpl.test.ts`
- `src/data/local/MeasurementRepositoryImpl.test.ts`

### Tareas (Orden de Ejecución)

| #   | Tipo                    | Descripción                                                                                                                           | Archivo(s)                                                                                        |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Dominio Sync            | Definir tipos de cola: `SyncEntityType`, `SyncQueueItem`, `RetryPolicy`, `SyncRunResult`                                              | `src/data/sync/types.ts`                                                                          |
| 2   | Datos Sync              | Definir contrato `SyncTransport` con método por tipo de entidad (client/measurement)                                                  | `src/data/sync/SyncTransport.ts`                                                                  |
| 3   | Datos Sync              | Implementar `SyncQueueRepository` para leer pendientes (`pending`,`error`) y actualizar estado por entidad con queries parametrizadas | `src/data/sync/SyncQueueRepository.ts`                                                            |
| 4   | Lógica Sync             | Implementar `SyncQueueProcessor.runOnce()` con lotes, reintentos básicos y transición de estado                                       | `src/data/sync/SyncQueueProcessor.ts`                                                             |
| 5   | Lógica Sync             | Implementar `SyncOrchestrator` para deduplicar corridas simultáneas y exponer `requestRun()`                                          | `src/data/sync/SyncOrchestrator.ts`, `src/data/sync/index.ts`                                     |
| 6   | Integración Datos       | Agregar callback opcional `onWriteCommitted` en repositorios locales y ejecutarlo tras `INSERT` exitoso                               | `src/data/local/ClientRepositoryImpl.ts`, `src/data/local/MeasurementRepositoryImpl.ts`           |
| 7   | Integración DI          | Construir default sync stack en composition root local y enlazar callback de repositorios con orchestrator                            | `src/data/local/clientsDependencies.ts`                                                           |
| 8   | Bootstrap               | Inicializar y disparar una corrida inicial de sync después de migraciones y arranque de app                                           | `App.tsx`                                                                                         |
| 9   | Test Unitario           | Probar `SyncQueueRepository`: selección de pendientes y update de estados correctos por tabla                                         | `src/data/sync/SyncQueueRepository.test.ts`                                                       |
| 10  | Test Unitario           | Probar `SyncQueueProcessor`: éxito marca `synced`; fallo tras reintentos marca `error`; respeta backoff                               | `src/data/sync/SyncQueueProcessor.test.ts`                                                        |
| 11  | Test Unitario           | Probar `SyncOrchestrator`: evita corridas concurrentes duplicadas y permite nueva corrida al finalizar                                | `src/data/sync/SyncOrchestrator.test.ts`                                                          |
| 12  | Test Integración Mínima | Ajustar tests de repositorios para validar invocación del callback opcional post escritura                                            | `src/data/local/ClientRepositoryImpl.test.ts`, `src/data/local/MeasurementRepositoryImpl.test.ts` |

### Pseudoflujo Operativo (Ilustrativo)

- App inicia -> migraciones OK -> `SyncOrchestrator.requestRun()`.
- Usuario crea client/measurement offline -> repo guarda local con `pending` -> callback dispara `requestRun()`.
- Processor consulta `pending/error` -> intenta enviar con transport.
- Si envío OK -> `sync_status = synced`.
- Si envío falla -> reintenta con backoff hasta `maxRetries`; si falla definitivamente -> `sync_status = error`.

### Criterios DoD Verificables

1. Existe implementación de cola en `src/data/sync` con separación clara: tipos, repositorio de cola, processor y orchestrator.
2. `ClientRepositoryImpl.create` y `MeasurementRepositoryImpl.addMeasurement` disparan notificación de sync tras commit local exitoso (sin cambiar contratos de dominio).
3. Processor convierte registros `pending` y `error` a `synced` cuando el transporte responde éxito.
4. Processor deja registros en `error` tras agotar reintentos configurados.
5. No se modifica navegación ni se incluyen cambios de N-013.
6. No se ejecuta limpieza arquitectónica de N-014 en este alcance.
7. Tests unitarios nuevos para cola/orquestador/procesador pasan en CI local.
8. Tests existentes de repositorios siguen pasando tras integración mínima.

### Riesgos y Mitigaciones

- Riesgo: no existe contrato backend definitivo.
- Mitigación: `SyncTransport` inyectable y mockeable; implementación remota real queda desacoplada.

- Riesgo: corridas concurrentes pueden duplicar envíos.
- Mitigación: lock interno en `SyncOrchestrator` y serialización de `runOnce()`.

- Riesgo: crecimiento de alcance con conflictos de sincronización.
- Mitigación: limitar N-010 a transiciones de estado y reintentos básicos; conflictos avanzados se difieren.

- Riesgo: pruebas frágiles por temporizadores.
- Mitigación: `jest.useFakeTimers()` y aserciones de delays/backoff por intentos.

### Comandos de Validación

- `npm run typecheck`
- `npm run test -- src/data/sync/SyncQueueRepository.test.ts`
- `npm run test -- src/data/sync/SyncQueueProcessor.test.ts`
- `npm run test -- src/data/sync/SyncOrchestrator.test.ts`
- `npm run test -- src/data/local/ClientRepositoryImpl.test.ts`
- `npm run test -- src/data/local/MeasurementRepositoryImpl.test.ts`
- `npm run validate`
