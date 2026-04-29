---
description: "Create a complete new feature module for the sastrería app following the feature architecture"
agent: "agent"
argument-hint: "Feature name and description (e.g., 'clients - manage customer profiles and measurements')"
---

Crea un nuevo módulo de feature completo para la app de sastrería.

## Nombre del Feature
${input}

## Pasos a Ejecutar

### 1. Explorar contexto existente
- Revisar `src/features/` para entender la estructura de features ya creados.
- Revisar `src/data/local/` para ver cómo están implementados los repositorios SQLite.
- Revisar `src/navigation/types.ts` para entender el sistema de navegación.

### 2. Crear estructura de carpetas del feature
```
src/features/<nombre>/
  screens/
  components/
  hooks/
  domain/
    types.ts        ← tipos y entidad con BaseEntity
    schemas.ts      ← validaciones Zod
    repository.ts   ← interfaz del repositorio
```

### 3. Implementar en orden
1. `domain/types.ts` — Definir la entidad con todos los campos + BaseEntity (id, createdAt, updatedAt, syncStatus).
2. `domain/schemas.ts` — Schema Zod para formularios de creación y edición.
3. `domain/repository.ts` — Interfaz con métodos: findAll, findById, save, update, delete (solo los necesarios).
4. `data/local/<Feature>RepositoryImpl.ts` — Implementación SQLite con parametrized queries.
5. `hooks/use<Feature>List.ts` — Hook que usa el repositorio para listar.
6. `hooks/use<Feature>Form.ts` — Hook que maneja formulario con React Hook Form + Zod.
7. `screens/<Feature>ListScreen.tsx` — Screen de lista con estados: loading, error, vacío, con datos.
8. `screens/<Feature>FormScreen.tsx` — Screen de formulario de creación/edición.
9. Agregar rutas en `src/navigation/`.

### 4. Tests mínimos
- `hooks/use<Feature>List.test.ts` — happy path, error, lista vacía.
- `domain/schemas.test.ts` — casos válidos e inválidos del schema.

### Reglas Importantes
- Toda entidad con: `id` (UUID), `createdAt`, `updatedAt`, `syncStatus`.
- Nunca SQL por concatenación de strings.
- Nunca lógica de negocio en screens.
- Siempre manejar los 4 estados en screens: loading / error / empty / data.
