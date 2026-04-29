---
description: "Start the day with project context, priorities, and a concrete action plan using ContextKeeper"
agent: "ContextKeeper"
argument-hint: "Optional focus for today (e.g., 'cerrar pipeline APK')"
---

Realiza un standup técnico del proyecto usando contexto persistente.

## Foco opcional del día
${input}

## Objetivo
Quiero empezar la jornada con claridad de estado, prioridades y siguiente acción.

## Instrucciones
1. Lee y valida:
   - `.github/context/project-context.md`
   - `.github/context/needs-backlog.md`
   - `.github/context/decisions-log.md`
2. Confirma en el código si hubo cambios relevantes desde el último snapshot.
3. Devuélveme:
   - Top 3 prioridades de hoy (ordenadas por impacto/urgencia)
   - Riesgos activos
   - Una recomendación concreta para avanzar hoy
4. Actualiza contexto si detectas desalineaciones.

## Formato de salida
- Estado actual (resumen)
- Prioridades de hoy (1, 2, 3)
- Riesgos
- Acción inmediata sugerida
- Cambios aplicados al contexto (si hubo)
