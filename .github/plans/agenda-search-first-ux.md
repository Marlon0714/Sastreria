## Plan de Implementación: Agenda — búsqueda primero, filtro unificado de 3 opciones y categoría desacoplada de "Pendientes" (N-101)

### Contexto

Este plan mantiene sin cambios dos de los tres puntos de la versión anterior
(reordenar el buscador arriba de todo, y desacoplar la categoría de la vista
"Pendientes" en el `useMemo`). **Lo único que cambia en esta reescritura es
el diseño del control de filtros**: el usuario, después de ver la versión
anterior (categoría con texto + toggle de dos íconos Día/Pendientes en la
misma fila, con la categoría deshabilitada/atenuada en "Pendientes"),
propuso un diseño mejor y pidió reemplazarlo por él. Esta versión documenta
ese nuevo diseño; el resto del plan (búsqueda primero, cambio de
`pendingSchedules`) sigue vigente tal como estaba.

**Ajuste puntual sobre esta misma reescritura, aplicado tras ver el resumen
del selector de 3 opciones**: el usuario vio que en la versión anterior los
conteos de Arreglos/Confecciones quedaban **dentro del desplegable**
(visibles solo si se abre, algo que normalmente no pasa) y pidió que esos
dos números vivan en un **lugar fijo junto al encabezado de fecha**, visible
todo el tiempo mientras se está viendo un día — sin depender de abrir nada.
El conteo de "Pendientes" se trató aparte porque, a diferencia de los otros
dos, no es un conteo "del día" (no tiene fecha asociada). Este ajuste está
reflejado en las tareas 2, 3, 5, 14 y 16, y en la sección de Decisiones de
Diseño más abajo. No se tocó nada de lo ya vigente (tareas 1, 4, 6-13, 15,
17-18 quedan iguales o solo renumeradas).

Investigado directamente en el código actual de
`ScheduleDayViewScreen.tsx` (confirmado de nuevo en esta reescritura, los
números de línea siguen coincidiendo con el archivo real):

- El `return` (línea 381 en adelante) hoy renderiza, en este orden: (1)
  `segmentedWrapper` de categoría Arreglo/Confección (líneas 383-408, **sin
  ningún contador visible**), (2) `searchWrapper` del buscador (líneas
  410-433, `TextInput` con `accessibilityLabel="Buscar cliente en la
  agenda"`, controlado por `searchTerm`/`setSearchTerm`, `useState` local
  línea 98), (3) `segmentedWrapper` de vista Día/Pendientes (líneas 435-485,
  **con un badge numérico en cada uno de los dos botones**, líneas 455-480),
  (4) si `activeView === "dia"`: `WeekStrip` + botón "Ir a hoy" + `header`
  de fecha (líneas 487-526), (5) `ScrollView` con la lista (líneas 529-563).
- **Ubicación exacta del "encabezado de fecha" al que se refiere el ajuste
  puntual**: es el bloque `<View style={styles.header}>` (líneas 511-525),
  que contiene el `Text` con `formatDateForDisplay(selectedDate)` (el
  `dateLabel`, con `numberOfLines={1}` y `flex: 1` — importante para la
  tarea 5, ver más abajo) y el `ScheduleDateTimePickerField` para cambiar de
  fecha. Este bloque vive **dentro** del fragmento condicionado a
  `activeView === "dia"` (líneas 487-527, junto con `WeekStrip` y el botón
  "Ir a hoy"): cuando la vista activa es "Pendientes", ni el `WeekStrip` ni
  este `header` se renderizan — no hay ningún concepto de "fecha" visible en
  esa vista. Esto confirma que el nuevo bloque fijo de conteo (tarea 5) debe
  colgar de esta misma condición, no mostrarse nunca en "Pendientes".
- **Confirmado el hallazgo que motivó el cambio de alcance original**:
  `activeCategory` se aplica hoy tanto a `dateSchedules` (línea 137-143)
  como a `pendingSchedules` (línea 144-150) — ambos hacen
  `.filter((item) => item.category === activeCategory)`. La vista
  "Pendientes" hoy solo muestra la categoría activa, nunca ambas mezcladas.
  Sigue siendo lo que se va a corregir (tarea 7 de esta versión).
