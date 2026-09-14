## Plan de Implementación: Agenda — "Confecciones" agrupadas por mes (N-127)

### Contexto

`ScheduleDayViewScreen.tsx` maneja un solo estado de fecha (`selectedDate`) y un
selector de 3 opciones (`FilterOption`: `arreglo` | `confeccion` | `pendientes`,
introducido en N-101, con conteos en el chip vía N-109/N-110). Hoy:

- `useScheduleDayView(selectedDate)` solo trae el **día puntual**: internamente
  llama `repo.getByDate(date)` (→ `allDateSchedules`) y `repo.getWithoutDate()`
  (→ `allPendingSchedules`). No acepta rango — no hay `getByDateRange`/`getByMonth`
  en `ScheduleRepository` ni en `ScheduleRepositoryImpl`.
- La pantalla YA carga **todos** los turnos en memoria por separado:
  `allSchedules` (estado local, poblado por `reloadAllSchedules()` →
  `scheduleRepository.getAll()`), usado hoy solo para `searchResults` (búsqueda
  cross-fecha) y para `filterOptionCounts` cuando hay término de búsqueda. Este
  es el dato correcto para resolver N-127 filtrando en memoria por mes — **no
  hace falta ni un método nuevo de repositorio ni una migración**, siguiendo la
  pista que da el propio backlog.
- `dateUtils.ts` ya tiene `getMonthRange(dateString)` (agregado en N-104 para
  el Dashboard, mismo patrón "día 0 del mes siguiente"), `shiftMonthDateString`
  y `formatMonthForDisplay("Septiembre 2026")` — reutilizables tal cual.
- El "bloque fijo de conteos" que menciona el enunciado ya no existe: N-109 lo
  reemplazó por un solo número en el chip (`filterOptionCounts`), calculado en
  un único `useMemo` que alimenta tanto el chip colapsado como el desplegable
  abierto (los 3 valores a la vez, siempre, sin importar cuál está activo).
- El ordenamiento de `searchResults` (fecha ASC, luego hora ASC, sin-fecha al
  final) es el patrón a replicar para la lista de confecciones del mes.
- `WeekStrip` sigue existiendo sin cambios desde N-101/N-110 (navegación de 7
  días + botón "Ir a hoy" comparando `selectedDate === todayDateString()`).

### Tareas

