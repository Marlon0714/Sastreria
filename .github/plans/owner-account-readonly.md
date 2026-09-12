## Plan de Implementación: Acceso de solo lectura del dueño a "Mi cuenta" (N-106, fase a)

> Alcance: **solo fase (a)** — el dueño puede VER su perfil (correo, rol) en modo
> solo lectura. La fase (b) (habilitar los botones "Cambiar" para el dueño) NO
> se planea ni se implementa acá — ver nota en "Riesgos o Consideraciones".

### Contexto

- `MyAccountScreen.tsx` ya lee `role` de `useIdentityStore` (usado hoy solo
  para `roleLabel`, "Dueño"/"Operario"). Tiene una card "Cuenta" con 3 filas
  (Correo/Contraseña/PIN), cada una con un botón "Cambiar" que abre
  `ReauthStep` + formulario inline (`editingField` state), más un botón
  "Mis arreglos" que navega a `MyActivity`. `useAccountActions()` (el hook que
  trae `currentEmail`) no tiene ninguna lógica de rol — llama a
  `auth.getUser()`/`auth.updateUser()` sobre la sesión propia, sirve igual
  para dueño u operario sin cambios.
- Hoy la pantalla está registrada en `ScheduleStackNavigator.tsx` y
  `PricingStackNavigator.tsx` (ambas ya incluyen las rutas `MyAccount` y
  `MyActivity`). El único bloqueo real es de acceso, no de registro de ruta:
  `ProfileButton.tsx` retorna `null` si `role !== "operario"`, y
  `AppHeader.tsx` (`navigateToMyAccount`) solo resuelve navegación para
  `activeTab === "ScheduleTab" | "PricingTab"`.
- `FeatureTabsNavigator.tsx` (`TAB_ROLES`) confirma que el dueño **ya ve**
  las 5 tabs, incluidas `ScheduleTab` y `PricingTab` (no son exclusivas de
  operario) — pero su tab de aterrizaje (`visibleTabs[0]`, primera del
  arreglo `ALL_TABS` que le sea visible) es `DashboardTab`, la única que hoy
  NO tiene registrada la ruta `MyAccount`. Si solo se arregla el guard de
  `ProfileButton`, el dueño vería el ícono en Dashboard pero al tocarlo no
  pasaría nada (`navigateToMyAccount` no tiene rama para `"DashboardTab"` →
  no-op silencioso). Por eso hace falta la entrada nueva en
  `DashboardStackNavigator.tsx`, tal como sugiere el requerimiento.
- `isSharedDevice` ya es el criterio establecido en el proyecto para
  distinguir "esto es personal, no del mostrador" (mismo patrón en
  `PricingStackNavigator`'s `isOperario`, y en `SHARED_DEVICE_EXEMPT_TABS` de
  `FeatureTabsNavigator`, que oculta la tab Dashboard completa en dispositivo
  compartido sin importar el rol del perfil de esa tablet). "Mi cuenta" es
  justamente ese tipo de función personal — el bypass de dispositivo
  compartido debe seguir aplicando igual para dueño que para operario.

### Tareas

