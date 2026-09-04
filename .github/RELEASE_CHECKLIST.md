# Release Checklist

Pasos concretos para pasar de `develop` a una build real en producción. Basado en cómo se
ha hecho en este proyecto hasta ahora (ver `SUPABASE_MIGRATIONS.md` y
`.github/workflows/apk-build.yml`) — no hay automatización de extremo a extremo, varios
pasos son manuales y hay que hacerlos en orden.

## 0. Antes de empezar

- [ ] Confirmar qué commit/estado de `develop` se va a liberar.
- [ ] Revisar `.github/context/needs-backlog.md` por cualquier ítem `Open` marcado como
      bloqueante para este release.

## 1. Migraciones de Supabase (manual, sin automatización)

- [ ] Abrir `SUPABASE_MIGRATIONS.md` y revisar todas las secciones hasta la fecha.
- [ ] Confirmar, contra el proyecto real de Supabase (Dashboard → SQL Editor o
      `information_schema.columns`), que **cada** bloque SQL documentado ya se corrió.
      No asumir por el historial de git — el archivo documenta lo que hay que correr,
      no lo que ya se corrió.
- [ ] Si falta alguno, correrlo ahora, en orden, antes de continuar. Recordar que las
      migraciones son idempotentes (`IF NOT EXISTS` / equivalente) pero **no** reordenables
      a ciegas si una depende de datos migrados por la anterior.
- [ ] Si el ciclo agregó una migración nueva, verificar que quedó documentada con el mismo
      formato que las existentes (SQL + contexto de por qué) antes de seguir.

## 2. Checks en verde sobre `develop`

```bash
npm run typecheck && npm run test:ci && npm run lint
```

- [ ] Los tres comandos corren limpios (0 errores) sobre el estado actual de `develop`,
      no solo sobre la rama de feature que se mergeó última.
- [ ] El workflow `CI` de GitHub Actions está verde en el último commit de `develop`
      (incluyendo el check de `secrets-scan`, si ya está activo).

## 3. Llevar el cambio a producción

Dos caminos, según se pueda mergear a `main` en ese momento o no:

- [ ] **Camino normal:** crear un Pull Request de `develop` a `main`.
- [ ] **Camino alterno** (si por algún motivo no se puede mergear a `main` en ese momento):
      usar el disparo manual `workflow_dispatch` del workflow "Build APK (EAS)"
      (`.github/workflows/apk-build.yml`), apuntando a `develop`, con el perfil deseado
      (`preview` o `production` según corresponda — ver punto 4).

## 4. Mergear y disparar la build

- [ ] Mergear el PR de `develop` a `main`. Esto dispara automáticamente
      `.github/workflows/apk-build.yml` con perfil `production` (PRs a `main` mergeados
      disparan `production`; a cualquier otra rama, `preview` — ver `Resolve EAS profile`
      en el workflow).
- [ ] Si se usó el camino alterno (`workflow_dispatch`), confirmar que se seleccionó el
      perfil correcto antes de lanzar.

## 5. Verificar el resultado de la build

- [ ] Revisar la ejecución del workflow en GitHub Actions hasta que termine.
- [ ] Revisar el resultado en EAS (el job sube `eas-build.json` como artifact
      `eas-android-build-<rama>-<sha>` y escribe un resumen en el Step Summary del run).
- [ ] Confirmar que la build terminó en estado exitoso en EAS **antes** de descargarla o
      instalarla — no instalar una build que todavía está corriendo o que falló.

## 6. Probar en dispositivo real antes de cerrar el ciclo

No basta con que los tests automatizados pasen — antes de dar el release por cerrado, armar
una lista puntual (igual que se ha hecho en ciclos anteriores) con los cambios más
riesgosos de ESTE ciclo específico y probarlos a mano en el dispositivo real. Plantilla a
repetir en cada release:

```markdown
### Checklist de prueba en dispositivo — release <fecha/versión>

- [ ] <Feature o fix más riesgoso #1> — escenario concreto a probar
- [ ] <Feature o fix más riesgoso #2> — escenario concreto a probar
- [ ] <Cambio de sync/esquema, si aplica> — probar con datos reales, no solo datos nuevos
- [ ] <Flujo offline/reconexión, si el ciclo tocó sync> — probar con la tablet/dispositivo
      sin red y confirmar que se recupera al volver la conexión
- [ ] Regresión rápida de los flujos core (crear cliente, tomar medida, agendar turno)
      aunque no se hayan tocado en este ciclo — confirmar que nada se rompió por accidente
```

- [ ] Completar la lista con los riesgos reales de este ciclo (no copiar la de un release
      anterior sin revisar si sigue aplicando).
- [ ] Solo marcar el release como cerrado cuando todos los puntos de la lista pasaron en el
      dispositivo real.

## Notas

- No hay protección de rama configurada en GitHub que bloquee el merge a `main` si CI
  falla — este checklist es, hoy, el único gate real antes de producción. Tratarlo como
  obligatorio, no como sugerencia.
- Si algo de este checklist se vuelve automatizable (por ejemplo, verificar migraciones
  pendientes de Supabase), documentarlo en `needs-backlog.md` como ítem de proceso.