| # | Tipo | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 1 | Dominio | Agregar `isSameMonth(a: string, b: string): boolean` (compara año+mes de dos `YYYY-MM-DD`) — evita comparar `selectedDate === todayDateString()` a nivel de día para decidir si mostrar el atajo "Mes actual" en modo confección. Reutiliza el mismo estilo/documentación de las funciones vecinas (`getMonthRange`, `shiftMonthDateString`). | `src/features/schedule/domain/dateUtils.ts` |
| 2 | Dominio/Test | Tests de `isSameMonth` (mismo mes distinto día, mismo mes distinto año, meses distintos, límites de fin/inicio de mes). | `src/features/schedule/domain/dateUtils.test.ts` |
| 3 | UI | Nuevo `useMemo` `confeccionMonthSchedules`: sobre `allSchedules`, filtra `category === "confeccion"` + `item.date` dentro de `getMonthRange(selectedDate)` (`item.date != null && item.date >= startDate && item.date <= endDate`) + `matchesSearch`, luego ordena con el mismo comparador de `searchResults` (fecha ASC, hora ASC, sin-fecha al final — defensivo, aunque el filtro de rango ya excluye `date == null`). Calculado siempre (no solo cuando `activeCategory === "confeccion"`), porque el chip/desplegable necesita el conteo del mes incluso si la opción activa es otra. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 4 | UI | Redefinir `dateSchedules`: si `activeCategory === "confeccion"` usar `confeccionMonthSchedules`; si `activeCategory === "arreglo"` mantener el comportamiento actual (`allDateSchedules.filter(category==="arreglo").filter(matchesSearch)`). Sin cambios en `pendingSchedules` ni en `isSearchingDia`/`searchResults` (ver Decisiones de Diseño — la búsqueda ya ignora fecha por completo, superset de "el mes", se deja intacta a propósito). | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 5 | UI | Actualizar `filterOptionCounts.confeccion`: cuando NO hay término de búsqueda, usar `confeccionMonthSchedules.length` en vez de `allDateSchedules.filter(category==="confeccion")...length`. Cuando SÍ hay término de búsqueda, dejar la rama existente sin cambios (ya cuenta cross-fecha, no filtrado por mes — mismo criterio que la búsqueda de la lista). `arreglo`/`pendientes` sin cambios. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 6 | UI | Renderizado condicional del bloque `WeekStrip` + botón "Ir a hoy": ocultarlos cuando `activeView === "dia" && activeCategory === "confeccion"`. En su lugar, mostrar una cabecera de navegación por mes (bloque nuevo, inline en el mismo archivo — no amerita componente compartido para un único call-site): botón mes anterior (`shiftMonthDateString(selectedDate, -1)`), label central `formatMonthForDisplay(selectedDate)`, botón mes siguiente (`shiftMonthDateString(selectedDate, +1)`), y atajo "Mes actual" (mismo patrón visual que "Ir a hoy") visible solo si `!isSameMonth(selectedDate, todayDateString())`. Reutiliza iconos `chevron-back`/`chevron-forward` ya usados en `WeekStrip.tsx` para consistencia visual. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 7 | UI | Fila `header` (label de fecha + `ScheduleDateTimePickerField`): cuando `activeCategory === "confeccion"`, mostrar `formatMonthForDisplay(selectedDate)` en vez de `formatDateForDisplay(selectedDate)`. El date-picker (`ScheduleDateTimePickerField`, `mode="date"`) se deja funcional sin cambios — sirve como forma de "saltar" a cualquier mes eligiendo cualquier día dentro de él, complementando los botones prev/next mes de la tarea 6. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 8 | UI | Etiqueta de fecha por tarjeta: cuando se renderiza `dateSchedules` y `activeCategory === "confeccion"`, usar `formatSearchResultLabel(item)` (weekday+mes+hora) en vez de `item.time ?? "Sin hora"` — dentro del mes hay varios días distintos, hace falta identificar cuál. Para `arreglo` sin cambios (sigue siendo un solo día, el time-only label sigue siendo suficiente). | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 9 | UI | Mensaje de estado vacío: cuando `activeCategory === "confeccion"` y `dateSchedules.length === 0` (sin búsqueda activa), cambiar el texto genérico `"No hay turnos para este día."` por `"No hay confecciones agendadas este mes."`. | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 10 | UI | Mitigar el parpadeo de carga: agregar estado `isLoadingAllSchedules` (junto a `allSchedules`), en `true` inicialmente y hasta que `reloadAllSchedules()` resuelva por primera vez. Incluir `(activeCategory === "confeccion" && isLoadingAllSchedules)` en la condición del `LoadingView` de arriba del componente, además de la condición existente basada en `isLoading` de `useScheduleDayView` (ver Riesgos — sin esto, el mensaje vacío de confecciones puede parpadear antes de que `allSchedules` termine de cargar). | `src/features/schedule/screens/ScheduleDayViewScreen.tsx` |
| 11 | Test | Actualizar/agregar casos en el test de pantalla: (a) con `activeCategory=confeccion`, turnos de distintos días del mismo mes que `selectedDate` aparecen todos, uno de otro mes NO aparece; (b) cambiar de mes con prev/next actualiza la lista; (c) `WeekStrip`/"Ir a hoy" no se renderizan en modo confección, sí en modo arreglo; (d) el conteo del chip para "Confecciones" refleja el total del mes, no el del día, incluso estando en la opción "Arreglos"; (e) búsqueda activa en confección sigue mostrando resultados cross-fecha (comportamiento sin cambios, para dejar constancia de la decisión). | `src/features/schedule/screens/ScheduleDayViewScreen.test.tsx` |
| 12 | Test | Test de `isSameMonth` (ver tarea 2) ya cubierto ahí — confirmar que corre junto al resto de la suite de `dateUtils.test.ts` sin romper casos existentes. | `src/features/schedule/domain/dateUtils.test.ts` |

### Migración de Supabase

No aplica. Esta feature es de lectura/filtrado en memoria sobre datos que ya
se sincronizan y ya se cargan por completo en la pantalla (`allSchedules` vía
`getAll()`, usado previamente para búsqueda). No se toca ninguna tabla,
columna, ni consulta SQL nueva contra SQLite o Supabase.

### Decisiones de Diseño

- **Fuente de datos: memoria, no nueva consulta.** Se descartó agregar
  `getByDateRange`/`getByMonth` a `ScheduleRepository`/`ScheduleRepositoryImpl`
  porque `allSchedules` (todos los turnos, ya cargado por `getAll()`) vive en
  el mismo componente y ya se usa para el mismo propósito (búsqueda
  cross-fecha). Con "pocas confecciones" (según el propio enunciado) filtrar
  en memoria es más simple, no agrega una query nueva al hot path de
  `useFocusEffect`, y mantiene un solo lugar como fuente de verdad para "todos
  los turnos" en esta pantalla.
- **La búsqueda NO se acota al mes.** Cuando `isSearchingDia` es `true`
  (usuario escribiendo en el buscador estando en vista "Día"), el código ya
  documenta la decisión previa (N-101 y comentario en líneas 173-177) de
  ignorar la fecha por completo y buscar en TODO `allSchedules` (excluyendo
  `entregado`). Esa búsqueda es un superset de "el mes" — acotarla al mes
  activo sería un downgrade funcional (un usuario buscando "María" esperaría
  encontrar la confección de María sin importar en qué mes quedó agendada).
  Esta es la única ambigüedad real que el enunciado no cubre explícitamente
  ("¿la búsqueda respeta el mes o sigue siendo global?"); se resuelve
  manteniendo el precedente ya establecido en el propio código, documentado
  aquí para que quede explícito y no sea una omisión silenciosa.
