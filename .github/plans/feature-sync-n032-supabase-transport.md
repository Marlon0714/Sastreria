## Plan de Implementación: N-032 Supabase Sync Transport con ciclo completo

### Contexto

El proyecto ya tiene sincronización local v2 operativa: cola, orquestador, processor y contrato de transporte por entidad en src/data/sync. Actualmente el transporte activo es Noop, por lo que no hay push real a nube. El guardado local de clientes y medidas ya marca syncStatus pendiente y dispara requestRun desde clientsDependencies. N-032 debe reemplazar el transporte Noop por uno real en Supabase, agregar bootstrap de sesión y dejar verificaciones explícitas de esquema, auth y seguridad.

### Objetivo funcional mínimo del sprint

1. Guardar clientes y medidas de camisa/pantalón en Supabase desde la cola local.
2. Permitir consulta de esos datos desde otro dispositivo autenticado del mismo usuario (vía lectura remota y persistencia local).
3. Mantener offline-first: si no hay red o sesión, nunca bloquear guardado local.

### Alcance N-032 (incluye ciclo completo)

- Planner: este plan contractual.
- Builder: implementación técnica de transporte Supabase, auth/session y pull inicial.
- Tester: pruebas unitarias + smoke e2e manual en dos dispositivos.
- Reviewer: validación de seguridad, regresiones y criterios de aceptación.
- ContextKeeper: actualización de contexto operativo y decisiones.

### Tareas

| #   | Tipo                          | Descripción                                                                                                                                                                                                                   | Archivo(s)                                                                                                             |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Config                        | Agregar dependencias oficiales permitidas para nube y sesión segura: @supabase/supabase-js y expo-secure-store.                                                                                                               | package.json                                                                                                           |
| 2   | Config                        | Crear módulo de configuración runtime para leer variables públicas de Supabase, validar presencia y fallar con error controlado sin exponer valores.                                                                          | src/data/supabase/config.ts                                                                                            |
| 3   | Datos/Auth                    | Crear cliente Supabase centralizado con createClient y estrategia de persistencia de sesión basada en SecureStore (adapter get/set/remove).                                                                                   | src/data/supabase/client.ts, src/data/supabase/secureSessionStorage.ts                                                 |
| 4   | Dominio/Auth                  | Definir contrato simple de sesión (getSession, signIn, signOut, refresh, hasValidSession) para desacoplar sync del SDK.                                                                                                       | src/data/supabase/SupabaseAuthRepository.ts                                                                            |
| 5   | Datos/Sync                    | Implementar SupabaseSyncTransport cumpliendo SyncTransport con métodos separados: syncClient, syncCamisaMeasurement, syncPantalonMeasurement; usar upsert por id y control de conflictos por updated_at (last-write-wins).    | src/data/sync/SupabaseSyncTransport.ts                                                                                 |
| 6   | Integración                   | Reemplazar NoopSyncTransport por SupabaseSyncTransport en composición de dependencias. Mantener fallback seguro: si no hay sesión válida, no revienta app, solo falla ítem y queda en error para retry.                       | src/data/local/clientsDependencies.ts                                                                                  |
| 7   | Bootstrap                     | Inicializar sesión al arranque antes de la primera corrida de sync; ejecutar requestRun solo cuando config y sesión estén listas. Registrar errores sanitizados.                                                              | App.tsx                                                                                                                |
| 8   | Pull mínimo multi-dispositivo | Crear caso de uso de pull inicial al autenticar (descargar clientes + medidas del user_id y hacer upsert local en SQLite). Debe ejecutarse antes o junto con requestRun inicial para cumplir consulta en segundo dispositivo. | src/data/sync/SupabasePullSync.ts, src/data/local/ClientRepositoryImpl.ts, src/data/local/MeasurementRepositoryImpl.ts |
| 9   | Test Unitario                 | Probar mapeo y contrato de SupabaseSyncTransport por entidad, manejo de errores de red/auth, y que no se filtren datos sensibles en logs.                                                                                     | src/data/sync/SupabaseSyncTransport.test.ts                                                                            |
| 10  | Test Integración              | Ajustar tests de clientsDependencies para verificar wiring con SupabaseSyncTransport y comportamiento cuando no hay sesión.                                                                                                   | src/data/local/clientsDependencies.test.ts                                                                             |
| 11  | Test Bootstrap                | Agregar pruebas de inicialización de App para escenarios: config faltante, sesión válida, sesión inválida, sync inicial diferido.                                                                                             | App.test.tsx                                                                                                           |
| 12  | Documentación operativa       | Documentar setup de variables, checklist de Supabase y prueba manual en dos dispositivos.                                                                                                                                     | .github/context/project-context.md, .github/context/decisions-log.md                                                   |

### Checklist de verificación de esquema Supabase

#### Tablas requeridas

1. clients
2. camisa_measurements
3. pantalon_measurements

#### Validación de columnas y tipos

1. clients: id uuid/text compatible, first_name text, last_name text, phone text, notes text nullable, created_at timestamptz, updated_at timestamptz, sync_status text/check.
2. camisa_measurements: id uuid/text, client_id uuid/text, espalda/hombro/talle_delantero/talle_trasero/distancia/separacion/pecho/cintura/base/largo/largo_manga/ancho_manga/escote numeric nullable, notes text nullable, created_at timestamptz, updated_at timestamptz, sync_status text/check.
3. pantalon_measurements: id uuid/text, client_id uuid/text, largo/cintura/base/tiro/pierna/rodilla/bota numeric nullable, notes text nullable, created_at timestamptz, updated_at timestamptz, sync_status text/check.

