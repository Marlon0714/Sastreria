---
description: "Execute full software cycle for a requirement through Orchestrator with context continuity"
agent: "Orchestrator"
argument-hint: "Requirement to implement (e.g., 'agregar historial de pagos por cliente')"
---

Ejecuta el ciclo completo para este requerimiento:

${input}

## Reglas
- Usa `ContextKeeper` al inicio para contextualizar y priorizar.
- Usa `Planner` para generar el plan y guardarlo en `.github/plans/`.
- Usa `Builder` para implementar según el plan.
- Usa `Tester` para cubrir hooks/screens nuevas o modificadas.
- Usa `Reviewer` para auditar antes de PR.
- Usa `ContextKeeper` al final para registrar resultados y decisiones.

## Entregables esperados
1. Ruta del plan generado en `.github/plans/`.
2. Lista de archivos modificados/creados.
3. Hallazgos del reviewer (si aplica).
4. Recomendación de siguiente paso (commit, fix adicional o PR).
