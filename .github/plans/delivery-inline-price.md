## Plan de Implementación: Precio inline al entregar (N-125, extiende N-107)

### Contexto

`evaluateDeliveryGuard(schedule)` (`src/features/schedule/domain/deliveryGuard.ts`) es dominio puro
compartido por los 2 puntos de entrada a "marcar entregado": `ScheduleFormScreen.tsx` y
`ScheduleQuickActionSheet.tsx`. Cada uno decide qué `Alert.alert` mostrar con el resultado
(`missingPrice`/`saldoPendiente`), pero el cálculo vive en un solo lugar — ese patrón de N-107
se mantiene sin tocar.

Hoy, en `ScheduleQuickActionSheet.tsx`, `handleMarkDeliveredPress` detecta `missingPrice` y muestra
un `Alert.alert` de 3 botones: "Cancelar" / "Completar precio" (→ `onViewDetail`, navega a
`ScheduleForm`) / "Entregar sin precio". No hay forma de escribir el precio sin salir del panel.
En `ScheduleFormScreen.tsx`, en cambio, el campo "Precio" ya está visible en la misma pantalla
(card "Detalles") — el Alert equivalente solo ofrece "Cancelar" (el usuario ya puede escribir ahí
mismo) / "Entregar sin precio".

El parseo de precio (solo dígitos, `text.replace(/[^0-9]/g, "")` + `parseInt`) vive **duplicado**
inline en `ScheduleFormScreen.tsx` en los campos `price` y `abono` (líneas ~687 y ~717) — no hay
un helper compartido hoy. `useScheduleStatusActions.ts` ya tiene el patrón exacto que necesitamos
para persistir el precio sin pasar por el formulario completo: `assignOperario` hace
`runAction("status_auto", () => repo.update(scheduleId, { operarioId }))`, actualiza el turno vía
`ScheduleRepositoryImpl.update()` (acepta `UpdateScheduleDTO` con `price` ya incluido) y reutiliza
el mismo flag `isProcessing` que bloquea el resto de acciones del panel mientras corre.

`Alert.prompt` (input nativo dentro de un Alert) ya fue descartado en N-107 por no tener paridad
Android — confirmado, sigue sin ser una opción viable acá.

### Tareas