- **Inventario explícito de TODOS los contadores existentes hoy en la
  pantalla** (pedido puntual del usuario, no se asume que el único es el de
  "Pendientes"): el segmentado de **categoría** (Arreglo/Confección) **no
  tiene ningún contador** — se revisó su JSX (líneas 383-408) y no hay
  ningún `badge`/número asociado. El segmentado de **vista** (Día/Pendientes)
  tiene **dos** contadores, uno por botón (líneas 455-480):
  - Badge de **"Día"**: `isSearchingDia ? searchResults.length :
    dateSchedules.length` — es decir, cuenta los turnos de la fecha
    seleccionada (o de la búsqueda cruzada de fechas) **ya filtrados por la
    categoría activa**. Cubierto por los tests "muestra el contador de
    turnos del día en el segmentado" y "no muestra el contador del día
    cuando no hay turnos" (líneas 704-726 de
    `ScheduleDayViewScreen.test.tsx`).
  - Badge de **"Pendientes"**: `pendingSchedules.length` — hoy también
    filtrado por categoría (ver punto anterior), después de la tarea 7 deja
    de estarlo. Cubierto por los tests de las líneas 292-324.

  Conclusión: son **dos** contadores hoy, no uno, y ambos dependen
  implícitamente de la categoría activa (el de "Día" la filtra de forma
  directa; el de "Pendientes" también, hasta que se aplique la tarea 7). El
  nuevo control de 3 opciones necesita preservar ambos, pero como ahora
  categoría y vista se funden en un solo selector de 3 opciones mutuamente
  excluyentes, el contador de "Día" se **desdobla en dos** (uno para
  Arreglos, uno para Confecciones) — y, tras este ajuste puntual, esos dos
  números ya no viven únicamente en el desplegable sino también en un
  **lugar fijo junto al header de fecha** (tarea 5). No se encontró ningún
  otro contador en la pantalla (se revisó también `WeekStrip.tsx`: solo
  pinta la tira de días, sin badges ni indicadores numéricos).
- **Patrón de "desplegable" ya existente en el proyecto, a reutilizar**: se
  revisó `OperarioPickerField.tsx` (líneas 98-172) y tiene exactamente el
  mecanismo que hace falta acá: un `useState<boolean>` local (`isOpen`) que
  alterna entre (a) un `Pressable` colapsado mostrando el valor
  seleccionado (`accessibilityLabel="Seleccionar operario"`, líneas 98-116)
  y (b) una lista de opciones renderizada **inline** (no en `Modal`, no
  superpuesta/absoluta) que empuja el contenido de abajo mientras está
  abierta, y que se cierra sola al elegir una opción (o con un botón
  "Cancelar" explícito, innecesario acá por no haber texto libre que
  descartar). Es el mismo mecanismo de apertura/cierre que se reutiliza para
  el nuevo control. Se descarta `ScheduleQuickActionSheet.tsx` (usa
  `Modal`, líneas 1-10) por ser una solución pensada para un panel de
  acciones más grande y pesado (con `ActivityIndicator`, `Alert`, varias
  secciones) — usar un `Modal` para un selector de 3 opciones fijas sería
  sobre-ingeniería y además taparía el resto de la pantalla sin necesidad
  (el desplegado de 3 opciones cabe perfectamente empujando el contenido,
  igual que `OperarioPickerField`). `ClientPickerField.tsx` no aporta un
  patrón distinto (usa lógica de sugerencias/registro de cliente, no
  aplica).

### Tareas

