# Definition of Done

Criterios mínimos para que un PR esté listo para mergear a `develop` o `main` en este
proyecto. Refleja cómo se ha trabajado realmente en este repo (ver
`.github/context/needs-backlog.md` y el historial de commits), no un proceso genérico.

Un PR que no cumple lo de abajo no está listo, sin importar qué tan urgente sea el cambio.

## 1. Checks en verde

- `npm run typecheck` — 0 errores.
- `npm run lint` — 0 errores.
- `npm run test:ci` — todos los tests pasan, cobertura sobre el umbral configurado en
  `package.json` (hoy 60/56/50 líneas/funciones/branches — ver N-011 en el backlog sobre
  por qué está ahí y no en 70/70/70).
- El workflow `CI` de GitHub Actions debe quedar verde sobre el commit final del PR. Un
  "en mi máquina pasa" no reemplaza el check de CI.
- Warnings preexistentes y ya documentados (por ejemplo en `needs-backlog.md`) no bloquean
  el merge. Warnings **nuevos** introducidos por el PR sí deben resolverse o justificarse
  explícitamente en la descripción del PR.

## 2. Cambios de esquema (SQLite local + Supabase)

- Si el PR agrega, renombra o modifica una columna o tabla en `src/data/local/migrations.ts`,
  el SQL equivalente para Supabase **debe** quedar documentado en `SUPABASE_MIGRATIONS.md`
  antes de mergear — no después, no "en un PR aparte pendiente".
- Sigue el mismo patrón que las migraciones existentes en ese archivo:
  - Bloque de SQL idempotente (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` o
    equivalente manual si la versión de Postgres no soporta `IF NOT EXISTS` en `ADD COLUMN`).
  - Una sección `### vNN_nombre_descriptivo (fecha)` con **contexto**: qué cambia, por qué,
    y qué pasa si alguien lo corre tarde o con datos ya existentes.
  - Si hay una trampa conocida (case-folding de Postgres, `NOT NULL` sin `DEFAULT`, orden de
    columnas dependiente de datos previos, etc.) anótala ahí mismo — ya hay precedentes de
    esto en el archivo (`v15_pricing_services_fix_column_case`, la nota de `sync_status`).
- Regla explícita y repetida del dueño del proyecto a lo largo de todo el historial:
  **los cambios de esquema son siempre aditivos**. Nunca deben poder perder datos ya
  guardados en producción.
  - Nunca `DROP COLUMN` ni `DROP TABLE` sobre datos que puedan existir en producción.
  - Si una columna queda obsoleta, se deja sin usar en el código (marcada como legacy) en
    vez de borrarla del esquema.
  - Si un valor viejo debe migrarse a un campo nuevo (por ejemplo, un campo que se separa en
    sub-campos), el PR debe migrar los datos existentes al nuevo campo, no descartarlos.
  - Esta regla aplica tanto al SQL de Supabase como a las migraciones de SQLite local.
- Si el PR requiere correr el SQL en Supabase antes de que el build sea instalable sin
  romper el sync (por ejemplo, tablas nuevas ya cableadas en el código de sync), esto debe
  quedar dicho explícitamente en la descripción del PR, no asumido.

## 3. Commits

- Commits separados por tema/concern lógico — no un único commit gigante con fix + feature
  + refactor mezclados. Si el PR toca varias cosas no relacionadas, se separan en commits
  (o directamente en PRs) distintos.
- El mensaje de cada commit explica el **por qué**, no solo el qué. `fix: turnos ya no se
  duplican` es mejor que `fix: bug en agenda`; mejor aún si el cuerpo del commit explica la
  causa raíz cuando no es obvia (ver el estilo ya usado en `git log` de este repo).
- Evitar mensajes tipo `wip`, `fix 2`, `arreglos` sin contexto.

## 4. Build nativa / EAS

- Si el cambio requiere una build de EAS para probarse en dispositivo real (dependencia
  nativa nueva, cambio de configuración nativa en `app.json`/`eas.json`, permisos nuevos,
  etc.), esto debe quedar explícito en la descripción del PR — quien revisa o mergea
  necesita saber que "los tests en verde" no es suficiente evidencia de que funciona.
- Si no se hizo build de EAS para validar el cambio, decirlo también (no dejarlo implícito).

## 5. Evidencia y descripción del PR

Sigue `.github/pull_request_template.md`. Como mínimo:
- Qué cambia y por qué (no solo qué).
- Qué se validó y cómo (salida de los comandos de verificación, y si se probó en
  dispositivo/emulador).
- Qué queda explícitamente fuera de alcance.
- Riesgos conocidos y, si aplica, plan de rollback (especialmente relevante si el PR toca
  sync o esquema).

## No bloquea el merge

- Warnings preexistentes ya documentados en el backlog.
- Cobertura de tests por debajo del ideal (70%), siempre que no baje del umbral configurado
  en `package.json` (ver punto 1).
- Refactors pendientes ya conocidos y trackeados en `needs-backlog.md` que no forman parte
  del alcance del PR actual.
