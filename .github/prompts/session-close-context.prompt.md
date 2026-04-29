---
description: "Close work session updating persistent project context and next actions"
agent: "ContextKeeper"
argument-hint: "What was done in this session"
---

Cierra la sesión y deja el contexto actualizado para continuar luego sin perder hilo.

## Trabajo realizado en la sesión
${input}

## Instrucciones
1. Resume logros reales de la sesión.
2. Actualiza:
   - `.github/context/project-context.md`
   - `.github/context/needs-backlog.md`
   - `.github/context/decisions-log.md` (si hubo decisiones)
3. Define máximo 3 siguientes pasos accionables para la próxima sesión.
4. Marca bloqueos abiertos con prioridad.

## Formato de salida
- Resumen de sesión
- Archivos de contexto actualizados
- Próximos 3 pasos
- Bloqueos abiertos