| # | Tipo | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 1 | UI | Mover el bloque `searchWrapper` (buscador) para que sea el **primer** elemento dentro de `<View style={styles.container}>`, antes de cualquier filtro. Reordenamiento de un bloque ya existente, sin reescribir su contenido interno. *(sin cambios respecto a la versión anterior del plan)* | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 2 | UI | **Reemplazar los dos `segmentedWrapper` (categoría + vista) por un único control `filterWrapper`**: un chip compacto (`Pressable`, `alignSelf: "flex-start"`, no ocupa toda la fila — ya no necesita compartir espacio con otro control). Nuevo estado local `const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)`. **Texto del chip colapsado, condicional según la opción activa** (ajuste puntual — ver Decisiones): si `activeOption === "pendientes"` → `"{icono} Pendientes ({filterOptionCounts.pendientes})"` (conserva el conteo, es el único lugar donde se ve sin abrir nada); si `activeOption` es `"arreglo"`/`"confeccion"` → solo `"{icono} {Etiqueta}"`, **sin conteo** (el número ya se muestra fijo junto al header de fecha, tarea 5 — mostrarlo también acá sería duplicado). En los tres casos, agregar el ícono `Ionicons` `chevron-down`/`chevron-up` según `isFilterMenuOpen`. `accessibilityLabel="Cambiar filtro de agenda"` (fijo, no incluye el conteo dinámico para no romper con cada cambio de datos), `accessibilityState={{ expanded: isFilterMenuOpen }}`. Al tocarlo, alterna `isFilterMenuOpen`. Reutiliza el mecanismo inline de `OperarioPickerField` (sin `Modal`, ver Contexto). | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 3 | UI | Cuando `isFilterMenuOpen`, renderizar debajo del chip (inline, empujando `WeekStrip`/lista hacia abajo mientras está abierto, igual que `OperarioPickerField`) una lista vertical de 3 `Pressable` — uno por cada valor de `FILTER_OPTIONS: FilterOption[] = ["arreglo", "confeccion", "pendientes"]` (nuevo tipo `type FilterOption = ScheduleCategory \| "pendientes"`). **Sin cambios por el ajuste puntual**: las 3 opciones del desplegable siguen mostrando su conteo completo, `"{icono} {Etiqueta} ({conteo})"` (mismo `filterOptionCounts` de la tarea 4) — a diferencia del chip colapsado (tarea 2), acá sí se mantienen los 3 números simultáneamente, porque es la única superficie donde se pueden comparar las 3 opciones a la vez estando parado en "Pendientes" (donde el bloque fijo de la tarea 5 no existe, ver Decisiones). Cada opción usa `accessibilityRole="radio"` (mismo rol ya usado en el proyecto para grupos de opciones mutuamente excluyentes, ver `PricingForm.tsx:73` y `ScheduleFormScreen.tsx:446`) y `accessibilityState={{ selected: isActive }}`. `accessibilityLabel` fijo por opción (sin el conteo): `"Ver arreglos"`, `"Ver confecciones"`, `"Ver turnos pendientes"`. Al presionar una opción: si es `"pendientes"` → `setActiveView("pendientes")` (sin tocar `activeCategory`, ver Decisiones — preserva la categoría para el FAB); si es `"arreglo"`/`"confeccion"` → `setActiveView("dia")` **y** `setActiveCategory(option)`; en los 3 casos, cerrar con `setIsFilterMenuOpen(false)`. Reemplaza por completo el JSX de las líneas 383-408 y 435-485 de la versión actual del archivo. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 4 | UI/lógica | Nuevo `useMemo` `filterOptionCounts: Record<FilterOption, number>` que calcula **los 3 conteos simultáneamente** (hace falta ver los 3 a la vez, tanto en el desplegado como en el nuevo bloque fijo de la tarea 5): `pendientes` reutiliza `pendingSchedules.length` (ya incluye `matchesSearch`, sin filtro de categoría tras la tarea 7). `arreglo`/`confeccion` se calculan con un helper `countForCategory(category)` que replica exactamente la misma lógica que ya decide qué mostrar en la vista "Día" — **pero para ambas categorías a la vez, y sin depender de `activeView`** (ver siguiente punto): si `searchTerm.trim()` no está vacío, cuenta sobre `allSchedules.filter(item => item.category === category).filter(item => item.status !== "entregado").filter(matchesSearch).length` (mismo filtro que `searchResults`, líneas 158-173, sin el `.sort` que no hace falta para contar); si está vacío, cuenta sobre `allDateSchedules.filter(item => item.category === category).filter(matchesSearch).length` (mismo filtro que `dateSchedules`, líneas 137-143). Ver Decisiones de Diseño por qué esta condición usa `searchTerm` directo y no `isSearchingDia`. Esta fuente única de verdad es la que alimenta **tanto** el desplegable (tarea 3) **como** el bloque fijo (tarea 5) — no se duplica la lógica de conteo en dos lugares. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 5 | **UI (nueva, ajuste puntual)** | Agregar un bloque `dayCategoryCounters` **fijo**, siempre visible mientras `activeView === "dia"` (sin depender de `isFilterMenuOpen`), ubicado inmediatamente **debajo** de `styles.header` (línea 525 de la versión actual) y dentro del mismo fragmento condicional (líneas 487-527) — nunca se renderiza en "Pendientes" (ver Contexto, ese fragmento no existe en esa vista). Estructura: `<View style={styles.dayCategoryCounters}>` con dos `Text`, uno por categoría: `` `✂️ Arreglos (${filterOptionCounts.arreglo})` `` y `` `🧵 Confecciones (${filterOptionCounts.confeccion})` ``, reutilizando los mismos íconos que `FILTER_OPTION_LABELS` (tarea 6). El `Text` cuya categoría coincide con `activeCategory` recibe un estilo adicional (`styles.dayCategoryCounterTextActive`, ej. color `colors.primary` + `fontWeight: "700"`) para dejar claro cuál de los dos números corresponde a la lista que se está viendo debajo. **No** se coloca dentro de `styles.header` ni se agrega al `dateLabel` existente: ese `Text` ya tiene `numberOfLines={1}` y `flex: 1` (línea 512), compartido con el selector de fecha (`ScheduleDateTimePickerField`) en la misma fila — meter ahí dos conteos más generaría truncamiento o un salto de línea desprolijo en pantallas angostas; por eso es una fila propia, nueva, debajo del `header`. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 6 | Limpieza | Eliminar las constantes `VIEWS` (líneas 51-54) y `CATEGORY_ICONS` (líneas 58-61) tal como están hoy (quedan sin uso al desaparecer el JSX que las consumía) y reemplazarlas por `FILTER_OPTIONS` (tarea 3) y un nuevo `FILTER_OPTION_LABELS: Record<FilterOption, string> = { arreglo: "✂️ Arreglos", confeccion: "🧵 Confecciones", pendientes: "📋 Pendientes" }`. Se preservan los mismos emojis que ya usaba `CATEGORY_ICONS`/`VIEWS` (el comentario original de `CATEGORY_ICONS`, línea 56-57, explica que son los mismos que usa Precios para arreglo/confección — se mantiene esa consistencia visual entre features, incluida en el nuevo bloque fijo de la tarea 5). Las etiquetas van en **plural** ("Arreglos"/"Confecciones"), distinto del `SCHEDULE_CATEGORY_LABELS` compartido (singular: "Arreglo"/"Confección", usado en `ScheduleFormScreen` y otros lados) — es una decisión de texto exclusiva de este selector, explícitamente pedida así por el usuario; **no se toca** `SCHEDULE_CATEGORY_LABELS` en `domain/types.ts` para no afectar otras pantallas. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 7 | **Dominio/lógica** | **Cambio de comportamiento, no solo visual**: quitar el `.filter((item) => item.category === activeCategory)` del `useMemo` de `pendingSchedules` (línea 144-150), dejando solo `.filter(matchesSearch)`. `dateSchedules` (línea 137-143) y `searchResults`/`isSearchingDia` (línea 158-173) **no se tocan** — la categoría sigue aplicando ahí, sin cambios. Quitar `activeCategory` del arreglo de dependencias de ese `useMemo` (ya no se usa dentro del callback). *(sin cambios respecto a la versión anterior del plan)* | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 8 | Test | Reemplazar los 3 tests que hoy buscan el texto literal `"📋 Pendientes"` (líneas 297, 317, 331) por su equivalente con el nuevo control: presionar `getByLabelText("Cambiar filtro de agenda")` para abrir, luego `getByLabelText("Ver turnos pendientes")` para elegir la opción (el chip se cierra solo tras elegir, no hace falta cerrarlo aparte). Confirmar que el texto del chip colapsado cambia a algo que matchee `/📋 Pendientes \(\d+\)/` tras seleccionar. **Agregar además** (ajuste puntual, tarea 2): al elegir en cambio "Ver arreglos" o "Ver confecciones", confirmar que el chip colapsado muestra `"✂️ Arreglos"`/`"🧵 Confecciones"` **sin** ningún número entre paréntesis (`expect(...).not.toMatch(/\(\d+\)/)`), a diferencia de "Pendientes". | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 9 | Test | Reemplazar el test de la línea 401 ("filtra los turnos por categoría...") para usar el nuevo flujo: abrir el desplegable, presionar `getByLabelText("Ver confecciones")` en vez de `getByText("🧵 Confección")`. El resto del test (verificar que cambia la lista y que el FAB navega con `category: "confeccion"`) queda igual. | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 10 | Test | Test nuevo (cambio de comportamiento, el más importante de este ítem): con `pendingSchedules` mockeado con un turno `category: "arreglo"` y otro `category: "confeccion"`, al elegir la opción "Ver turnos pendientes" **ambos** deben renderizarse (`findByLabelText` de las dos tarjetas), sin importar cuál era la categoría activa antes de abrir el desplegable. Antes de este cambio solo se veía el de la categoría activa. | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 11 | Test | Test nuevo que reemplaza al viejo "categoría deshabilitada en Pendientes" (ya no aplica — no existe un botón de categoría independiente que se pueda presionar estando en "Pendientes", ver Decisiones): con la opción "Pendientes" activa, abrir el desplegable y confirmar que las 3 opciones son visibles simultáneamente con sus 3 conteos correctos (`getByText` matcheando cada `"{icono} {Etiqueta} (N)"` esperado según los fixtures del test — sin cambios por el ajuste puntual, el desplegable interno conserva los 3 números, ver tarea 3), y que la opción "Pendientes" aparece marcada como seleccionada (`accessibilityState.selected`). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 12 | Test | Test de regresión explícito: en la opción "Día" (Arreglo/Confección, comportamiento sin cambios), con un turno `arreglo` y uno `confeccion` en `dateSchedules`, verificar que sigue mostrándose solo la categoría activa por defecto y que cambia al elegir la otra opción del desplegable — repetición intencional del test ya existente para dejar registrado que este flujo no cambió de comportamiento, solo de forma de interacción (ahora vía desplegable en vez de dos botones). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 13 | Test | Test específico del desdoblamiento de contador **dentro del desplegable** (tarea 4, sin cambios de fondo por el ajuste puntual): con `dateSchedules` = 2 turnos `arreglo` + 1 turno `confeccion` para la fecha seleccionada, abrir el desplegable y confirmar que se ven simultáneamente `"✂️ Arreglos (2)"` **y** `"🧵 Confecciones (1)"` en la lista de opciones — cubre que el desplegable conserva ambos números aunque ya no sea la única superficie donde aparecen (ver tarea 14). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 14 | **Test (nuevo, ajuste puntual)** | Test específico del bloque fijo de la tarea 5, el más importante de este ajuste: con `dateSchedules` = 2 turnos `arreglo` + 1 turno `confeccion` para la fecha seleccionada y **sin abrir el desplegable** (`isFilterMenuOpen` en su valor inicial `false`), confirmar con `getByText` que `"✂️ Arreglos (2)"` y `"🧵 Confecciones (1)"` son visibles de entrada, junto al `dateLabel` de la fecha. Es el test que prueba directamente el pedido del usuario ("verlos siempre, sin abrir nada"). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 15 | Test | Test nuevo de consistencia de conteo con búsqueda activa (edge case documentado en Decisiones): estando en la opción "Pendientes" con un `searchTerm` no vacío, y con `allSchedules` conteniendo turnos de `arreglo` en fechas distintas a la seleccionada que matchean la búsqueda, abrir el desplegable y confirmar que el conteo de "Arreglos" ahí mostrado coincide con `searchResults.length` (cuenta cruzando fechas), **no** con `dateSchedules.length` (solo la fecha seleccionada) — confirma que el conteo no depende de `activeView` sino de si hay búsqueda activa. Nota: en este escenario (`activeView === "pendientes"`) el bloque fijo de la tarea 5 no está visible, por eso el test verifica el conteo vía el desplegable. | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 16 | **Test (nuevo, ajuste puntual)** | Test que confirma que el bloque fijo (tarea 5) **desaparece** al elegir "Ver turnos pendientes": tras seleccionar esa opción, `queryByText` de `/✂️ Arreglos \(\d+\)/` y `/🧵 Confecciones \(\d+\)/` deben devolver `null` — coherente con que en "Pendientes" no hay concepto de "día" al cual anclar esos conteos (ver Contexto: ni `WeekStrip` ni `header` se renderizan en esa vista). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 17 | Test | Test de orden visual: sin ninguna interacción, comparar en el árbol serializado (`JSON.stringify(render(...).toJSON())`) que el índice del placeholder `"Buscar por cliente"` es menor que el índice del texto del chip colapsado. **Ajustar el texto de referencia por el ajuste puntual**: el chip colapsado en su estado por defecto (categoría "arreglo" activa) ya no incluye conteo, así que el texto a buscar es `"✂️ Arreglos"` (sin paréntesis), no `"✂️ Arreglos (N)"` — confirma que el buscador quedó primero. Mismo patrón liviano ya usado en otras pantallas del proyecto para validar orden sin agregar `testID` nuevos. | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 18 | Test | Revisión de regresión: correr la suite completa de `ScheduleDayViewScreen.test.tsx` tras los cambios. En particular confirmar que ningún otro test dependía implícitamente de que hubiera dos controles separados en pantalla, de que el chip colapsado siempre mostrara un número, o de que los conteos de Arreglos/Confecciones solo existieran dentro del desplegable (buscar referencias sueltas a `"segmentedWrapper"` o a los textos `"Día"`/`"Confección"`/`"Arreglo"` sin pasar por el nuevo flujo). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |

