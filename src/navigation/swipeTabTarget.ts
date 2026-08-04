/**
 * Decide a qué índice de tab saltar dado un swipe horizontal, sin depender
 * de react-native-gesture-handler — se extrae aparte para poder probar la
 * lógica de "a qué tab ir" sin tener que simular un gesto nativo real.
 * Retorna `null` si el swipe no alcanza el umbral o ya está en el extremo.
 */
export function resolveSwipeTargetIndex(
  translationX: number,
  currentIndex: number,
  routesCount: number,
  threshold = 50,
): number | null {
  if (translationX <= -threshold && currentIndex < routesCount - 1) {
    return currentIndex + 1;
  }
  if (translationX >= threshold && currentIndex > 0) {
    return currentIndex - 1;
  }
  return null;
}