| # | Tipo | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 1 | Navegación (tipos) | Agregar `MyAccount: undefined;` a `DashboardStackParamList` (mismo comentario de una línea que ya tienen `ScheduleStackParamList`/`PricingStackParamList` explicando qué es). | `src/navigation/types.ts` |
| 2 | Navegación | Registrar `<Stack.Screen name="MyAccount" component={MyAccountScreen} options={{ title: "Mi cuenta" }} />` en `DashboardStackNavigator`, sin envolver en `withTabSwipeLock` (mismo patrón: solo la pantalla raíz de cada stack se envuelve, `MyAccount`/`MyActivity` nunca lo están en `Schedule`/`PricingStackNavigator`). | `src/navigation/DashboardStackNavigator.tsx` |
| 3 | Navegación | Ampliar `navigateToMyAccount` con una rama `else if (activeTab === "DashboardTab") { navigationRef.navigate("DashboardTab", { screen: "MyAccount" }); }`. Actualizar el comentario de la función (ya no es cierto que solo Agenda/Precios registran la ruta). | `src/navigation/AppHeader.tsx` |
| 4 | UI (guard) | Cambiar el guard de `ProfileButton` de `if (role !== "operario" \|\| isSharedDevice) return null;` a `if (isSharedDevice \|\| (role !== "operario" && role !== "owner")) return null;` — mismo criterio de bypass ya usado en el resto de la app. Reescribir el comentario del componente: ya no dice "el dueño no lo necesita", debe explicar que desde N-106(a) el dueño también entra, en modo solo lectura (la fase b, edición, es trabajo futuro). | `src/features/auth/components/ProfileButton.tsx` |
| 5 | UI (condicional por rol) | En `MyAccountScreen`, derivar `const isOwner = role === "owner";` (reutilizando el `role` que ya se lee de `useIdentityStore` para `roleLabel` — sin prop nueva, sin prop drilling). Envolver el botón "Mis arreglos" en `{!isOwner ? (...) : null}` y, en cada una de las 3 filas de la card "Cuenta", cambiar la condición del botón "Cambiar" de `editingField !== "email"` a `editingField !== "email" && !isOwner` (ídem `password`/`pin`). Como consecuencia, el bloque de edición (`ReauthStep`/formulario) nunca se activa para el dueño porque `editingField` nunca deja de ser `null`. | `src/features/account/screens/MyAccountScreen.tsx` |
| 6 | UI (tipos, ajuste menor) | Verificar `npm run typecheck` tras el cambio 2. `MyAccountScreenProps.navigation` hoy exige `{ navigate: (screen: "MyActivity") => void }`, pero `DashboardStackParamList` no tiene la ruta `MyActivity` (el botón "Mis arreglos" nunca se renderiza para el dueño, así que en runtime nunca se invoca). Si el typecheck no pasa por esto, volver `navigation` opcional (`navigation?: { navigate: (screen: "MyActivity") => void }`) y usar `navigation?.navigate("MyActivity")` en el `onPress` — cambio mínimo, sin afectar el comportamiento de operario. | `src/features/account/screens/MyAccountScreen.tsx` |
| 7 | Test | Actualizar `ProfileButton.test.tsx`: reemplazar el caso "no muestra nada para el dueño" (comportamiento viejo) por "muestra el botón para el dueño en su dispositivo personal y llama a onPress" (mismo patrón que el test de operario). Agregar caso nuevo "no muestra nada para el dueño en dispositivo compartido" (`role: "owner", isSharedDevice: true`). Mantener sin cambios el caso de operario en tablet compartida y el de "sin perfil resuelto". | `src/features/auth/components/ProfileButton.test.tsx` |
| 8 | Test | Actualizar `AppHeader.test.tsx`: reemplazar "no muestra Mi cuenta para el dueño" por un caso que confirme el nuevo comportamiento — dueño con `activeTab: "DashboardTab"`, botón visible, y al presionarlo `navigationRef.navigate` se llama con `("DashboardTab", { screen: "MyAccount" })` (mismo patrón que los casos ya existentes de Agenda/Precios para operario). Opcional pero recomendado: agregar un caso de regresión "dueño en dispositivo compartido no ve Mi cuenta" para cubrir la integración completa (no solo el test unitario de `ProfileButton`). Los 2 casos existentes de operario (Agenda/Precios) no deberían necesitar cambios. | `src/navigation/AppHeader.test.tsx` |
| 9 | Test | En `MyAccountScreen.test.tsx`, agregar un `describe`/bloque de casos con `useIdentityStore.getState().setOwnProfile({ role: "owner", ... })`: (a) se ve nombre, `roleLabel` "Dueño" y correo; (b) `queryByLabelText` de "Cambiar correo"/"Cambiar contraseña"/"Cambiar PIN"/"Ver mis arreglos" son todos `null`. Los tests existentes (operario, sin tocar `beforeEach`) ya cubren la no regresión: siguen viendo los 3 botones "Cambiar" y "Mis arreglos" igual que hoy. | `src/features/account/screens/MyAccountScreen.test.tsx` |

### Migración de Supabase

No aplica. No se toca ninguna tabla ni columna de SQLite/Supabase — es navegación + UI condicional por rol sobre datos que ya se leen (perfil vía `useIdentityStore`, correo vía Supabase Auth `getUser()`, ambos ya usados hoy).

### Decisiones de Diseño