### Migración de Supabase

No aplica. Cambio puramente de UI (reordenar/rediseñar JSX de una pantalla,
fusionar dos controles en un selector desplegable de 3 opciones, agregar un
bloque de texto fijo con conteos junto al encabezado de fecha) y de una
condición de filtrado en memoria dentro de un `useMemo` de la propia
pantalla (`activeCategory` deja de aplicarse a `pendingSchedules`). No toca
`domain/types.ts` (más allá de leer los tipos/constantes ya existentes,
`SCHEDULE_CATEGORY_LABELS` no se modifica), ningún repositorio, ninguna
tabla de SQLite/Supabase ni el motor de sync (`src/data/sync/`). No
requiere build de EAS (JS/TS puro, sin dependencias nativas nuevas ni cambio
de configuración nativa — los íconos `chevron-down`/`chevron-up` son parte
de `@expo/vector-icons`, ya instalado y usado en esta misma pantalla).

### Decisiones de Diseño

- **Un solo selector de 3 opciones mutuamente excluyentes, no dos controles
  fusionados en una fila**: el diseño anterior (categoría con texto + toggle
  de íconos Día/Pendientes, con la categoría deshabilitada en "Pendientes")
  fue reemplazado por decisión explícita del usuario después de verlo
  planteado. El nuevo diseño colapsa categoría y vista en un solo estado
  conceptual de 3 valores (`"arreglo" | "confeccion" | "pendientes"`),
  representado en pantalla por un chip que se expande a una lista de 3
  opciones. Esto resuelve de raíz el problema que motivó la tarea original
  ("¿se deshabilita o se oculta la categoría en Pendientes?"): **la
  pregunta deja de existir**, porque ya no hay un control de categoría
  independiente que pueda quedar en un estado inconsistente — "Pendientes"
  es simplemente una de las 3 opciones, al mismo nivel que
  "Arreglos"/"Confecciones", nunca coexiste con ellas ni necesita
  atenuarse.
