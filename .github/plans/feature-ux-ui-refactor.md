# Plan de Mejora UX/UI y Ampliación de Dominio (N-044, N-045)

## Objetivo

- Mejorar la experiencia de usuario: títulos completos, textos legibles, flujo intuitivo, navegación amigable.
- Ampliar el dominio: sección de tallas para camisa, pantalón, saco, chaleco; cliente con hasta 3 teléfonos y cédula opcional.

---

## 1. Refactor UX/UI (N-044)

### Criterios de aceptación

- Todos los títulos y labels de campos deben ser explícitos, sin abreviaturas.
- Tamaño de fuente mínimo 16sp en labels y 18sp en títulos/secciones.
- Los detalles del cliente muestran claramente el tipo de dato (ej: "Teléfono 1", "Teléfono 2", "Notas", "Cédula").
- Reducción de texto redundante: priorizar iconos, placeholders y tooltips donde sea posible.
- Navegación directa: menos pasos para llegar a acciones frecuentes.
- Pruebas de usabilidad: feedback de al menos 2 usuarios reales antes de cerrar el ciclo.

### Tareas

1. Auditoría de pantallas y componentes para identificar abreviaturas y textos poco claros.
2. Refactor de labels y títulos en todos los forms y vistas de detalle.
3. Ajuste de tamaños de fuente y contraste en estilos globales/shared.
4. Mejorar layout y jerarquía visual en ClientDetailScreen y forms.
5. Reemplazar textos redundantes por iconos/contexto visual donde aplique.
6. Validar accesibilidad (contraste, tamaño, foco, navegación por teclado).
7. Pruebas de usabilidad y ajuste final.

---

## 2. Ampliación de Dominio: Tallas y Datos Cliente (N-045)

### Criterios de aceptación

- Sección de tallas para camisa, pantalón, saco, chaleco y chaleco.
- Cada prenda tiene sus propios campos de medidas (ver modelo propuesto del arquitecto).
- Cliente puede registrar hasta 3 teléfonos y una cédula (opcional).
- Forms y validaciones actualizados en UI y dominio.
- Migraciones de base de datos y tests cubren los nuevos campos.

### Tareas

1. Definir modelo de datos extendido para tallas y cliente (ver propuesta arquitecto).
2. Actualizar Zod schemas y types en domain/ de cada feature.
3. Crear/ajustar forms y screens para nuevos campos de tallas y cliente.
4. Implementar migraciones SQLite para nuevos campos/tablas.
5. Actualizar repositorios y hooks para soportar los nuevos datos.
6. Tests unitarios y de integración para flujos ampliados.
7. Validación de sincronización offline/online para los nuevos datos.

---

## 3. Integración y QA

- Validar que la experiencia sea consistente en Android/iOS.
- Pruebas de regresión en flows de cliente y tallas.
- Checklist de accesibilidad y usabilidad.
- Documentar cambios en contexto y backlog.
