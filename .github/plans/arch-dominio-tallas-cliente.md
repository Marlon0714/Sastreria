# Propuesta de Modelo de Datos Extendida (N-045)

## 1. Cliente

```ts
export interface Client {
  id: string;
  name: string;
  lastName: string;
  phones: string[]; // hasta 3 teléfonos
  cedula?: string; // opcional
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // ...otros campos existentes
}
```

- Validaciones: phones debe tener 1-3 elementos, cada uno válido (regex local).
- La cédula es opcional y validada solo si se ingresa.

## 2. Tallas/Medidas por Prenda

### Camisa

```ts
export interface CamisaMeasurement {
  id: string;
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  cuello?: number;
  brazo?: number;
  puño?: number;
  // ...otros campos existentes
  createdAt: string;
  updatedAt: string;
}
```

### Pantalón

```ts
export interface PantalonMeasurement {
  id: string;
  clientId: string;
  largo?: number;
  cintura?: number;
  cadera?: number;
  muslo?: number;
  rodilla?: number;
  bota?: number;
  // ...otros campos existentes
  createdAt: string;
  updatedAt: string;
}
```

### Saco / Chaleco

```ts
export interface SacoMeasurement {
  id: string;
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  // ...otros campos específicos
  createdAt: string;
  updatedAt: string;
}

export interface ChalecoMeasurement {
  id: string;
  clientId: string;
  espalda?: number;
  talleTrasero?: number;
  largo?: number;
  pecho?: number;
  cintura?: number;
  base?: number;
  escote?: number;
  // ...otros campos específicos
  createdAt: string;
  updatedAt: string;
}
```

## 3. Migraciones y Validaciones

- Cada tabla de medidas debe tener UNIQUE por clientId y prenda.
- Validaciones Zod: todos los campos numéricos >= 0, opcionales.
- Los forms deben permitir guardar medidas parciales.
- Sincronización: los nuevos campos deben incluirse en la cola offline y sync cloud.

---

## Checklist técnico para ejecución (N-045)

### 1. Modelado de dominio y validaciones

- [ ] Definir/actualizar interfaces y Zod schemas para:
  - Cliente: `phones: string[]` (1-3), `cedula?: string`
  - CamisaMeasurement, PantalonMeasurement, SacoMeasurement, ChalecoMeasurement (según modelo propuesto)
  - Validaciones: phones válidos, cédula opcional, campos numéricos >= 0
  - Archivos: `src/features/clients/domain/client.ts`, `src/features/clients/domain/schemas.ts`, `src/features/clients/domain/types.ts`, `src/features/clients/domain/validation.ts`, `src/features/clients/domain/measurement*.ts`

### 2. Migraciones SQLite

- [ ] Crear migraciones para:
  - Agregar campos `phones` (array/string separado por comas) y `cedula` a tabla `clients`
  - Crear tablas `saco_measurements` y `chaleco_measurements` (UNIQUE por clientId)
  - Agregar/ajustar campos en `camisa_measurements` y `pantalon_measurements` si aplica
  - Archivos: `src/data/local/migrations.ts`, `src/data/local/database.ts`

### 3. Actualización de repositorios y hooks

- [x] Actualizar repositorios para soportar nuevos campos/tablas:
  - Métodos CRUD para teléfonos/cédula y nuevas medidas
  - Hooks: `useClientDetail`, `useUpsertClient`, `useSacoMeasurement`, `useChalecoMeasurement`, etc.
  - Archivos: `src/features/clients/domain/repository.ts`, `src/data/local/MeasurementRepositoryImpl.ts`, `src/features/clients/hooks/`

### 4. Forms y screens

- [x] Actualizar/crear forms y screens:
  - ClientForm: hasta 3 teléfonos, cédula opcional
  - Medidas: forms para saco y chaleco, actualizar forms de camisa/pantalón si aplica
  - Screens: ClientCreate/Edit, MeasurementCreate/Edit para todas las prendas
  - Archivos: `src/features/clients/components/ClientForm.tsx`, `src/features/clients/screens/`, `src/features/clients/components/`

### 5. Tests y validaciones

- [ ] Tests unitarios y de integración:
  - Validar flujos de creación/edición de cliente y medidas
  - Tests de migraciones y persistencia
  - Archivos: `src/features/clients/hooks/__tests__/`, `src/data/local/__tests__/`, `src/features/clients/screens/__tests__/`

### 6. Sincronización y QA

- [ ] Validar integración con sync offline/online
- [ ] Pruebas de regresión y QA en flows ampliados
- [ ] Documentar cambios en contexto y backlog

---

> Este checklist debe ejecutarse en orden, marcando cada tarea al completarse. Cualquier cambio de modelo debe ser validado con el arquitecto antes de avanzar a migraciones y forms.