- **Estado interno: se conservan `activeView`/`activeCategory` tal cual,
  sin crear un tercer estado redundante**: en vez de introducir un nuevo
  `useState<FilterOption>` que reemplace a los dos existentes (lo que
  obligaría a tocar cada lugar del archivo que hoy lee `activeView` o
  `activeCategory` — `dateSchedules`, `pendingSchedules`, `searchResults`,
  `isSearchingDia`, el `header` de fecha, el FAB), se calcula
  `activeOption` como valor **derivado**: `activeView === "pendientes" ?
  "pendientes" : activeCategory`. Al elegir una opción del desplegable se
  actualizan `activeView`/`activeCategory` como corresponda (ver tarea 3).
  Esto minimiza la superficie de cambio y el riesgo de romper lógica ya
  probada que no tiene nada que ver con el rediseño visual del control.
- **Por qué "Pendientes" no toca `activeCategory` al seleccionarse**: igual
  que en la versión anterior del plan, el FAB "Nuevo turno" sigue navegando
  con `category: activeCategory` sin importar la vista activa — crear un
  turno siempre requiere una categoría concreta. Si seleccionar "Pendientes"
  reseteara `activeCategory`, se perdería la última categoría elegida por
  el usuario y el FAB dejaría de reflejar su intención más reciente. Al no
  tocarla, el comportamiento del FAB queda idéntico al de antes de este
  cambio.
