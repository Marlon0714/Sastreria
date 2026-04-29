---
description: "Create a new screen for the sastrería app with proper navigation typing, loading/error/empty states, and accessibility"
agent: "agent"
argument-hint: "Screen name and feature it belongs to (e.g., 'AlterationDetail screen for schedule feature')"
---

Crea una nueva screen para la app de sastrería.

## Screen Solicitada
${input}

## Pasos a Ejecutar

### 1. Explorar contexto
- Revisar el feature correspondiente en `src/features/`.
- Revisar `src/navigation/types.ts` para ver los params existentes.
- Revisar screens similares del proyecto como referencia de patrones.

### 2. Crear la screen
Ubicación: `src/features/<feature>/screens/<ScreenName>.tsx`

Estructura obligatoria:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, '<ScreenName>'>;

const <ScreenName>: React.FC<Props> = ({ navigation, route }) => {
  // 1. Obtener datos del hook del feature
  // 2. Manejar los 4 estados: isLoading, error, data vacío, data con contenido
  // 3. Solo orquestar: delegar lógica a hooks
};

export default <ScreenName>;
```

### 3. Registrar en navegación
- Agregar tipo de params en `src/navigation/types.ts`.
- Agregar screen al navigator correspondiente.

### 4. Checklist antes de finalizar
- [ ] Maneja estado loading con indicador visual.
- [ ] Maneja estado error con mensaje descriptivo.
- [ ] Maneja estado vacío con mensaje amigable.
- [ ] `accessibilityLabel` en elementos interactivos.
- [ ] Sin lógica de negocio en el componente.
- [ ] Props tipadas sin `any`.
- [ ] Sin imports no utilizados.
