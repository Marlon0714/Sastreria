## Plan de Implementación: Feature Pricing UI

### Contexto

El módulo de pricing ya cuenta con:

- Modelo de dominio inicial (`PricingService`) y Zod schema en `domain/pricingService.ts`.
- Interfaz de repositorio (`PricingServiceRepository`) y hook base (`usePricingServices`).
- Implementación SQLite en `data/local/PricingServiceRepositoryImpl.ts`.
- Navegador y placeholder UI en `PricingStackNavigator` y `PricingPlaceholderScreen`.
  No existen aún screens reales, ni estructura de components, ni navegación detallada para CRUD de precios.

### Tareas

| #   | Tipo       | Descripción                                                                                     | Archivo(s)                                                                               |
| --- | ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Dominio    | Revisar y ajustar modelo `PricingService` y Zod schema según reglas negocio                     | features/pricing/domain/pricingService.ts                                                |
| 2   | Dominio    | Documentar reglas de negocio y validaciones en comentarios                                      | features/pricing/domain/pricingService.ts                                                |
| 3   | Infra      | Crear carpetas base: `components/`, `screens/` (si no existen)                                  | features/pricing/components/, features/pricing/screens/                                  |
| 4   | UI         | Crear `PricingListScreen` (lista de servicios con precio, estados: loading, empty, error, data) | features/pricing/screens/PricingListScreen.tsx                                           |
| 5   | UI         | Crear `PricingDetailScreen` (detalle y edición de un servicio)                                  | features/pricing/screens/PricingDetailScreen.tsx                                         |
| 6   | UI         | Crear `PricingFormScreen` (alta/edición, validación con Zod, feedback UI)                       | features/pricing/screens/PricingFormScreen.tsx                                           |
| 7   | UI         | Crear componentes reutilizables: `PricingItem`, `PricingForm`                                   | features/pricing/components/PricingItem.tsx, features/pricing/components/PricingForm.tsx |
| 8   | Navegación | Definir rutas en `PricingStackNavigator` para las 3 screens principales                         | navigation/PricingStackNavigator.tsx                                                     |
| 9   | Navegación | Actualizar tipos en `navigation/types.ts` para nuevas rutas                                     | navigation/types.ts                                                                      |
| 10  | Hook       | Crear hooks: `usePricingDetail`, `usePricingForm` para lógica de screens                        | features/pricing/hooks/usePricingDetail.ts, features/pricing/hooks/usePricingForm.ts     |
| 11  | Test       | Tests unitarios para screens y hooks principales                                                | features/pricing/screens/PricingListScreen.test.tsx, ...                                 |

### Decisiones de Diseño

- El modelo `PricingService` ya contempla campos clave (`id`, `name`, `price`, `notes`, timestamps, `syncStatus`).
- Validación y reglas de negocio centralizadas en Zod schema.
- UI desacoplada: screens solo orquestan, lógica en hooks, componentes puros para ítems y formularios.
- Navegación stack: List → Detail → Form (modal o push).
- Sincronización y estado offline ya cubiertos por repositorio y hooks existentes.

### Riesgos o Consideraciones

- Puede requerir migración de datos si se ajustan campos del modelo.
- Validar que la navegación no rompa flujos existentes en tabs.
- Asegurar feedback claro en UI para errores de sync/offline.

---

📄 Plan guardado en: .github/plans/feature-pricing-ui.md
👉 Siguiente paso: @Builder ejecuta el plan en .github/plans/feature-pricing-ui.md
