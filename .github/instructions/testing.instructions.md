---
description: "Use when writing unit tests, integration tests, mocks, or test utilities. Covers Jest and Testing Library conventions for the sastrería app."
applyTo: "**/*.{test,spec}.{ts,tsx}"
---

# Instrucciones de Testing

## Stack de Testing
- **Unit tests**: Jest + `@testing-library/react-native`
- **Cobertura mínima**: 70% en branches, funciones y líneas
- **Ubicación**: `__tests__/` dentro del feature o `*.test.ts` junto al archivo

## Qué Testear Siempre
1. **Hooks de dominio**: todos los custom hooks con escenarios happy path + error + vacío.
2. **Repositorios**: mock de SQLite, verificar queries parametrizadas y resultados.
3. **Schemas Zod**: casos válidos e inválidos para cada campo.
4. **Screens críticas**: ClientForm, AlterationDetail, PriceList.

## Estructura de un Test

```ts
describe('useClientList', () => {
  it('retorna lista de clientes cuando hay datos', async () => {
    // Arrange
    const mockClients = [buildClient({ nombre: 'Ana Torres' })];
    mockClientRepository.findAll.mockResolvedValue(mockClients);

    // Act
    const { result } = renderHook(() => useClientList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].nombre).toBe('Ana Torres');
  });

  it('expone error cuando el repositorio falla', async () => {
    mockClientRepository.findAll.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useClientList());
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
```

## Mocks
- Mockear repositorios con `jest.fn()` en `__mocks__/`.
- Nunca conectar SQLite real en tests unitarios.
- Usar factories (`buildClient()`, `buildAlteration()`) para construir datos de prueba.

```ts
// Factory helper
export const buildClient = (overrides?: Partial<Client>): Client => ({
  id: 'test-uuid-1',
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '3001234567',
  syncStatus: 'synced',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
```

## Testing de Screens
- Usar `renderWithProviders()` wrapper que incluye navegación y providers de Zustand.
- Verificar estados: loading, error, vacío, con datos.
- Testear acciones del usuario con `userEvent` o `fireEvent`.

## Anti-patrones
- No testear implementación interna, solo comportamiento observable.
- No hacer asserts sobre estilos visuales.
- No duplicar lógica de producción en el test.
- No usar `setTimeout` manual; usar `waitFor` o `act`.