- **El contador de "Día" se desdobla en dos (Arreglos/Confecciones), el de
  "Pendientes" se mantiene sin cambios de fórmula**: como se documentó en
  Contexto, hoy solo existen dos contadores (ambos en el segmentado de
  vista) y **ninguno** en el de categoría. Al fusionar categoría y vista en
  un solo selector de 3 opciones, cada opción necesita su propio número —
  por eso hace falta calcular el conteo de "Día" para **ambas** categorías
  a la vez (antes solo se necesitaba para la categoría activa, porque era
  la única visible). No se pierde ningún contador: los 3 números
  resultantes (`arreglo`, `confeccion`, `pendientes`) son una
  descomposición exacta de los 2 contadores que existían antes.
- **Ajuste puntual — por qué Arreglos/Confecciones se mudan a un lugar fijo
  y Pendientes no**: el usuario pidió explícitamente que los conteos "del
  día" (Arreglos/Confecciones) no queden escondidos en un desplegable
  normalmente cerrado, y que se vean siempre junto al encabezado de fecha.
  Esto tiene sentido de datos, no solo de UX: esos dos números están
  atados a `selectedDate` (cambian al moverse por el `WeekStrip` o elegir
  otra fecha), así que su lugar natural es junto al elemento que muestra
  esa fecha (`styles.header`). El conteo de "Pendientes", en cambio,
  **no tiene fecha** — es un total agregado, independiente del día que se
  esté mirando en el `WeekStrip`. No existe hoy (ni tendría sentido crear)
  un "encabezado de Pendientes" análogo al `header` de fecha al cual
  anclarlo de forma igual de natural; de hecho, cuando `activeView ===
  "pendientes"` ni el `WeekStrip` ni el `header` se renderizan (ver
  Contexto), así que un bloque fijo "junto a la fecha" simplemente no
  aplicaría en esa vista. Por eso se mantiene donde ya estaba pensado:
  visible en el **chip colapsado** cuando esa es la opción activa (`"📋
  Pendientes (N)"`), que es un elemento que está en pantalla todo el
  tiempo sin necesidad de tocar nada — no es lo mismo que "escondido
  dentro de un desplegable cerrado" (la queja original del usuario), es
  simplemente vivir en el texto de un control que siempre está a la vista.
- **Chip colapsado: conteo condicional, no simétrico entre las 3
  opciones**: al ya no ser necesario duplicar en el chip el número de
  Arreglos/Confecciones (ahora visible fijo, tarea 5), se simplifica su
  texto a solo `"{icono} {Etiqueta}"` para esas dos opciones. Se decidió
  **no** aplicar la misma simplificación a "Pendientes" porque, a
  diferencia de las otras dos, no tiene ningún otro lugar fijo donde
  mostrarse (ver punto anterior) — quitarle el conteo también ahí dejaría
  ese número visible únicamente dentro del desplegable, que es exactamente
  la situación que el usuario pidió evitar. El resultado es asimétrico a
  propósito: dos opciones sin número en el chip (porque ya está fijo en
  otro lado) y una con número (porque el chip es su único lugar visible
  sin interacción).