- **`WeekStrip` se oculta en modo confección, no se adapta.** Cambiar de
  semana con `WeekStrip` mueve `selectedDate` en saltos de 7 días — la
  mayoría de las veces sin cruzar de mes, y ocasionalmente cruzando a mitad
  de mes de forma no evidente para el usuario (ej. ir de "semana siguiente"
  cambia el mes visible de confecciones sin que se entienda por qué, ya que
  visualmente parece un control de días). Mantenerlo visible pero "roto" en
  su semántica (parece granularidad diaria pero solo importa el mes) es peor
  que reemplazarlo por un control explícito de mes (prev/next mes + atajo
  "Mes actual"), reutilizando exactamente el mismo lenguaje visual
  (`chevron-back`/`chevron-forward`, botón de texto tipo "Ir a hoy") para que
  no se sienta como un patrón nuevo. El date-picker (ícono, `mode="date"`)
  se deja intacto como forma alternativa de saltar a un mes específico
  eligiendo cualquier fecha dentro de él.
- **`isSameMonth` como helper nuevo, no reutilizar `daysBetweenDates`.**
  Comparar por diferencia de días entre fechas para inferir "mismo mes" es
  fràgil cerca de fin de mes; comparar año+mes directo de los componentes de
  `YYYY-MM-DD` (mismo estilo ya usado en `getMonthRange`) es más simple y
  explícito.
- **Loading state de `allSchedules` explícito solo donde importa.** Antes de
  N-127, un `allSchedules` aún no cargado solo afectaba a `searchResults`
  (un caso ya iniciado activamente por el usuario, tolerable que tarde un
  instante) y a los conteos con búsqueda activa. Con N-127, `allSchedules`
  pasa a ser la fuente PRINCIPAL de la vista por defecto de "Confecciones"
  (no un caso secundario activado por búsqueda), así que el mismo retraso
  ahora se vería como "No hay confecciones agendadas este mes" parpadeando
  antes de la carga real — se agrega un flag de carga dedicado y acotado
  (`isLoadingAllSchedules`) en vez de tocar el contrato de `useScheduleDayView`
  (que sigue siendo válido tal cual para `arreglo`/`pendientes`).
- **No se renombra `dateSchedules` pese a que deja de ser "del día" para
  confección.** Se prioriza minimizar el diff sobre el nombre de la variable;
  se documenta con un comentario explicando la rama por categoría. Si el
  Builder prefiere renombrar a algo como `visibleSchedules` para mayor
  claridad, es un cambio cosmético aceptable dentro de la misma tarea 4, sin
  impacto funcional.
- **Estado (`selectedDate` como fuente única) sin cambios.** No se introduce
  un segundo estado tipo `selectedMonth` — se sigue derivando "el mes" de
  `selectedDate` con `getMonthRange`, igual que hace el Dashboard (N-104) con
  su selector de periodo. Mantiene una sola fuente de verdad de fecha en la
  pantalla, evitando desincronizaciones entre "el día" y "el mes".

### Riesgos o Consideraciones

- **Sin build de EAS.** Cambio puro JS/TS de UI y filtrado en memoria, sin
  dependencias nativas nuevas ni cambios de configuración nativa.
- **Parpadeo de carga (ver tarea 10 y Decisiones de Diseño):** si no se
  agrega `isLoadingAllSchedules`, un usuario que abre la Agenda directamente
  en "Confecciones" podría ver brevemente "No hay confecciones agendadas
  este mes" antes de que `allSchedules` termine de cargar. Bajo impacto (es
  un instante), pero real y evitable con poco código.
- **Turnos "confección" sin fecha (`Pendientes`) no se ven afectados** — la
  vista "Pendientes" sigue mezclando ambas categorías sin fecha, sin cambios
  de N-101. No hay riesgo de que un turno de confección "desaparezca": si
  tiene fecha, aparece en el mes correcto; si no tiene fecha, sigue en
  "Pendientes".
- **Cruce de mes vía `ScheduleForm` (`route.params?.date`, N-111):** si el
  Dashboard navega a la Agenda con una fecha específica y el usuario tiene
  activo el filtro "Confecciones" de una sesión anterior (estado de
  `activeCategory` no persiste entre navegaciones, se reinicia en
  `"arreglo"` por default), no hay riesgo — pero si en el futuro se decide
  persistir el filtro activo entre navegaciones, habría que revisar que
  "el mes de la fecha recibida por params" siga siendo el criterio esperado
  (ya lo es, por construcción, sin cambios necesarios hoy).
- **Volumen futuro:** si algún día "confecciones" deja de ser un volumen bajo,
  filtrar en memoria sobre `allSchedules` completo podría no escalar tan bien
  como una consulta SQL acotada por rango — no es un problema hoy (el propio
  requerimiento confirma volumen bajo) pero queda como nota para revisar si
  cambia el supuesto de negocio.