- **Por qué `DashboardStackNavigator` y no otro camino**: el dueño ya tiene acceso a `ScheduleTab`/`PricingTab` (donde `MyAccount` ya está registrado) según `TAB_ROLES`, pero su tab de aterrizaje es `DashboardTab`. Sin la entrada nueva ahí, tocar "Mi cuenta" desde la pantalla en la que el dueño normalmente aterriza sería un no-op silencioso (bug de UX). Se prefiere agregar la ruta donde falta en vez de, por ejemplo, redirigir siempre a `ScheduleTab` — eso sería una navegación cruzada de tab sorpresiva y más difícil de razonar que simplemente completar el patrón ya existente (cada tab que expone el ícono resuelve su propio `MyAccount`).
- **Por qué leer `role` directo de `useIdentityStore` en vez de una prop `readOnly`**: `MyAccountScreen` ya trae `role` para `roleLabel`; agregar una prop redundaría la misma fuente de verdad y abriría la puerta a que algún caller pase un valor inconsistente con el store real. Mismo criterio que ya usa el resto del árbol de navegación (`ProfileButton`, `PricingStackNavigator`, `FeatureTabsNavigator`) para decisiones por rol: leer el store directamente, no prop drilling.
- **Dueño en dispositivo compartido**: se aplica el mismo bypass ya establecido (`isSharedDevice`) que usa el resto de funciones "personales" del proyecto (`ProfileButton` para operario, `isOperario` en `PricingStackNavigator`, `SHARED_DEVICE_EXEMPT_TABS` para el Dashboard). En la práctica esto ya es defensivo por partida doble: el perfil de la tablet compartida siempre tiene `role: "operario"` por convención (ver comentario en `PricingStackNavigator`), y además `DashboardTab` (la única tab nueva que expone la ruta) ya está oculta incondicionalmente en dispositivo compartido vía `SHARED_DEVICE_EXEMPT_TABS`. Aun así, se mantiene el chequeo explícito en `ProfileButton` (no solo confiar en que la tab esté oculta) para no dejar un guard incompleto si algún día cambia esa suposición, y para que quede cubierto por un test unitario propio del componente.
- **`MyAccountScreen` no necesita saber nada de `isSharedDevice`**: esa responsabilidad es del punto de entrada (`ProfileButton` decide si se puede llegar) y de la visibilidad de tabs (`FeatureTabsNavigator` decide si `DashboardTab` existe). La pantalla en sí solo decide "editable vs. solo lectura" según `role` — separación de responsabilidades ya coherente con cómo `PricingStackNavigator` decide qué screen mostrar (por rol) sin que la screen interna sepa de dispositivos compartidos.
- **No se agrega copy nuevo tipo "Modo solo lectura"**: el pedido es ocultar los botones, no explicar por qué. Si se quiere una aclaración visual en el futuro, es una decisión de producto separada, no parte de este pedido.

### Riesgos o Consideraciones

- No requiere build de EAS (cambio puro JS/TS, sin dependencias nativas ni configuración nativa).
- No toca esquema de datos ni el motor de sync (`src/data/sync/`) — riesgo de regresión limitado a navegación y renderizado condicional.
- Punto de atención real de esta fase: el ajuste de tipos del punto 6 de la tabla (`MyAccountScreenProps.navigation`). Si no se ajusta y el typecheck falla, es la única pieza no puramente aditiva de UI — hay que resolverla sin volver a estrechar el tipo para los stacks que sí tienen `MyActivity` (Schedule/Pricing).
- **Fase (b) explícitamente fuera de alcance de este plan**: habilitar los botones "Cambiar" (correo/contraseña/PIN) para el dueño queda pendiente para un pedido futuro. Cuando se aborde, previsiblemente reutiliza el mismo `isOwner`/`role` ya introducido acá (probablemente basta con quitar el `&& !isOwner` de las 3 filas), pero no se diseña ni se toca en este ciclo.
- Ambigüedad menor no bloqueante: el pedido no aclara si el dueño debería ver alguna pista visual de que está en modo solo lectura (ej. texto explicativo). Se asumió que no, por minimalismo (ver Decisiones de Diseño) — si el usuario lo quiere, es un ajuste incremental trivial sobre este mismo plan, no bloquea la implementación de la fase (a).
