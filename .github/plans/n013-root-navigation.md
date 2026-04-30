## Plan de Implementación: N-013 Root Navigation por composición de features

### Objetivo

Refactorizar la navegación raíz para pasar de un único stack de clients a una composición por features con tabs + stacks en React Navigation v7, preservando el flujo funcional de clients y agregando placeholders seguros para schedule y pricing sin introducir lógica de negocio de esas features.

### Contexto

- La app actualmente monta solo `ClientsStackNavigator` desde `RootNavigator`, lo que acopla el crecimiento de navegación al feature clients.
- `schedule` y `pricing` existen como estructura de carpetas, pero no tienen implementación de screens; por tanto, se requieren placeholders explícitos y seguros para habilitar la composición sin mezclar alcance funcional.
- El proyecto usa TypeScript strict y React Navigation v7 (`@react-navigation/native` + `@react-navigation/native-stack`); para tabs faltará integrar `@react-navigation/bottom-tabs`.

### Alcance Estricto N-013

Incluye:

- Composición de navegación raíz con bottom tabs y stacks por feature.
- Preservar navegación de clients sin cambiar su comportamiento funcional.
- Crear placeholders seguros para schedule/pricing (UI mínima, sin acceso a datos ni sync).
- Tipado fuerte de params para tabs y stacks bajo TypeScript strict.

No incluye:

- Implementación funcional de schedule (N-010 no depende de esto).
- Implementación funcional de pricing (fuera de N-013).
- Cambios de repositorios, inyección de dependencias, ni composición de hooks (N-014).
- Cambios en sync queue y orquestación de sync (N-010).

### Archivos a crear y modificar

Crear:

- `src/navigation/FeatureTabsNavigator.tsx`
- `src/navigation/ScheduleStackNavigator.tsx`
- `src/navigation/PricingStackNavigator.tsx`
- `src/features/schedule/screens/SchedulePlaceholderScreen.tsx`
- `src/features/pricing/screens/PricingPlaceholderScreen.tsx`
- `src/navigation/FeatureTabsNavigator.test.tsx` (o `src/navigation/RootNavigator.test.tsx`, según patrón de tests del equipo)

Modificar:

- `package.json` (agregar dependencia de tabs)
- `src/navigation/RootNavigator.tsx`
- `src/navigation/types.ts`
- `src/navigation/ClientsStackNavigator.tsx`
- `src/features/clients/screens/ClientListScreen.tsx`
- `src/features/clients/screens/ClientCreateScreen.tsx`
- `src/features/clients/screens/ClientDetailScreen.tsx`
- `src/features/clients/screens/MeasurementCreateScreen.tsx`
- `src/features/clients/screens/MeasurementHistoryScreen.tsx`

Nota: si al implementar se decide mantener compatibilidad con alias de tipos para minimizar cambios, se podrá reducir la cantidad de pantallas tocadas. El plan base asume tipado explícito por stack para máxima claridad.

### Tareas

| #   | Tipo         | Descripción                                                                                                                                                                                  | Archivo(s)                                                   |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Dependencias | Incorporar `@react-navigation/bottom-tabs` versión compatible con RN v7 y actualizar lockfile.                                                                                               | package.json, package-lock.json                              |
| 2   | Navegación   | Redefinir tipos de navegación en composición: `RootTabParamList`, `ClientsStackParamList`, `ScheduleStackParamList`, `PricingStackParamList`, usando `NavigatorScreenParams` cuando aplique. | src/navigation/types.ts                                      |
| 3   | Navegación   | Mantener `ClientsStackNavigator` como stack aislado del feature clients, migrando su generic a `ClientsStackParamList` sin cambiar rutas ni títulos actuales.                                | src/navigation/ClientsStackNavigator.tsx                     |
| 4   | UI           | Crear `SchedulePlaceholderScreen` seguro: vista informativa, sin side effects, sin acceso a repositorios, con texto de "Próximamente" y estilo consistente.                                  | src/features/schedule/screens/SchedulePlaceholderScreen.tsx  |
| 5   | UI           | Crear `PricingPlaceholderScreen` seguro: mismas reglas del placeholder de schedule, incluyendo accesibilidad básica.                                                                         | src/features/pricing/screens/PricingPlaceholderScreen.tsx    |
| 6   | Navegación   | Crear `ScheduleStackNavigator` con una sola pantalla placeholder y tipado estricto.                                                                                                          | src/navigation/ScheduleStackNavigator.tsx                    |
| 7   | Navegación   | Crear `PricingStackNavigator` con una sola pantalla placeholder y tipado estricto.                                                                                                           | src/navigation/PricingStackNavigator.tsx                     |
| 8   | Navegación   | Crear `FeatureTabsNavigator` que componga los tres stacks como tabs (`Clients`, `Schedule`, `Pricing`) con opciones base homogéneas.                                                         | src/navigation/FeatureTabsNavigator.tsx                      |
| 9   | Navegación   | Actualizar `RootNavigator` para montar `FeatureTabsNavigator` dentro de `NavigationContainer` conservando punto único de entrada.                                                            | src/navigation/RootNavigator.tsx                             |
| 10  | Tipado       | Ajustar tipos de props de navegación en screens de clients para usar `ClientsStackParamList` y evitar dependencias del root de tabs.                                                         | src/features/clients/screens/\*.tsx                          |
| 11  | Test         | Agregar pruebas de navegación para validar render de tabs y presencia de placeholders sin romper clients.                                                                                    | src/navigation/FeatureTabsNavigator.test.tsx (o equivalente) |
| 12  | Calidad      | Ejecutar validaciones de typecheck, lint y tests objetivo para confirmar compatibilidad con TypeScript strict y no regresión en bootstrap.                                                   | scripts de package.json                                      |