#### PK, FK e índices

1. PK en id para las tres tablas.
2. FK client_id -> clients.id en tablas de medidas.
3. Restricción de unicidad por client_id en camisa_measurements y pantalon_measurements para reflejar modelo v2 local.
4. Índice por user_id y updated_at para lecturas/pull eficientes.

#### Multi-tenant y ownership

1. Columna user_id obligatoria en las tres tablas (uuid) enlazada a auth.users.id.
2. Default user_id = auth.uid() cuando aplique.
3. Validar que ningún registro exista sin user_id.

#### updated_at y consistencia temporal

1. Trigger o lógica consistente para updated_at en insert/update.
2. Zona horaria UTC (timestamptz) y formato ISO 8601 en cliente.
3. Estrategia last-write-wins por updated_at documentada y testeada.

### Checklist de variables de entorno

1. Definir EXPO_PUBLIC_SUPABASE_URL.
2. Definir EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
3. No hardcodear llaves en código, tests o commits.
4. Validar carga en runtime con módulo de config (error claro si faltan).
5. Agregar guía de configuración local y CI sin exponer valores reales.

### Checklist de validación de auth

1. Flujo login email/password funcional en dispositivo A.
2. Token/sesión persistida en SecureStore (no AsyncStorage).
3. Al reiniciar app, sesión se recupera y permite sync sin relogin.
4. Si sesión expira, refresh o reauth controlado sin romper guardado local.
5. Dispositivo B con misma cuenta puede ejecutar pull y ver datos de A.
6. Usuario distinto no puede leer datos ajenos (RLS efectiva).

### Tareas mínimas de seguridad

1. Nunca hardcodear URL, publishable key ni tokens.
2. Guardar access token/refresh token solo en SecureStore.
3. Sanitizar errores y logs: no imprimir PII (nombres, teléfonos, medidas), no imprimir tokens.
4. Manejar errores de auth/network con mensajes genéricos de diagnóstico técnico.
5. Añadir validaciones de entrada antes de upsert remoto para evitar payloads inválidos.

### Criterios de aceptación testables (Sprint N-032)

1. Con sesión válida y red activa, crear cliente en dispositivo A termina con syncStatus local en synced tras correr queue.
2. Con sesión válida y red activa, crear/editar medida de camisa y pantalón en A persiste en Supabase y marca synced local.
3. En dispositivo B (misma cuenta), tras login y pull inicial, aparecen cliente y medidas creados en A en SQLite local.
4. Sin red, crear cliente/medida mantiene flujo offline y deja syncStatus pendiente o error sin crash.
5. Sin sesión válida, SyncQueueProcessor no crashea; marca error/reintento y mantiene datos locales intactos.
6. Tests unitarios nuevos del transporte y wiring pasan en CI local.
7. Validación manual de RLS: usuario X no puede listar ni upsert registros de usuario Y.
8. No existen secretos ni tokens en repositorio, logs de test o snapshots.

### Secuencia de ejecución sugerida para el ciclo completo

1. Builder implementa tareas 1-4 (config, cliente Supabase, auth storage seguro).
2. Builder implementa tarea 5 (SupabaseSyncTransport por entidad).
3. Builder integra tarea 6 (wiring en clientsDependencies).
4. Builder implementa tarea 7 (bootstrap de sesión + sync inicial).
5. Builder implementa tarea 8 (pull inicial multi-dispositivo).
6. Tester ejecuta pruebas unitarias de transporte + wiring.
7. Tester ejecuta smoke manual A/B con misma cuenta.
8. Tester ejecuta caso negativo RLS con segunda cuenta.
9. Reviewer audita seguridad, logs y no-regresiones offline-first.
10. ContextKeeper actualiza backlog y decisiones con evidencias de verificación.

### Riesgos o consideraciones

1. Si el esquema remoto no replica unicidad por client_id, se romperá la semántica de upsert v2.
2. Si RLS está incompleta, puede haber fuga de datos entre usuarios.
3. Si pull inicial se omite, no se cumple criterio de consulta desde cualquier dispositivo.
4. Si SecureStore falla en ciertos dispositivos, definir fallback explícito y alertar al usuario sin perder datos locales.

### Prerrequisitos del usuario durante la ejecución

1. Confirmar que el proyecto Supabase existe y está accesible desde red del entorno de desarrollo.
2. Cargar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en entorno local y CI.
3. Verificar que tablas remotas incluyen user_id y políticas RLS activas por auth.uid().
4. Proveer dos cuentas de prueba (o una cuenta reusable en dos dispositivos) para validación multi-dispositivo.
5. Confirmar que expo-secure-store está permitido en el target Android/iOS del proyecto.

### Comandos de validación recomendados

1. npm run typecheck
2. npm run test -- src/data/sync/SupabaseSyncTransport.test.ts
3. npm run test -- src/data/local/clientsDependencies.test.ts
4. npm run test -- App.test.tsx
5. npm run validate
