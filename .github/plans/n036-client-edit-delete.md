# Plan de Implementación: N-036 — CRUD completo de clientes (editar + eliminar)

## Contexto

El feature de clientes tiene create/read completo pero carece de update y delete.
`ClientRepository` (interfaz) solo expone `create`, `findAll`, `findById`.
`ClientRepositoryImpl` implementa SQLite directamente sin transacción compartida para delete.
El sistema de sync lee `sync_status = 'pending'` directamente de las tablas de entidades; las
eliminaciones hard-delete no dejan rastro para sincronizar, por lo que se introduce una tabla
`sync_delete_log` (migración v4) para registrar deletes pendientes de subir al backend futuro.
El patrón de hook a seguir es `useCreateClient` (inyección de dependencias vía
`ClientsDependenciesProvider`, estado `isSubmitting`/`error`, validación con Zod).
`ClientCreateScreen` es la referencia de UI para el formulario de edición.

---

## Tareas

| #   | ID   | Tipo                    | Archivo                                               | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Criterio de salida                                                                              |
| --- | ---- | ----------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | T-01 | Dominio — tipo          | `src/features/clients/domain/types.ts`                | Agregar `UpdateClientDTO` con campos `id`, `firstName`, `lastName`, `phone`, `notes?`                                                                                                                                                                                                                                                                                                                                                                           | El tipo compila sin errores; no duplica campos con `CreateClientDTO`                            |
| 2   | T-02 | Dominio — schema        | `src/features/clients/domain/schemas.ts`              | Agregar `updateClientSchema` (mismas reglas que `createClientSchema` + campo `id: z.string().uuid()`) y exportar `UpdateClientSchemaInput` / `UpdateClientSchemaOutput`                                                                                                                                                                                                                                                                                         | Schema compila; `safeParse` rechaza `id` vacío y campos inválidos                               |
| 3   | T-03 | Dominio — interfaz      | `src/features/clients/domain/repository.ts`           | Añadir `update(input: UpdateClientDTO): Promise<Client>` y `delete(id: string): Promise<void>` a `ClientRepository`                                                                                                                                                                                                                                                                                                                                             | TypeScript fuerza implementación en todas las clases que la implementen                         |
| 4   | T-04 | Datos — migración       | `src/data/local/migrations.ts`                        | Agregar migración v4 `v4_sync_delete_log`: nueva tabla `sync_delete_log (id TEXT PK, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, deleted_at TEXT NOT NULL, sync_status TEXT DEFAULT 'pending')`. Incrementar `TARGET_SCHEMA_VERSION` a 4                                                                                                                                                                                                                | La DB arranca correctamente; `PRAGMA user_version` devuelve 4 en instalación nueva y en upgrade |
| 5   | T-05 | Datos — impl.           | `src/data/local/ClientRepositoryImpl.ts`              | Implementar `update()`: `UPDATE clients SET first_name=?, last_name=?, phone=?, notes=?, updated_at=?, sync_status='pending' WHERE id=?` seguido de `notifyWriteCommitted()`. Retornar el `Client` actualizado                                                                                                                                                                                                                                                  | Actualizar un cliente existente persiste cambios y `syncStatus` queda `'pending'`               |
| 6   | T-06 | Datos — impl.           | `src/data/local/ClientRepositoryImpl.ts`              | Implementar `delete()`: dentro de una única `withTransactionAsync`: (1) `DELETE FROM camisa_measurements WHERE client_id=?`, (2) `DELETE FROM pantalon_measurements WHERE client_id=?`, (3) `DELETE FROM clients WHERE id=?`, (4) `INSERT INTO sync_delete_log ...` con `entity_type='client'`, `entity_id=id`, `deleted_at=now`, `sync_status='pending'`. Llamar `notifyWriteCommitted()`                                                                      | Cliente y sus medidas desaparecen de las tablas; queda una fila en `sync_delete_log`            |
| 7   | T-07 | Sync — tipos            | `src/data/sync/types.ts`                              | Añadir campo `operationType: 'upsert' \| 'delete'` a `SyncQueueItemBase`. Actualizar las tres interfaces derivadas (`SyncClientQueueItem`, `SyncCamisaQueueItem`, `SyncPantalonQueueItem`) para que el campo sea requerido. En `SyncQueueRepository.toClientQueueItem` (y los otros dos mappers) añadir `operationType: 'upsert'` por defecto                                                                                                                   | Compila sin errores; tests existentes del procesador siguen verdes                              |
| 8   | T-08 | Lógica — hook           | `src/features/clients/hooks/useUpdateClient.ts`       | Crear hook `useUpdateClient(dependencies?)` siguiendo el patrón de `useCreateClient`: estado `isSubmitting`/`error`, función `updateClient(values: UpdateClientSchemaInput): Promise<Client \| null>`, función `validate`. Llama `clientRepository.update(payload)` con el output del schema                                                                                                                                                                    | Hook retorna `Client` actualizado en éxito; setea `error` en fallo                              |
| 9   | T-09 | Lógica — hook           | `src/features/clients/hooks/useDeleteClient.ts`       | Crear hook `useDeleteClient(dependencies?)`: estado `isDeleting`/`error`, función `deleteClient(id: string): Promise<boolean>`. Llama `clientRepository.delete(id)`                                                                                                                                                                                                                                                                                             | Retorna `true` en éxito; `false` y registra error en fallo                                      |
| 10  | T-10 | Navegación — tipos      | `src/navigation/types.ts`                             | Añadir ruta `ClientEdit: { clientId: string }` a `ClientsStackParamList`                                                                                                                                                                                                                                                                                                                                                                                        | TypeScript valida `navigation.navigate('ClientEdit', { clientId })`                             |
| 11  | T-11 | Navegación — stack      | `src/navigation/ClientsStackNavigator.tsx`            | Importar `ClientEditScreen` y registrar `<Stack.Screen name="ClientEdit" component={ClientEditScreen} options={{ title: 'Editar cliente' }} />`                                                                                                                                                                                                                                                                                                                 | La ruta existe en el stack; no rompe tests del navigator                                        |
| 12  | T-12 | UI — pantalla           | `src/features/clients/screens/ClientEditScreen.tsx`   | Nueva pantalla. Props: `NativeStackScreenProps<ClientsStackParamList, 'ClientEdit'>`. Flujo: (1) `useClientDetail(clientId)` para cargar datos, (2) `useForm` con `defaultValues` pre-llenados del cliente, (3) `useUpdateClient` para submit, (4) en éxito llamar `navigation.goBack()`. Misma estructura de campos que `ClientCreateScreen` (firstName, lastName, phone, notes). Mostrar `LoadingView` mientras carga y `ErrorView` si falla la carga inicial | Pantalla renderiza con datos pre-llenados; submit actualiza y vuelve al detalle                 |
| 13  | T-13 | UI — pantalla existente | `src/features/clients/screens/ClientDetailScreen.tsx` | Agregar dos botones al final del contenido: (A) **"Editar"** — `navigation.navigate('ClientEdit', { clientId: client.id })`; estilo `secondaryButtonBlock` ya definido en el componente. (B) **"Eliminar"** — `Alert.alert('Eliminar cliente', '¿Seguro?', [{text:'Cancelar'}, {text:'Eliminar', style:'destructive', onPress: handleDelete}])`; `handleDelete` llama `useDeleteClient.deleteClient` y si retorna `true` hace `navigation.popToTop()`           | Botones visibles; flujo de eliminación con confirmación navega a lista                          |
| 14  | T-14 | Test — repositorio      | `src/data/local/ClientRepositoryImpl.test.ts`         | Agregar casos: `update` persiste cambios y `sync_status='pending'`; `update` con id inexistente no lanza (no-op SQLite); `delete` ejecuta las 3 DELETEs en transacción e inserta en `sync_delete_log`; `delete` llama `onWriteCommitted`                                                                                                                                                                                                                        | Todos los casos pasan; mocks de DB verifican SQL correcto                                       |
| 15  | T-15 | Test — hook             | `src/features/clients/hooks/useUpdateClient.test.ts`  | Crear archivo de test con casos: submit exitoso retorna `Client` actualizado; submit con repositorio que lanza setea `error`; `validate` retorna errores Zod en campos inválidos                                                                                                                                                                                                                                                                                | Cobertura de ramas del hook ≥ 90 %                                                              |
| 16  | T-16 | Test — hook             | `src/features/clients/hooks/useDeleteClient.test.ts`  | Casos: delete exitoso retorna `true`; delete que lanza retorna `false` y setea `error`                                                                                                                                                                                                                                                                                                                                                                          | Cobertura de ramas ≥ 90 %                                                                       |

