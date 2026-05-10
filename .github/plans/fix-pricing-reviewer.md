# Plan de Corrección: Hallazgos Reviewer Pricing

## Tareas

1. Centralizar mensajes de error y textos de UI en archivo de constantes (`features/pricing/domain/strings.ts`).
2. Exponer `syncStatus` en hooks y devolverlo en `usePricingForm` y `usePricingServices`.
3. Agregar lógica offline-first: si no hay conexión, marcar `syncStatus: pending` y exponer estado offline en hooks.
4. Tipar estrictamente props de screens, eliminar `any` en navegación.
5. Crear test unitario dedicado para `usePricingForm` con mocks estrictos y sin `any`.
6. Revisar y tipar correctamente todos los mocks en tests de pricing.
7. Reemplazar todos los strings hardcodeados en UI por constantes centralizadas.
8. Unificar formato y consistencia de mensajes de error en hooks y UI.

## Archivos afectados

- features/pricing/domain/strings.ts
- features/pricing/hooks/usePricingForm.ts
- features/pricing/hooks/usePricingServices.ts
- features/pricing/screens/PricingFormScreen.tsx
- features/pricing/screens/PricingListScreen.tsx
- features/pricing/screens/PricingDetailScreen.tsx
- features/pricing/hooks/usePricingForm.test.ts
- features/pricing/screens/PricingListScreen.test.tsx
- features/pricing/screens/PricingFormScreen.test.tsx
- features/pricing/components/PricingForm.tsx
- features/pricing/hooks/usePricingDetail.ts

## Notas

- Los hooks deben exponer explícitamente el estado de sincronización (`syncStatus`) y si el dato está solo en local/offline.
- Los mensajes de error y textos de UI se centralizan en `domain/strings.ts` para facilitar internacionalización futura.
- Los tests deben evitar `any` en mocks y usar tipos reales del dominio.
- Los screens deben tipar navegación usando los tipos de React Navigation definidos en `src/navigation/types.ts`.
- Los mensajes de error deben ser claros, consistentes y reutilizar las constantes.
