# Sastrería App — Instrucciones Globales

## Descripción del Proyecto
App mobile de gestión para sastrería/taller de arreglos de ropa.
Usuarios: clientes finales + usuarios internos (administradores/empleados).
Plataforma inicial: Android (escalable a iOS y web).

## Stack
- **Framework**: React Native + Expo SDK (managed workflow)
- **Lenguaje**: TypeScript estricto (`strict: true`)
- **Navegación**: React Navigation v7
- **Estado global**: Zustand
- **Formularios/validación**: React Hook Form + Zod
- **Base de datos local**: Expo SQLite (offline-first)
- **Push notifications**: Expo Notifications
- **Crash/analytics**: Firebase Crashlytics + Analytics
- **Calidad**: ESLint + Prettier + Jest + Testing Library

## Arquitectura por Features (Monolito Modular)

```
src/
  features/          ← Módulos de negocio (clients, schedule, pricing)
  shared/            ← Componentes, hooks y utilidades reutilizables
  data/
    local/           ← Repositorios SQLite + entidades
    sync/            ← Cola de sincronización offline-first
  navigation/        ← Stack y tab navigators
```

Cada feature sigue esta estructura interna:
```
features/<name>/
  screens/           ← Pantallas (solo UI + orquestación)
  components/        ← Componentes locales del feature
  hooks/             ← Custom hooks del feature
  domain/            ← Tipos, validaciones y reglas de negocio
  repository/        ← Acceso a datos (implementación SQLite)
```

## Reglas de Arquitectura
- **Separación estricta por capas**: UI → Dominio → Datos. Nunca saltarse capas.
- **Offline-first**: toda operación escribe primero en SQLite local; la sincronización es asíncrona.
- **Repositorios con interfaces**: cada feature define una interfaz de repositorio; la implementación SQLite la implementa en `data/local/`.
- **Screens solo orquestan**: lógica de negocio en hooks o dominio, no en componentes de pantalla.
- **Tipado explícito**: nunca usar `any`. Usar tipos desde `domain/` del feature correspondiente.

## Build y Test
```bash
npx expo start                  # Dev server
npx expo run:android            # Build y correr en Android
npm test                        # Unit tests con Jest
npm run lint                    # ESLint
npm run format                  # Prettier
```

## Convenciones de Código
- **Naming**: PascalCase para componentes/screens/types. camelCase para funciones/variables/hooks.
- **Hooks propios**: siempre empezar con `use` (ejemplo: `useClientList`).
- **Repositorios**: siempre empezar con `use` o nombrar como `ClientRepository` para la interfaz.
- **Evitar `useEffect` para lógica de negocio**: preferir `useQuery`-style hooks propios.
- **Errores**: nunca swallow silencioso. Siempre registrar en Crashlytics y mostrar feedback al usuario.

## Seguridad
- **Cero secretos hardcodeados**. Toda clave en variables de entorno vía `expo-constants` o `.env`.
- **PII de clientes** (medidas, datos personales): nunca en logs, nunca en analytics.
- **SQLite**: validar y sanear inputs antes de cualquier query.

## Sincronización Offline
- Cada registro tiene: `id` (UUID), `createdAt`, `updatedAt`, `syncStatus` (`pending` | `synced` | `error`).
- Al recuperar conexión, la cola de sync envía en lotes los registros `pending`.
- En caso de conflicto, gana la versión más reciente por `updatedAt`.

## Escalabilidad Futura
- Contratos de API modelados con OpenAPI para cuando se conecte backend.
- Lógica de dominio en `features/*/domain/` es reutilizable en web futura.
- No acoplar lógica a Expo-specific APIs; abstraerlas en adaptadores.

## Git Workflow

### Ramas
| Rama | Propósito |
|------|-----------|
| `main` | Código estable, siempre buildeable |
| `develop` | Integración de features en progreso |
| `feature/<feature>/<descripcion-corta>` | Feature nuevo |
| `fix/<descripcion-corta>` | Corrección de bug |
| `chore/<descripcion-corta>` | Setup, config, dependencias |

Flujo: `feature/*` → `develop` → `main`  
Nunca commitear directo en `main`.

### Convención de Commits (Conventional Commits)
```
<prefix>(<scope>): <emoji?> <descripción en inglés imperativo>
```

**Prefijos permitidos:**
- `feat` — nueva funcionalidad
- `fix` — corrección de bug
- `chore` — tareas de mantenimiento, setup, config
- `refactor` — refactorización sin cambio funcional
- `test` — agregar o corregir tests
- `docs` — solo documentación
- `style` — formato, lint (sin cambio de lógica)
- `perf` — mejora de rendimiento
- `ci` — cambios de CI/CD
- `revert` — revertir commit anterior

**Scopes útiles para este proyecto:**
`clients` | `schedule` | `pricing` | `navigation` | `sync` | `db` | `shared` | `config`

**Ejemplos:**
```
feat(clients): add client list screen with offline support
fix(db): fix SQLite migration idempotency check
chore(config): add jest coverage scripts
test(clients): add unit tests for useClientList hook
refactor(shared): extract LoadingView and ErrorView components
```

**Reglas:**
- Descripción en inglés, modo imperativo ("add", "fix", "remove", no "added", "fixed").
- Máximo 72 caracteres por línea de mensaje.
- Sin punto al final.
- Si el commit cierra un bloque del plan, agregar en body: `Closes: Bloque 1`.

### Tamaño de Commits
- Un commit = un cambio cohesivo (no mezcles dominio + UI + tests).
- Prefiere commits pequeños y frecuentes sobre uno gigante por bloque.
- Al terminar un bloque completo, haz un commit de integración en `develop`.