- **El desplegable interno (tarea 3) no se simplifica, conserva los 3
  conteos completos**: se evaluó quitarle también a las opciones
  "Arreglos"/"Confecciones" el número dentro de la lista desplegada (ya que
  técnicamente queda visible dos veces a la vez — en el bloque fijo y en el
  desplegable — mientras este último está abierto en modo "Día"). Se
  decidió **no** hacerlo: el pedido explícito del usuario fue sobre "el
  chip colapsado", no sobre el contenido del desplegable en sí, y quitar
  el número ahí rompería un caso de uso real que sí importa — estando
  parado en "Pendientes" (donde el bloque fijo de la tarea 5 no existe,
  ver arriba), el desplegable es la **única** superficie donde se pueden
  comparar los 3 conteos antes de decidir a cuál cambiar. Mantenerlos ahí
  preserva esa utilidad sin agregar una condición extra no pedida (ej.
  "mostrar el número solo si `activeView !== 'dia'`"), que sería
  complejidad innecesaria para un beneficio cosmético menor. La leve
  redundancia visual resultante (mismo número en dos lugares a la vez,
  solo cuando el desplegable está abierto y `activeView === "dia"`) se
  documenta como riesgo aceptado, no oculto — ver Riesgos.
- **Bloque fijo de conteo (tarea 5): fila propia debajo del `header`, no
  dentro de él**: el `header` actual ya tiene dos elementos compitiendo por
  ancho en la misma fila (`dateLabel` con `flex: 1` y `numberOfLines={1}`,
  más el selector de fecha). Sumar ahí dos textos de conteo forzaría
  truncamiento del nombre del día o un salto de línea desprolijo en
  pantallas angostas. Por eso el nuevo bloque es una fila independiente,
  inmediatamente debajo, dentro del mismo fragmento condicionado a
  `activeView === "dia"` — mismo criterio de "visible sin abrir nada" que
  pidió el usuario, sin comprometer el layout existente del encabezado de
  fecha.
- **Se resalta visualmente cuál de los dos conteos fijos corresponde a la
  categoría activa**: dado que ahora se muestran Arreglos y Confecciones
  simultáneamente (aunque la lista de abajo solo muestre una de las dos
  categorías a la vez, comportamiento sin cambios), se aplica un estilo
  distinto (color primario + negrita) al número que coincide con
  `activeCategory`, para que no haya ambigüedad sobre cuál de los dos
  números describe lo que se está viendo en la lista.
- **El conteo de Arreglos/Confecciones usa `searchTerm.trim()` directo, no
  `isSearchingDia`, para decidir si cuenta cruzando fechas**: `isSearchingDia`
  se define como `activeView === "dia" && searchTerm.trim().length > 0`
  (línea 157), es decir, depende de estar parado en la vista "Día". Pero el
  desplegable puede abrirse estando en "Pendientes" con un término de
  búsqueda cargado, y el número que se muestre ahí para "Arreglos" debe
  predecir correctamente lo que se va a ver **si se elige esa opción**
  (que sí activaría `isSearchingDia`, porque al elegir "Arreglos" se hace
  `setActiveView("dia")`). Si el conteo usara `isSearchingDia` tal cual,
  mostraría el número de la fecha seleccionada nada más (porque
  `activeView` todavía sería `"pendientes"` en el momento de calcularlo) y
  ese número no coincidiría con lo que aparece un instante después de
  tocarlo — una inconsistencia visible y confusa. Por eso el cálculo de
  `filterOptionCounts` usa `searchTerm.trim().length > 0` de forma
  independiente de `activeView` (cubierto por el test 15). La lógica de
  renderizado de la lista (`dateSchedules`/`searchResults`/
  `isSearchingDia`) no se toca, sigue exactamente igual — este ajuste es
  exclusivo del cálculo de los 3 conteos del selector (y, ahora, también
  del bloque fijo, que consume la misma fuente).
- **Vertical, no horizontal, y sin `Modal`**: el desplegado de las 3
  opciones se apila verticalmente debajo del chip (empujando el contenido
  de abajo), reutilizando el mismo mecanismo de `OperarioPickerField`
  (`isOpen` local + render condicional inline). Se descarta un `Modal`
  (como el de `ScheduleQuickActionSheet`) por ser una solución más pesada
  de lo que este caso necesita — 3 opciones fijas sin búsqueda ni scroll,
  que no requieren tapar el resto de la pantalla. Se descarta horizontal
  (3 chips en fila) porque el chip colapsado ya comunica "esto se
  despliega" con el ícono de flecha, y una fila de 3 opciones diluiría esa
  metáfora además de competir en ancho con el resto de la fila en pantallas
  angostas.
