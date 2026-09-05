---
name: smart-commit
description: Divide los cambios pendientes del working tree en commits separados por tema/concern, con mensajes en español explicando el "por qué". Úsalo cuando el usuario pida comitear cambios acumulados de varios temas distintos.
allowed-tools: Read, Grep, Glob, Bash
---

Agrupa y comitea los cambios pendientes de este repo (app de sastrería, React Native + Expo) siguiendo la convención **real** ya usada en el historial de este proyecto — no la genérica de "conventional commits + gitmoji + inglés" (esa se intentó documentar en su momento pero nunca se siguió en la práctica).

## Convención real de este proyecto (confirmada en el historial de commits)

- **Mensajes en español**, imperativo o descriptivo directo: `fix: ...`, `feat: ...`, `refactor: ...`, `docs: ...` — sin scope entre paréntesis, sin gitmoji.
- El asunto (primera línea) describe QUÉ cambió en términos que entienda el dueño del negocio (ej. `fix: no borrar el nombre al tocar el lápiz`), no en jerga técnica interna.
- El cuerpo del commit (si hace falta) explica el **por qué**, no repite el diff — especialmente si corrige un bug real de uso, cita el escenario concreto.
- **Un commit por tema/módulo**, nunca un commit gigante mezclando varios cambios sin relación. Si el trabajo tocó varios módulos por separado (ej. auth + agenda + clients en la misma tanda), van en commits separados aunque se hayan hecho en la misma sesión.

## Proceso

1. `git status --short` para ver todo lo pendiente (nunca `git add -A`/`git add .` a ciegas).
2. `git diff` (sin cachear) para entender qué cambió realmente en cada archivo, no asumir por el nombre del archivo.
3. Agrupar archivos por tema real (mismo feature, mismo bug, mismo refactor) — un archivo de test siempre va en el mismo commit que el archivo que testea.
4. Para cada grupo: `git add <archivos específicos>` (nunca `-A`), redactar el mensaje siguiendo la convención de arriba, `git commit -m "..."`.
5. Antes de comitear cualquier grupo, confirmar que `npm run typecheck && npm run test:ci && npm run lint` pasa en verde sobre el estado acumulado hasta ese punto (no comitear código que rompe la build, ni siquiera temporalmente).
6. Al terminar, `git log --oneline -<n>` para mostrar el resultado final y confirmar que quedó bien dividido.
7. **Nunca hacer push sin que el usuario lo pida explícitamente** — comitear y empujar son dos pasos distintos en este proyecto (push a `develop` no dispara build, push/merge a `main` sí).

## Ejemplos reales de mensajes de este proyecto (para calibrar el tono)

```
fix: la lista de clientes vuelve a la paginación al cambiar de pestaña
fix: el operario ya no ve la pestaña de Precios en su propio dispositivo
feat: avisa si ya hay un turno del mismo cliente para la misma fecha
refactor: dividir MeasurementRepositoryImpl.ts por prenda (N-053)
docs: actualizar needs-backlog.md con la segunda revisión del repo
```

## Cuándo NO usar esta skill

Si solo hay un cambio pequeño y de un solo tema, no hace falta invocar nada especial — comitea directo con un mensaje claro. Esta skill es para cuando hay varios temas mezclados y hace falta criterio para separarlos bien.