---

## Orden de ejecución (dependencias)

```
T-01 → T-02 → T-03
                └─→ T-05, T-06  (necesitan interfaz extendida)
T-04           (independiente; migraciones de DB)
T-07           (independiente; solo tipos de sync)
T-03 + T-08    (hook update depende de interfaz)
T-03 + T-09    (hook delete depende de interfaz)
T-08 + T-10 → T-12   (pantalla necesita hook y ruta)
T-09 + T-13    (detalle necesita hook delete)
T-11           (navigator necesita T-12 creada)
T-14           (después de T-05 + T-06)
T-15           (después de T-08)
T-16           (después de T-09)
```

Diagrama simplificado:

```
T-01 ──► T-02 ──► T-03 ──┬──► T-05 ──► T-14
                          ├──► T-06 ──► T-14
                          ├──► T-08 ──► T-15 ──► T-12 ──► T-11
                          └──► T-09 ──► T-16 ──► T-13
T-04 (independiente)
T-07 (independiente; no bloquea nada del feature, pero actualizar antes de T-14 para compilar)
T-10 ──► T-11, T-12, T-13
```

---

## Decisiones de Diseño

### `UpdateClientDTO` vs reusar `CreateClientDTO`

`CreateClientDTO` no tiene `id`; `UpdateClientDTO` lo requiere. Se define como tipo separado para
mantener semántica clara en la interfaz del repositorio y evitar casts en la implementación.

