---
description: "Generate unit tests for a hook, repository, schema, or screen in the sastrería app following Jest and Testing Library conventions"
agent: "agent"
argument-hint: "File path or name to test (e.g., 'useClientList hook' or 'src/features/clients/hooks/useClientList.ts')"
---

Genera tests unitarios completos para el código indicado.

## Código a Testear
${input}

## Pasos a Ejecutar

### 1. Leer el código fuente
- Leer el archivo indicado completamente.
- Identificar: tipo (hook / repositorio / schema / screen / util).
- Identificar: dependencias a mockear (repositorios, SQLite, navegación).

### 2. Revisar tests existentes del proyecto
- Buscar en `__tests__/` y `*.test.ts` archivos similares.
- Usar los mismos patrones, factories y helpers ya establecidos.

### 3. Generar el archivo de tests
Ubicación: junto al archivo fuente con extensión `.test.ts` o `.test.tsx`.

Estructura por tipo:

**Hook:**
- Happy path: retorna datos esperados.
- Loading: estado inicial es `isLoading: true`.
- Error: cuando el repositorio rechaza, expone el error.
- Edge cases: lista vacía, valor null, etc.

**Repositorio:**
- Mock de SQLite.
- Verifica que las queries son parametrizadas (nunca concatenación).
- Verifica resultado mapeado correctamente.

**Schema Zod:**
- Todos los campos válidos pasan.
- Cada campo inválido produce el error esperado.
- Casos de borde: strings vacíos, números negativos, campos opcionales.

**Screen:**
- Renderiza loading mientras carga.
- Renderiza error con mensaje.
- Renderiza estado vacío.
- Renderiza lista/contenido con datos.

### 4. Factories de datos
Si no existen factories para el tipo, crearlas en `src/__tests__/factories/<type>.factory.ts`:
```ts
export const build<Entity> = (overrides?: Partial<<Entity>>): <Entity> => ({
  id: 'test-uuid',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  syncStatus: 'synced',
  // campos del dominio...
  ...overrides,
});
```

### 5. Cobertura esperada
- Mínimo 70% de branches, funciones y líneas.
- Todos los caminos de error cubiertos.
- Casos de datos vacíos cubiertos.