### Secuencia de Implementación Recomendada

1. Resolver dependencias y tipos primero (tareas 1 y 2).
2. Crear placeholders y stacks de schedule/pricing (tareas 4, 5, 6, 7).
3. Crear tabs y conectar root (tareas 8 y 9).
4. Ajustar tipado de clients y cerrar con pruebas/validación (tareas 10, 11, 12).

Esta secuencia minimiza regresiones porque aísla cambios estructurales de los cambios de tipado y deja la verificación al final con toda la composición activa.

### Decisiones de Diseño

- Mantener clients como stack propio dentro de tabs: evita acoplar rutas internas de clients al root y facilita escalado por feature.
- Placeholders explícitos y seguros para schedule/pricing: permiten exponer navegación completa sin introducir deuda funcional ni tocar dominio/datos.
- Tipos separados por navigator: mejora mantenibilidad y evita que screens de clients dependan de tipos globales de tabs.
- RootNavigator liviano: solo `NavigationContainer` + `FeatureTabsNavigator`, manteniendo arquitectura clara y testeable.

### Riesgos o Consideraciones

- Riesgo de ruptura de tipos al migrar `RootStackParamList` en múltiples pantallas de clients.
  - Mitigación: migración atómica de tipos + typecheck completo.

- Riesgo de depender de librería faltante para tabs.
  - Mitigación: agregar `@react-navigation/bottom-tabs` explícitamente en este ticket y validar lockfile.

- Riesgo de sobrealcance al intentar avanzar lógica de schedule/pricing.
  - Mitigación: placeholders sin hooks, sin repositorios, sin SQLite, sin sync.

- Riesgo de mezclar N-014 por cambios de providers o composición de repositorios.
  - Mitigación: no tocar `ClientsDependenciesProvider`, ni contratos de repositorio/hook.

### DoD Verificable (Definition of Done)

1. `RootNavigator` ya no monta directamente `ClientsStackNavigator`; monta composición por tabs.
2. Existen tres tabs funcionales: Clients, Schedule, Pricing.
3. El flujo completo de clients (listado, crear, detalle, crear medida, historial) sigue navegable.
4. `schedule` y `pricing` muestran placeholders seguros sin side effects ni acceso a datos.
5. Los tipos de navegación compilan en TypeScript strict sin casts a `any`.
6. No se modifican archivos de sync (`src/data/sync/**`) ni de composición de repositorios/hooks (alcance N-014).
7. Tests de navegación agregados/actualizados pasan junto con tests existentes relevantes.

### Comandos de Validación

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run test -- src/navigation/FeatureTabsNavigator.test.tsx`
- `npm run test -- App.test.tsx`
- `npm run test -- src/features/clients/hooks/useClientList.test.ts`
- `npm run validate`

### Criterios de Exclusión de Alcance (Control de Frontera)

Para evitar mezcla con otros needs:

- N-010: no crear ni modificar processor/orchestrator/queue ni políticas de retry.
- N-014: no alterar contratos de dependencias, providers de DI o wiring de repositorios en hooks.
- Si aparece una dependencia cruzada durante la implementación, registrar hallazgo y abrir follow-up en backlog en lugar de extender N-013.
