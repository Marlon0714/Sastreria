---
description: "Use when creating React Native screens, components, navigation, styles, or Expo configuration. Covers UI patterns, navigation, and mobile-specific conventions for the sastrería app."
applyTo: "src/**/*.tsx"
---

# Instrucciones Mobile (React Native + Expo)

## Componentes
- Usar `StyleSheet.create()` siempre para estilos, nunca inline objects en render.
- Componentes funcionales con `React.FC<Props>` o tipado explícito de props.
- Props con tipos definidos en el mismo archivo o importados desde `domain/`.
- Evitar re-renders innecesarios: usar `React.memo` en listas y `useCallback` en handlers.

## Screens
- Una screen = un archivo en `features/<feature>/screens/`.
- Las screens reciben params de navegación tipados con `NativeStackScreenProps`.
- No lógica de negocio en screens: delegarla a hooks del feature.
- Siempre manejar estados: loading, error, empty y data.

```tsx
// Estructura mínima de una screen
const ClientListScreen: React.FC<NativeStackScreenProps<RootStackParamList, 'ClientList'>> = ({ navigation }) => {
  const { clients, isLoading, error } = useClientList();

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message={error.message} />;
  if (!clients.length) return <EmptyView message="No hay clientes registrados" />;

  return <FlatList data={clients} renderItem={...} />;
};
```

## Navegación
- Tipos de params de navegación en `src/navigation/types.ts`.
- Nunca usar `navigation.navigate('ScreenName' as any)`.
- Separar Stack Navigator por feature; combinar en un Root Navigator con Tab o Drawer.

## Formularios
- Siempre React Hook Form + Zod para validación.
- Schema Zod en `features/<feature>/domain/schemas.ts`.
- Mostrar errores inline debajo del campo, no alerts.

```tsx
const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  pecho: z.number().min(1).max(200),
});
```

## Listas y Performance
- Siempre `FlatList` o `SectionList`, nunca `ScrollView` con `.map()` para listas grandes.
- Proveer `keyExtractor` con el `id` del item.
- Usar `getItemLayout` cuando los items son de altura fija.

## Accesibilidad
- Todo componente interactivo con `accessibilityLabel` descriptivo.
- Botones con texto visible o `accessibilityLabel`.

## Offline UX
- Mostrar banner sutil cuando no hay conexión.
- Nunca bloquear al usuario para operar offline.
- Indicar visualmente registros pendientes de sync (ícono o badge).
