---
description: "Use when creating domain models, repository interfaces, business logic, SQLite queries, sync logic, or Zod schemas. Covers the data and domain layers of the sastrería app."
applyTo: "src/{features,data}/**/*.ts"
---

# Instrucciones de Dominio y Datos

## Tipos de Dominio
- Definir tipos en `features/<feature>/domain/types.ts`.
- Separar tipo de entrada (formulario) del tipo de entidad persistida.
- Toda entidad persistida tiene estos campos obligatorios:

```ts
interface BaseEntity {
  id: string;          // UUID generado en cliente
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  syncStatus: 'pending' | 'synced' | 'error';
}
```

## Features del Proyecto

### Clientes y Medidas (`features/clients/`)
- Entidad `Client`: id, nombre, apellido, teléfono, notas, medidas, syncStatus.
- Entidad `Measurement`: id, clientId, fecha, pecho, cintura, cadera, largo, notas.
- Las medidas son históricas: no editar, agregar nueva versión.

### Cronograma de Arreglos (`features/schedule/`)
- Entidad `Alteration`: id, clientId, descripción, tipo, estadoArreglo, fechaEntrega, precio, notas.
- Estado: `pendiente` | `en_proceso` | `listo` | `entregado`.
- Agrupar por día en la UI usando `SectionList`.

### Catálogo de Precios (`features/pricing/`)
- Entidad `PriceItem`: id, nombre, descripción, categoría, precio, activo.
- Categorías como enum o unión de strings literales.

## Repositorios
- Definir interfaz primero en `features/<feature>/domain/repository.ts`.
- Implementación SQLite en `src/data/local/<Feature>RepositoryImpl.ts`.
- Nunca acceder a SQLite directamente desde hooks o screens.

```ts
// Interfaz (features/clients/domain/repository.ts)
export interface ClientRepository {
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  save(client: Omit<Client, 'id' | 'createdAt' | 'syncStatus'>): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<Client>;
}
```

## SQLite — Reglas de Seguridad
- **Siempre parametrized queries**, nunca concatenación de strings.
- Validar y sanear todos los inputs con Zod antes de persistir.
- Envolver operaciones críticas en transacciones.

```ts
// ✅ Correcto
await db.runAsync('INSERT INTO clients (id, nombre) VALUES (?, ?)', [id, nombre]);

// ❌ Prohibido
await db.runAsync(`INSERT INTO clients (id, nombre) VALUES ('${id}', '${nombre}')`);
```

## Sincronización Offline
- Cola de sync en `src/data/sync/SyncQueue.ts`.
- Al guardar, marcar `syncStatus: 'pending'`.
- Al sync exitoso, actualizar a `'synced'`.
- Al fallar, marcar `'error'` y reintentar con backoff exponencial.
- No exponer detalles de sync en la UI; solo indicadores visuales sutiles.

## IDs
- Siempre generar UUIDs en cliente con `expo-crypto` o `uuid`.
- Nunca usar IDs autoincrement de SQLite como identificador externo.