| # | Tipo | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 1 | Dominio | Extraer el parseo "solo dígitos → number \| undefined" a un helper puro (`parseDigitsOnlyAmount(text: string): number \| undefined`), reemplazando las 2 copias inline ya existentes en `price`/`abono`. Sin esto, el nuevo input inline del panel sería una **tercera** copia del mismo parseo. | `src/features/schedule/domain/priceInput.ts` (nuevo) + `src/features/schedule/domain/priceInput.test.ts` (nuevo) |
| 2 | Datos | Reemplazar el parseo inline de los campos `price` y `abono` por `parseDigitsOnlyAmount(text)` (mismo comportamiento, sin cambio funcional). | `src/features/schedule/screens/ScheduleFormScreen.tsx` (líneas ~687 y ~717) |
| 3 | Datos | Agregar `updatePrice(price: number): Promise<Schedule \| null>` a `useScheduleStatusActions`, mismo patrón que `assignOperario`: `runAction("updated", () => repo.update(scheduleId, { price }))`. Usar acción `"updated"` (no `"status_auto"`): un cambio de precio nunca deriva estado (`deriveScheduleStatus` solo mira `operarioId`/`date`), a diferencia de `assignOperario` — ver Decisiones de Diseño sobre el efecto en el historial. | `src/features/schedule/hooks/useScheduleStatusActions.ts` |
| 4 | Test | Test de `updatePrice` (éxito, error de `ScheduleValidationError`, no dispara si `isRunningRef` ya está ocupado) siguiendo los casos ya cubiertos para `assignOperario`. | `src/features/schedule/hooks/useScheduleStatusActions.test.ts` |
| 5 | UI | En `ScheduleQuickActionSheet.tsx`: agregar estado local `isEnteringPrice`/`priceText`/`priceInputError` (mismo espíritu que `isFullyPaid`/`hasTime` en `ScheduleFormScreen`: UI-only, no persiste directo). Nuevo prop `onSaveInlinePrice: (price: number) => Promise<Schedule \| null>`. `handleMarkDeliveredPress`: cuando `missingPrice`, en vez de `Alert.alert`, hacer `setIsEnteringPrice(true)` (ya no se abre ningún Alert para este caso — ver Decisiones de Diseño sobre el límite de 3 botones de Android). El Alert de "Saldo pendiente" (paso b) queda intacto, sin tocar. | `src/features/schedule/components/ScheduleQuickActionSheet.tsx` |
| 6 | UI | Tarjeta inline (reemplaza el Alert de "Precio no registrado") con: `TextInput` (`keyboardType="numeric"`, usa `parseDigitsOnlyAmount`, `accessibilityLabel="Precio para entregar"`), texto de error si `priceInputError`, botón primario "Guardar y entregar" (`disabled={isProcessing}`), y 2 acciones secundarias que preservan las opciones que ya existían: "Entregar sin precio" (llama `confirmDelivery(schedule)` directo) y "Completar en el turno completo" (llama `onViewDetail`, igual que antes). Botón "Cancelar" propio de la tarjeta (distinto del "Cerrar" del panel) que solo colapsa la tarjeta (`setIsEnteringPrice(false)`), sin cerrar el sheet completo. | `src/features/schedule/components/ScheduleQuickActionSheet.tsx` |
| 7 | UI | `handleSaveInlinePriceAndDeliver`: parsear `priceText`, si `price == null \|\| price <= 0` setear `priceInputError` y no continuar (mismo caso que originó el aviso: "vacío o en $0" no es un precio válido para completar acá). Si válido, `await onSaveInlinePrice(price)`; si devuelve un `Schedule`, colapsar la tarjeta y encadenar `confirmDelivery(updatedSchedule)` — **no** completar la entrega en un solo paso sin este segundo chequeo (ver Decisiones de Diseño, pregunta del saldo). Si devuelve `null` (falló), dejar la tarjeta abierta — el `error` que ya expone el panel (prop existente) informa la falla. | `src/features/schedule/components/ScheduleQuickActionSheet.tsx` |
| 8 | UI | Envolver el contenido del `Modal` en `KeyboardAvoidingView` (mismo patrón `Platform.OS === "ios" ? "padding" : "height"` que ya usa `ScheduleFormScreen`) — hoy el sheet no lo tiene porque nunca tuvo un `TextInput`; sin esto el teclado puede tapar el nuevo input al estar el sheet pegado al fondo de la pantalla. | `src/features/schedule/components/ScheduleQuickActionSheet.tsx` |
| 9 | UI | Wiring en la pantalla que monta el panel: nuevo handler `handleSheetSaveInlinePrice` (mismo patrón que `handleSheetAssignOperario`: usa `sheetScheduleIdRef` para no pisar el sheet si cambió de turno mientras la promesa estaba en vuelo, actualiza `setSheetSchedule`, dispara `reload()`/`reloadAllSchedules()`) pasado como prop `onSaveInlinePrice`. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 10 | Test | Actualizar `ScheduleQuickActionSheet.test.tsx`: los 2 tests que hoy esperan `Alert.alert("Precio no registrado", ...)` pasan a esperar la tarjeta inline (buscar por `accessibilityLabel`/texto, ya no por `Alert.alert`). Casos nuevos: (a) escribir precio inválido (vacío o "0") muestra `priceInputError` y no llama `onSaveInlinePrice`; (b) guardar precio válido llama `onSaveInlinePrice`, y si el turno actualizado deja saldo pendiente, encadena el `Alert` de "Saldo pendiente" (no llama `onMarkDelivered` directo); (c) si el precio guardado deja saldo $0, llama `onMarkDelivered` directo sin `Alert`; (d) si `onSaveInlinePrice` resuelve `null`, la tarjeta sigue abierta y no se llama `onMarkDelivered`; (e) "Entregar sin precio" y "Completar en el turno completo" siguen funcionando igual que antes (ya no como botones de `Alert`, sino como `Pressable` con los mismos `accessibilityLabel`). | `src/features/schedule/components/ScheduleQuickActionSheet.test.tsx` |
| 11 | Test | Actualizar el mock de `useScheduleStatusActions` en `ScheduleDayViewScreen.test.tsx` (agregar `updatePrice: jest.fn(...)` — hoy el mock no lo tiene y romperá el tipo al agregarlo a la interfaz) + test nuevo de wiring: presionar "Guardar y entregar" en el sheet llama `updatePrice` y refresca `sheetSchedule`/listas. | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |

### Migración de Supabase

No aplica. `price`/`abono` ya existen en `schedules` (local y Supabase, desde N-008/N-045). Este
feature solo agrega una vía adicional de escritura sobre columnas existentes (`repo.update()`, ya
usado hoy por `assignOperario`) — cero cambio de esquema.

### Decisiones de Diseño

- **Por qué no un 4to botón en el `Alert` existente**: Android limita `Alert.alert` en la práctica
  a 3 botones (y agregar un 4to degrada la UX incluso donde sí se renderiza). Ya había 3 usados
  ("Cancelar"/"Completar precio"/"Entregar sin precio"), así que no había espacio para sumar
  "Escribir precio aquí" sin sacar otro. Se optó por sacar el `Alert` completo de este caso puntual
  y reemplazarlo por una tarjeta inline con estado local — igual que ya se descartó `Alert.prompt`
  en N-107, un `Alert` nunca iba a poder alojar un `TextInput` de forma nativa multiplataforma.
  El `Alert` de "Saldo pendiente" (que solo pide confirmar, no escribir nada) se deja intacto: no
  tiene el mismo problema y cambiarlo sin necesidad sería tocar una secuencia de N-107 ya probada.

- **Por qué se preservan las 3 opciones originales dentro de la tarjeta, no solo la nueva**: quitar
  "Entregar sin precio" o "Completar en el turno completo" sería una regresión de comportamiento no
  pedida — el usuario pidió *agregar* la posibilidad de escribir el precio ahí mismo, no reemplazar
  las otras dos salidas ya existentes (ej. un operario que de verdad no tiene el precio a mano y
  prefiere seguir navegando al turno completo para ver notas/historial antes de decidir).

- **Encadenar "Saldo pendiente" después de guardar el precio, no completar en un solo paso**: un
  precio recién escrito casi siempre deja `saldoPendiente > 0` (`computeSaldo` = `price - (abono ??
  0)`, y en este flujo `abono` normalmente es `0`/`undefined` porque el turno nunca tuvo precio
  cargado). Completar la entrega en un solo tap sin mostrar ese saldo sería sorprender al usuario
  marcando el turno como "pagado en su totalidad" (efecto documentado del `Alert` de saldo, ver
  N-107) sin que lo haya confirmado. Se reutiliza `confirmDelivery` con el turno ya actualizado —
  mismo camino de código que ya usa el resto del flujo, sin una tercera rama nueva de lógica. Si el
  turno ya tenía un `abono` previo cargado y el precio nuevo lo deja exactamente saldado, el mismo
  `confirmDelivery` resuelve directo sin `Alert` (mismo comportamiento que hoy para cualquier turno
  con saldo $0), sin rama especial adicional.