- **`accessibilityRole="radio"` para las 3 opciones**: se reutiliza el
  mismo rol que ya usa el proyecto para grupos de selección mutuamente
  excluyente (`PricingForm.tsx`, `ScheduleFormScreen.tsx`), en vez de
  `"tab"` (usado en la versión anterior de este mismo control, cuando
  categoría y vista eran conceptualmente pestañas independientes) o de
  inventar `"menuitem"` (no usado hoy en el proyecto). Semánticamente esto
  ya no es un conjunto de pestañas paralelas, es una única elección de 3
  valores — "radio" describe mejor esa relación y sigue un patrón ya
  validado en la base de código.
- **Etiquetas en plural, distintas de `SCHEDULE_CATEGORY_LABELS`**: el
  usuario pidió explícitamente "Arreglos | Confecciones | Pendientes"
  (plural). Se define un nuevo `FILTER_OPTION_LABELS` local a esta pantalla
  en vez de modificar el `SCHEDULE_CATEGORY_LABELS` compartido (singular),
  que sigue usándose en `ScheduleFormScreen` y no debe cambiar de texto por
  un pedido específico de este selector.
- **Por qué el cambio de filtrado no toca `searchResults`/`isSearchingDia`**:
  sin cambios respecto a la versión anterior — esa lógica es exclusiva de
  la vista "Día" por construcción, y sigue fuera del alcance de
  "Pendientes".

### Riesgos o Consideraciones

- **Rotura de tests existentes por diseño, no por bug**: los tests que hoy
  buscan los textos `"📋 Pendientes"`/`"🧵 Confección"`, los que asumían dos
  controles separados, y los que asumían que el chip colapsado siempre
  mostraba un número, van a fallar hasta reescribirlos (tareas 8-12, 17) —
  es un cambio esperado y necesario, no una regresión a investigar.
- **Cambio de comportamiento real en "Pendientes"** (sin cambios respecto a
  la versión anterior): cualquier turno pendiente de la categoría no
  seleccionada, que hoy queda invisible en esa vista, va a aparecer después
  de este cambio.
- **Riesgo declarado, no oculto — ambigüedad menor en el conteo de
  "Pendientes" tras la tarea 7**: una vez que `pendingSchedules` deja de
  filtrarse por categoría, su contador (visible en el chip colapsado)
  representa el total de pendientes de **ambas** categorías. Esto es
  exactamente el comportamiento pedido, pero es un cambio de significado
  del número respecto a hoy (hoy ese mismo número solo contaba la
  categoría activa) — vale la pena que quien valide el build lo tenga
  presente: el número de "Pendientes" puede saltar de golpe apenas se
  actualice la app si había pendientes represados en la categoría no
  vista.
- **Riesgo declarado, no oculto — redundancia visual leve y aceptada
  (ajuste puntual)**: mientras el desplegable está abierto y `activeView
  === "dia"`, el número de la categoría activa (Arreglos o Confecciones)
  aparece simultáneamente en el bloque fijo (tarea 5) y en su opción
  correspondiente dentro de la lista desplegada (tarea 3). Es una decisión
  consciente (ver Decisiones — "El desplegable interno no se simplifica"),
  no un descuido: quitar el número del desplegable rompería la utilidad de
  comparar los 3 conteos estando parado en "Pendientes". El costo es
  puramente cosmético (ver el mismo número dos veces en pantalla durante
  los segundos que el desplegable está abierto), sin ambigüedad de datos.
- **Ningún contador quedó "sin encaje" en el modelo de 3 opciones**: se
  investigó explícitamente (ver Contexto) y no existe hoy un tercer
  contador o un contador de categoría que no tenga un lugar claro en el
  nuevo diseño — los 2 contadores existentes se mapean limpiamente a los 3
  números del nuevo selector (el de "Día" desdoblado en 2 y ahora fijo
  junto al header de fecha, el de "Pendientes" igual que antes pero visible
  en el chip). No se declara ningún contador huérfano.
- **Layout: una fila nueva entre el `header` de fecha y el `ScrollView`**:
  el bloque fijo de la tarea 5 reduce ligeramente el espacio vertical
  disponible para la lista de turnos en pantallas de baja altura. No es un
  cambio estructural grave (una sola fila de texto), pero vale la pena que
  quien construya lo revise en un dispositivo de pantalla chica antes de
  dar por cerrado el ajuste.
- Sin impacto en offline-first ni en sync: `activeCategory`/`activeView`/
  `searchTerm`/`isFilterMenuOpen` son estado transitorio de la pantalla
  (`useState` local), no persisten ni se sincronizan. El nuevo
  `filterOptionCounts` y el bloque fijo de la tarea 5 son derivados en
  memoria de datos que ya se cargan hoy, sin nueva llamada a repositorio ni
  nuevo estado persistente.
- Sin build de EAS necesaria.
- No hay migración de esquema (SQLite ni Supabase) involucrada; no aplica la
  regla de aditividad porque no se toca ninguna tabla ni columna.