### `updateClientSchema` independiente de `createClientSchema`

Agrega solo el campo `id` (uuid obligatorio). No extiende con `.merge()` de Zod para evitar
acoplamiento; es una definición standalone de pocas líneas.

### Hard delete + `sync_delete_log`

El delete es hard para no contaminar la lista de clientes con registros "tombstone". La tabla
`sync_delete_log` actúa como cola de borrados pendientes de sincronizar cuando haya backend. La
migración v4 agrega la tabla sin cambiar las tablas existentes, por lo que es segura en upgrade.

### `operationType` en `SyncQueueItemBase`

Se añade como campo requerido con valor por defecto `'upsert'` en los mappers existentes. El
`SyncQueueProcessor` y `SyncTransport` no necesitan cambiar en esta iteración; el campo está
disponible para que el transporte lo use cuando se implemente el backend.

### `delete` usa `withTransactionAsync`

Las tres eliminaciones (camisa, pantalón, cliente) y la inserción en `sync_delete_log` deben ser
atómicas. Si falla cualquiera, la operación completa se revierte y no se deja el cliente en estado
inconsistente.

### Navegación post-delete: `popToTop()`

Tras eliminar, `ClientDetailScreen` ya no tiene entidad válida. `popToTop()` lleva al usuario a
`ClientListScreen` evitando que quede una pantalla de detalle huérfana en el stack.

### Pre-llenado del form en `ClientEditScreen`

Se usa `useClientDetail(clientId)` (hook existente) para cargar los datos antes de montar el form.
`useForm` recibe `defaultValues` del cliente ya cargado. Si el detail todavía está en carga se
muestra `LoadingView`; si falla se muestra `ErrorView`.

---

## Riesgos y Consideraciones

- **Migración v4 en dispositivos con datos**: `CREATE TABLE IF NOT EXISTS` es idempotente; no afecta
  datos existentes. Verificar que `TARGET_SCHEMA_VERSION` se incremente de 3 a 4 y que el runner
  de migraciones ya existente aplique la versión faltante correctamente.
- **Tests de `ClientRepositoryImpl`**: el mock actual no expone `withTransactionAsync`. Habrá que
  agregar `withTransactionAsync: jest.fn(async (cb) => cb())` al `mockDatabase` para que T-06
  funcione en tests.
- **`SyncQueueRepository` mappers**: al agregar `operationType` como campo requerido en T-07, los
  mappers `toClientQueueItem`, `toCamisaQueueItem`, `toPantalonQueueItem` deben actualizarse
  simultáneamente para que el proyecto compile. Hacerlo en el mismo commit que T-07.
- **Alert en tests**: `Alert.alert` debe mockearse en cualquier test de `ClientDetailScreen` que se
  agregue en el futuro; no hay tests de esa pantalla actualmente, por lo que no impacta a T-13.