- **`action: "updated"` en vez de `"status_auto"` para `updatePrice`**: a diferencia de
  `assignOperario` (que casi siempre mueve el estado — `deriveScheduleStatus` mira `operarioId`),
  un cambio de precio nunca deriva estado. `runAction` solo crea un evento de auditoría en
  `ScheduleHistoryList` cuando `existing.status !== updated.status` (ver
  `useScheduleStatusActions.ts`), así que con la infraestructura actual **este precio inline no
  quedará auditado en el historial del turno** — mismo hueco pre-existente que ya tiene
  `assignOperario` cuando reasigna operario sin mover el estado (ej. ya estaba `en_proceso`). No es
  una regresión nueva de este plan, pero queda documentado como hueco conocido, no oculto — si se
  quiere corregir de raíz (que `runAction` audite también cambios de campo no-status, como ya hace
  `useScheduleForm.submit()` vía `diffScheduleFields`), es candidato a un need aparte, no bloquea
  N-125.

- **`ScheduleFormScreen.tsx` se deja sin cambios de flujo** (más allá de reusar
  `parseDigitsOnlyAmount`): ahí el campo "Precio" ya está visible en la misma pantalla — cancelar
  el `Alert` y escribirlo arriba ya cumple "ponerlo ahí mismo, sin navegar", que es la queja
  puntual del usuario sobre el panel rápido. Meter ahí también una tarjeta inline duplicaría un
  campo que ya existe en pantalla (dos inputs de precio simultáneos sería confuso) sin resolver
  ningún problema real reportado. Si en el futuro el usuario pide explícitamente el mismo patrón
  "todo en un solo paso" ahí (ej. que el botón de "Entregar sin precio" también ofrezca guardar y
  entregar en un solo tap sin cerrar el Alert primero), es un pedido nuevo, no una consecuencia
  necesaria de este plan.

- **Reutilizar el flag `isProcessing` compartido en vez de un loading propio para "Guardar y
  entregar"**: `updatePrice` corre por el mismo `runAction`/`isRunningRef` que
  `markReady`/`markDelivered`/`assignOperario` — el mismo candado que ya evita que dos mutaciones
  concurrentes se pisen (ver comentario de `isBusy` en `ScheduleFormScreen.tsx`) cubre este nuevo
  caso gratis, sin agregar un segundo estado de "ocupado" al panel.

### Riesgos o Consideraciones

- **Sin build de EAS**: cambio 100% JS/TS (estado local, un método más en un hook existente, un
  prop nuevo). No toca dependencias nativas ni configuración nativa.
- **Teclado tapando el input** (tarea 8): el `Modal` del panel nunca tuvo un `TextInput` antes;
  verificar en dispositivo real (no solo simulador) que `KeyboardAvoidingView` resuelve esto tanto
  en Android como iOS — el comportamiento de teclado en `Modal`s de React Native es una de las
  fuentes más comunes de bugs sutiles de la librería.
- **Turno con `abono` previo cargado**: si el turno ya tenía un abono (caso raro con `missingPrice`,
  ej. datos corregidos manualmente), al guardar el precio nuevo la lógica de `confirmDelivery` con
  precio+abono existente puede encadenar el `Alert` de "Saldo pendiente" en vez de completar
  directo — comportamiento esperado (ver Decisiones de Diseño), pero vale confirmarlo
  explícitamente en el checklist de prueba en dispositivo real si el Reviewer lo pide.
- **Hueco de auditoría documentado, no corregido en este plan**: el precio guardado desde el panel
  rápido no queda registrado en `ScheduleHistoryList` salvo que ese mismo tap también cambie el
  estado (lo cual no ocurre en este flujo). Ver Decisiones de Diseño — es un hueco pre-existente de
  `useScheduleStatusActions`, no una regresión de N-125, pero el Reviewer debería confirmar que es
  aceptable dejarlo así por ahora.
- **Actualizar el mock de `useScheduleStatusActions` en `ScheduleDayViewScreen.test.tsx`** (tarea
  11): si se agrega `updatePrice` a la interfaz sin actualizar ese mock, el archivo de test deja de
  tipar — no es opcional, es parte necesaria del mismo cambio.
