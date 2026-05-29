## Plan de Implementación: Split de Precios por Categoría (Segmented Control)

### Contexto

- El split de precios por categoría (arreglo/confección) ya está parcialmente implementado en la UI (`PricingListScreen` y `PricingForm`), tipos y repo.
- La migración v13 agrega la columna `category` en SQLite, pero en web es un no-op.
- El repo y los hooks usan la categoría, pero hay duplicidad de lógica y falta cobertura de tests para el segmented control y la creación por categoría activa.
- No existen tests unitarios para `PricingForm` ni para la lógica de categoría en hooks.

### Tareas

| #   | Tipo    | Descripción                                                                                  | Archivo(s)                                                                                                                                                |
| --- | ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | UI      | Eliminar duplicidad y centralizar lógica de categoría en `PricingListScreen` y `PricingForm` | features/pricing/screens/PricingListScreen.tsx, features/pricing/components/PricingForm.tsx                                                               |
| 2   | Datos   | Finalizar migración v13 y asegurar soporte en `database.web.ts`                              | data/local/migrations.ts, data/local/database.web.ts                                                                                                      |
| 3   | Dominio | Revisar/actualizar tipos y repo para asegurar soporte robusto de categoría                   | features/pricing/domain/pricingService.ts, features/pricing/repository/PricingServiceRepository.ts, data/local/PricingServiceRepositoryImpl.ts            |
| 4   | UI      | Completar UI: segmented control, FAB crea en categoría activa, paso de categoría a form      | features/pricing/screens/PricingListScreen.tsx, features/pricing/screens/PricingFormScreen.tsx                                                            |
| 5   | Test    | Crear/actualizar tests para lógica de categoría y segmented control                          | features/pricing/screens/PricingListScreen.test.tsx, features/pricing/screens/PricingFormScreen.test.tsx, data/local/PricingServiceRepositoryImpl.test.ts |
| 6   | Test    | Agregar tests unitarios para `PricingForm` (categoría, validación, submit)                   | features/pricing/components/PricingForm.test.tsx                                                                                                          |
| 7   | Test    | Agregar tests para hooks: `usePricingServices`, `usePricingForm`                             | features/pricing/hooks/usePricingServices.test.ts, features/pricing/hooks/usePricingForm.test.ts                                                          |
| 8   | Build   | Verificar que todo compila y los tests pasan                                                 | —                                                                                                                                                         |

### Decisiones de Diseño

- La lógica de filtrado y creación por categoría debe centralizarse para evitar duplicidad entre pantalla y formulario.
- El repo y los tipos ya soportan la categoría, pero se debe asegurar que todos los flujos (crear, editar, listar) la respetan.
- En web, la migración es un no-op, pero el mock de la DB debe soportar la columna y lógica de categoría.
- El FAB de agregar debe pasar la categoría activa al formulario y el formulario debe respetarla como valor inicial.
- Los tests deben cubrir: cambio de categoría, creación en categoría activa, validación, y renderizado de segmented control.

### Riesgos o Consideraciones

- Si existen datos legacy sin categoría, definir fallback (usar "arreglo" por defecto).
- Revisar que la migración v13 no cause problemas en instalaciones existentes.
- Validar que la UI no permita crear servicios sin categoría.
- Asegurar que los tests cubran ambos flujos (arreglo y confección).
- Verificar que la lógica offline-first y sync no se vea afectada por el split de categoría.

---

📄 Plan guardado en: .github/plans/feature-pricing-segmented.md  
👉 Siguiente paso: @Builder ejecuta el plan en .github/plans/feature-pricing-segmented.md
