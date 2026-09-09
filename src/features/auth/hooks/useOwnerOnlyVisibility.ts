import { useIdentityStore } from "../../../shared/state/identityStore";

/**
 * Formula de visibilidad "solo para el dueño", ya usada inline en
 * `FeatureTabsNavigator` (tabs Clientes/Tallas) y `PricingStackNavigator`
 * (catálogo de precios vs. "Mis arreglos"): un operario en SU propio
 * dispositivo no ve el contenido; el dueño, o cualquiera usando el
 * dispositivo compartido del mostrador (que también tiene role="operario"
 * en su propio perfil, pero lo usa cualquiera), sí lo ve. Sin perfil
 * resuelto (bypass offline ya documentado en `isTabVisibleForRole`) se
 * retorna `true` para no ocultar nada.
 */
export function useOwnerOnlyVisibility(): boolean {
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isSharedDevice = useIdentityStore(
    (state) => state.ownProfile?.isSharedDevice ?? false,
  );

  if (!role) {
    return true;
  }

  return !(role === "operario" && !isSharedDevice);
}
